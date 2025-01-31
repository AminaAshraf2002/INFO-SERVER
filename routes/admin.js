const express = require('express');
const router = express.Router();
const Business = require('../models/Business');
const auth = require('../middleware/auth');

// Admin middleware
const isAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
  next();
};

// Get all pending businesses
router.get('/pending-businesses', auth, isAdmin, async (req, res) => {
  try {
    const businesses = await Business.find({
      status: 'pending'
    }).populate('createdBy', 'name email');

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

// Approve or reject business
router.patch('/business/:id', auth, isAdmin, async (req, res) => {
  try {
    const { status, reviewNotes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const business = await Business.findByIdAndUpdate(
      req.params.id,
      {
        status,
        reviewNotes,
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

// Get approval statistics
router.get('/statistics', auth, isAdmin, async (req, res) => {
  try {
    const stats = await Business.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const formattedStats = {
      pending: 0,
      approved: 0,
      rejected: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
    });

    res.json({
      success: true,
      stats: formattedStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

module.exports = router;