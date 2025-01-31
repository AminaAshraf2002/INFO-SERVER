const express = require('express');
const router = express.Router();
const multer = require('multer');
const Business = require('../models/Business');
const auth = require('../middleware/auth');
const path = require('path');

// Configure file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type'), false);
    }
};

// Initialize multer upload
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

// PUBLIC ROUTES (No Auth Required)
// Get categories
router.get('/categories', async (req, res) => {
    try {
        const categories = await Business.distinct('industry', { status: 'approved' });
        
        if (categories.length === 0) {
            const defaultCategories = [
                { name: 'Technology', count: 0 },
                { name: 'Retail', count: 0 },
                { name: 'Manufacturing', count: 0 },
                { name: 'Healthcare', count: 0 },
                { name: 'Education', count: 0 },
                { name: 'Food & Beverage', count: 0 },
                { name: 'Professional Services', count: 0 },
                { name: 'Construction', count: 0 }
            ];
            return res.json({
                success: true,
                categories: defaultCategories
            });
        }

        const categoryData = await Promise.all(categories.map(async (category) => {
            const count = await Business.countDocuments({
                industry: category,
                status: 'approved'
            });
            return { name: category, count };
        }));

        res.json({
            success: true,
            categories: categoryData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching categories',
            error: error.message
        });
    }
});

// Get approved businesses
router.get('/approved', async (req, res) => {
    try {
        const { industry, membershipCategory, searchQuery } = req.query;
        const filter = { status: 'approved' };

        if (industry && industry !== 'all') {
            filter.industry = industry;
        }
        if (membershipCategory && membershipCategory !== 'all') {
            filter.membershipCategory = membershipCategory;
        }
        if (searchQuery) {
            filter.$or = [
                { businessName: { $regex: searchQuery, $options: 'i' } },
                { description: { $regex: searchQuery, $options: 'i' } }
            ];
        }

        const businesses = await Business.find(filter).sort({ createdAt: -1 });
        res.json({
            success: true,
            count: businesses.length,
            businesses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching businesses',
            error: error.message
        });
    }
});

// Get all businesses (testing)
router.get('/all', async (req, res) => {
    try {
        const businesses = await Business.find({});
        res.json({
            success: true,
            count: businesses.length,
            businesses
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// AUTHENTICATED ROUTES
// Create business
router.post('/create', auth, upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'videos', maxCount: 2 }
]), async (req, res) => {
    try {
        const imageFiles = req.files['images'] ? 
            req.files['images'].map(file => file.path) : [];
        const videoFiles = req.files['videos'] ? 
            req.files['videos'].map(file => file.path) : [];

        const business = new Business({
            businessName: req.body.businessName,
            contactName: req.body.contactName,
            email: req.body.email,
            phone: req.body.phone,
            industry: req.body.industry,
            membershipCategory: req.body.membershipCategory,
            description: req.body.description,
            websiteUrl: req.body.websiteUrl,
            socialMediaLinks: JSON.parse(req.body.socialMediaLinks || '{}'),
            media: {
                images: imageFiles,
                videos: videoFiles
            },
            createdBy: req.user.id,
            status: 'pending'
        });

        await business.save();
        res.status(201).json({
            success: true,
            message: 'Business listing created successfully',
            business
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating business listing',
            error: error.message
        });
    }
});

// Get user's businesses
router.get('/my-listings', auth, async (req, res) => {
    try {
        const businesses = await Business.find({ createdBy: req.user.id })
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            businesses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching your businesses',
            error: error.message
        });
    }
});

// ADMIN ROUTES
// Get pending businesses
router.get('/pending', auth, async (req, res) => {
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const businesses = await Business.find({ status: 'pending' })
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            count: businesses.length,
            businesses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching pending businesses',
            error: error.message
        });
    }
});

// Update business status
router.patch('/:id/status', auth, async (req, res) => {
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const { status } = req.body;
        const business = await Business.findByIdAndUpdate(
            req.params.id,
            { 
                status,
                approvedDate: status === 'approved' ? Date.now() : null
            },
            { new: true }
        );

        if (!business) {
            return res.status(404).json({
                success: false,
                message: 'Business not found'
            });
        }

        res.json({
            success: true,
            message: `Business ${status} successfully`,
            business
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating business status',
            error: error.message
        });
    }
});

// PARAMETER ROUTES (Should be last)
// Get single business
router.get('/:id', async (req, res) => {
    try {
        const business = await Business.findById(req.params.id);
        if (!business) {
            return res.status(404).json({
                success: false,
                message: 'Business not found'
            });
        }
        res.json({
            success: true,
            business
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching business details',
            error: error.message
        });
    }
});

// Delete business
router.delete('/:id', auth, async (req, res) => {
    try {
        const business = await Business.findOne({
            _id: req.params.id,
            createdBy: req.user.id
        });

        if (!business) {
            return res.status(404).json({
                success: false,
                message: 'Business not found or not authorized'
            });
        }

        await business.deleteOne();
        res.json({
            success: true,
            message: 'Business deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting business',
            error: error.message
        });
    }
});

module.exports = router;