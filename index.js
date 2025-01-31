const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const authRoutes = require('./routes/auth');
const businessRoutes = require('./routes/business');
const adminRoutes = require('./routes/admin');
const path = require('path');

// Update CORS configuration
app.use(cors({
    origin: [

        'https://zesty-stroopwafel-37d9b5.netlify.app' // Your Netlify URL
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

// Middleware
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;

// Basic test route
app.get('/', (req, res) => {
  res.send('EBNBIZNET API is running');
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));