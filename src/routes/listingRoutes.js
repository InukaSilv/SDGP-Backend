const express = require("express");
const router = express.Router();
const Listing = require("../models/Listing");
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../config/multer");
const { uploadImage } = require("../config/azureStorage");
const {
  getAllListings,
  createListing,
  updateListing,
  deleteListing,
  addReview,
  updateListingImages,
  searchListings,
} = require("../controllers/listingcontroller");

// @desc    Get all listings
// @route   GET /api/listings
// @access  Public
router.get("/", getAllListings);

// @desc    Create a new listing
// @route   POST /api/listings
// @access  Private (landlords only)
router.post("/", protect, upload.array("images", 7), async (req, res, next) => {
  try {
    // Upload images to Azure Blob Storage
    const imageUrls = [];
    for (const file of req.files) {
      const url = await uploadImage(file);
      imageUrls.push(url);
    }

    // Add image URLs to req object
    req.imageUrls = imageUrls;

    // Pass control to the createListing controller
    createListing(req, res, next);
  } catch (err) {
    next(err);
  }
});

// @desc    Update a listing
// @route   PUT /api/listings/:id
// @access  Private (landlords only)
router.put("/:id", protect, updateListing);

// @desc    Delete a listing
// @route   DELETE /api/listings/:id
// @access  Private (landlords only)
router.delete("/:id", protect, deleteListing);

// @desc    Add a review to a listing
// @route   POST /api/listings/:id/reviews
// @access  Private
router.post("/:id/reviews", protect, addReview);

// @desc    Update listing images
// @route   PUT /api/listings/:id/images
// @access  Private (landlords only)
router.put("/:id/images", protect, upload.array("images", 7), async (req, res, next) => {
  try {
    // Upload new images to Azure Blob Storage
    const newImageUrls = [];
    for (const file of req.files) {
      const url = await uploadImage(file);
      newImageUrls.push(url);
    }

    // Add new image URLs to req object
    req.imageUrls = newImageUrls;

    // Pass control to the updateListingImages controller
    updateListingImages(req, res, next);
  } catch (err) {
    next(err);
  }
});

// @desc    Search listings by location
// @route   GET /api/listings/search
// @access  Public
router.get("/search", searchListings);

module.exports = router;