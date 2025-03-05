const Listing = require("../models/Listing");

// @desc    Get all listings
// @route   GET /api/listings
// @access  Public
const getAllListings = async (req, res, next) => {
  try {
    const listings = await Listing.find().populate("landlord", "firstName lastName email");
    res.json(listings);
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new listing
// @route   POST /api/listings
// @access  Private (landlords only)
const createListing = async (req, res, next) => {
  const { title, description, amenities, maxResidents } = req.body;

  if (!title || !description || !maxResidents || !req.files) {
    return res.status(400).json({ message: "Please fill all required fields and upload images" });
  }

  try {
    // Upload images to Azure Blob Storage (handled in the route)
    const imageUrls = req.imageUrls; // Assume image URLs are added to req object by the route

    // Create new listing
    const newListing = new Listing({
      landlord: req.user._id,
      title,
      description,
      images: imageUrls,
      amenities: amenities || [],
      maxResidents,
    });

    const savedListing = await newListing.save();
    res.status(201).json(savedListing);
  } catch (err) {
    next(err);
  }
};

// @desc    Update a listing
// @route   PUT /api/listings/:id
// @access  Private (landlords only)
const updateListing = async (req, res, next) => {
  const { title, description, amenities, maxResidents, currentResidents } = req.body;

  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check if the logged-in user is the landlord
    if (listing.landlord.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Update listing fields
    listing.title = title || listing.title;
    listing.description = description || listing.description;
    listing.amenities = amenities || listing.amenities;
    listing.maxResidents = maxResidents || listing.maxResidents;
    listing.currentResidents = currentResidents || listing.currentResidents;

    const updatedListing = await listing.save();
    res.json(updatedListing);
  } catch (err) {
    next(err);
  }
};

// @desc    Add a review to a listing
// @route   POST /api/listings/:id/reviews
// @access  Private
const addReview = async (req, res, next) => {
  const { rating, comment } = req.body;

  if (!rating || !comment) {
    return res.status(400).json({ message: "Please fill all required fields" });
  }

  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Add the new review
    const newReview = {
      user: req.user._id,
      rating,
      comment,
    };

    listing.reviews.push(newReview);
    await listing.save();

    res.status(201).json({ message: "Review added successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllListings,
  createListing,
  updateListing,
  addReview,
};