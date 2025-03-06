const Listing = require("../models/Listing");
const User = require("../models/User");

// @desc    Get all listings
// @route   GET /api/listings
// @access  Public
const getAllListings = async (req, res, next) => {
  try {
    let listings;
    if (req.user && req.user.role === "landlord") {
      // If the user is a landlord, return only their listings
      listings = await Listing.find({ landlord: req.user._id }).populate(
        "landlord",
        "firstName lastName email"
      );
    } else {
      // If the user is a student or not logged in, return all listings
      listings = await Listing.find().populate("landlord", "firstName lastName email");
    }
    res.json(listings);
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new listing
// @route   POST /api/listings
// @access  Private (landlords only)
const createListing = async (req, res, next) => {
  const {
    title,
    description,
    housingType,
    roomTypes,
    facilities,
    maxResidents,
    contactNumber,
    location,
  } = req.body;

  // Validate required fields
  if (
    !title ||
    !description ||
    !housingType ||
    !roomTypes ||
    !facilities ||
    !maxResidents ||
    !contactNumber ||
    !location?.coordinates ||
    !req.files
  ) {
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
      housingType,
      roomTypes,
      facilities,
      maxResidents,
      contactNumber,
      location: {
        type: "Point",
        coordinates: [location.coordinates.longitude, location.coordinates.latitude], // [longitude, latitude]
      },
      images: imageUrls,
    });

    const savedListing = await newListing.save();

    // Add the listing ID to the landlord's ads array
    await User.findByIdAndUpdate(req.user._id, {
      $push: { ads: savedListing._id },
    });

    res.status(201).json(savedListing);
  } catch (err) {
    next(err);
  }
};


// @desc    Update a listing
// @route   PUT /api/listings/:id
// @access  Private (landlords only)
const updateListing = async (req, res, next) => {
  const {
    title,
    description,
    housingType,
    roomTypes,
    facilities,
    maxResidents,
    contactNumber,
    location,
  } = req.body;

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
    listing.housingType = housingType || listing.housingType;
    listing.roomTypes = roomTypes || listing.roomTypes;
    listing.facilities = facilities || listing.facilities;
    listing.maxResidents = maxResidents || listing.maxResidents;
    listing.contactNumber = contactNumber || listing.contactNumber;

    // Update location (coordinates)
    if (location?.coordinates) {
      listing.location.coordinates = [
        location.coordinates.longitude || listing.location.coordinates[0],
        location.coordinates.latitude || listing.location.coordinates[1],
      ];
    }

    const updatedListing = await listing.save();
    res.json(updatedListing);
  } catch (err) {
    next(err);
  }
};

// @desc    Search listings by location
// @route   GET /api/listings/search
// @access  Public
const searchListings = async (req, res, next) => {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ message: "Please provide latitude and longitude" });
  }

  try {
    const listings = await Listing.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: 5000, // 5km radius
        },
      },
    }).populate("landlord", "firstName lastName email");

    res.json(listings);
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

// @desc    Delete a listing
// @route   DELETE /api/listings/:id
// @access  Private (landlords only)
const deleteListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check if the logged-in user is the landlord
    if (listing.landlord.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Remove the listing ID from the landlord's ads array
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { ads: listing._id },
    });

    // Delete the listing
    await listing.remove();

    res.json({ message: "Listing deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// @desc    Update listing images
// @route   PUT /api/listings/:id/images
// @access  Private (landlords only)
const updateListingImages = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check if the logged-in user is the landlord
    if (listing.landlord.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Upload new images to Azure Blob Storage (handled in the route)
    const newImageUrls = req.imageUrls; // Assume image URLs are added to req object by the route

    // Add new images to the listing
    listing.images = [...listing.images, ...newImageUrls];
    await listing.save();

    res.json({ message: "Listing images updated successfully", listing });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllListings,
  createListing,
  updateListing,
  searchListings,
  deleteListing,
  updateListingImages,
  addReview,
};