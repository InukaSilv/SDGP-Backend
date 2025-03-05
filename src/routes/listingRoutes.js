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
  addReview,
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

// @desc    Add a review to a listing
// @route   POST /api/listings/:id/reviews
// @access  Private
router.post("/:id/reviews", protect, addReview);

module.exports = router;