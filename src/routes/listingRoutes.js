const express = require('express');
const router = express.Router();
const fs = require('fs');
const { protect } = require('../middleware/authMiddleware');
const Listing = require('../models/Listing');
const multer = require('multer');
const path = require('path');
const logger = require('../utils/logger'); // Utility to log events

// Multer setup for image uploads with restrictions
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // Limit file size to 2MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only images (JPEG, JPG, PNG) are allowed'));
        }
    },
});

// Create a new listing
router.post('/', protect, upload.array('images', 5), async (req, res) => {
    const { title, description, price, location, features, contactInfo } = req.body;

    if (!title || !description || !price || !location) {
        return res.status(400).json({ message: 'All required fields must be filled' });
    }

    try {
        const newListing = new Listing({
            title,
            description,
            price,
            location,
            features,
            contactInfo,
            images: req.files.map(file => file.path),
            user: req.user.id,
        });

        const savedListing = await newListing.save();
        res.status(201).json(savedListing);
    } catch (error) {
        logger.error('Error creating listing', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all listings
router.get('/', async (req, res) => {
    try {
        const listings = await Listing.find().populate('user', 'name'); // Only populate the name field for security
        res.status(200).json(listings);
    } catch (error) {
        logger.error('Error fetching listings', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get a single listing by ID
router.get('/:id', async (req, res) => {
    try {
        const listing = await Listing.findById(req.params.id).populate('user', 'name'); // Only populate the name field for security
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }
        res.status(200).json(listing);
    } catch (error) {
        logger.error('Error fetching listing by ID', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a listing by ID
router.delete('/:id', protect, async (req, res) => {
    try {
        const listing = await Listing.findById(req.params.id);
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }

        if (listing.user.toString() !== req.user.id) {
            logger.warn(`Unauthorized access attempt by user ${req.user.id}`);
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Remove associated images from the uploads directory
        if (listing.images && listing.images.length > 0) {
            listing.images.forEach(imagePath => {
                fs.unlink(imagePath, err => {
                    if (err) {
                        logger.error(`Failed to delete image: ${imagePath}`, err);
                    } else {
                        logger.info(`Deleted image: ${imagePath}`);
                    }
                });
            });
        }

        await listing.remove();
        res.status(200).json({ message: 'Listing deleted' });
    } catch (error) {
        logger.error('Error deleting listing', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
