const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const User = require("../models/User");

// @desc    Add a listing to wishlist
// @route   POST /api/wishlist/:listingId
// @access  Private (premium students only)
router.post("/:listingId", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the listing is already in the wishlist
    if (user.wishlist.includes(req.params.listingId)) {
      return res.status(400).json({ message: "Listing already in wishlist" });
    }

    // Add listing to wishlist
    user.wishlist.push(req.params.listingId);
    await user.save();

    res.status(200).json({ message: "Listing added to wishlist" });
  } catch (err) {
    next(err);
  }
});

// @desc    Remove a listing from wishlist
// @route   DELETE /api/wishlist/:listingId
// @access  Private (premium students only)
router.delete("/:listingId", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove listing from wishlist
    user.wishlist = user.wishlist.filter(
      (listingId) => listingId.toString() !== req.params.listingId
    );
    await user.save();

    res.status(200).json({ message: "Listing removed from wishlist" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;