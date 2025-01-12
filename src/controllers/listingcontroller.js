const Listing = require('../models/Listing');

// @desc    Get all listings
// @route   GET /api/listings
// @access  Public
const getAllListings = async (req, res, next) => {
    try {
        const listings = await Listing.find().populate('user', 'name email');
        res.json(listings);
    } catch (err) {
        next(err);
    }
};

// @desc    Create a new listing
// @route   POST /api/listings
// @access  Private (landlords only)
const createListing = async (req, res, next) => {
    const { title, description, price, location } = req.body;

    if (!title || !description || !price || !location) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const listing = await Listing.create({
            user: req.user._id,
            title,
            description,
            price,
            location,
        });

        res.status(201).json(listing);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAllListings,
    createListing,
};
