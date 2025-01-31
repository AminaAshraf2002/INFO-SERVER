// models/Business.js
const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  businessName: {
    type: String,
    required: true
  },
  contactName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  industry: {
    type: String,
    required: true
  },
  membershipCategory: {
    type: String,
    enum: ['Prime A', 'Prime B', 'Prime C'],
    required: true
  },
  description: String,
  websiteUrl: String,
  socialMediaLinks: {
    facebook: String,
    linkedin: String,
    twitter: String
  },
  images: [String],
  videos: [String],
  status: {
    type: String,
    enum: ['pending', 'review', 'approved', 'rejected'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  reviewNotes: String,
  approvedDate: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Business', businessSchema);