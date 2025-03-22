const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const User = require("../models/User");
const { adWishList } = require("../controllers/wishlistcontroller");  
// @desc    Add a listing to wishlist
// @route   POST /api/wishlist/:listingId
// @access  Private (premium students only)
router.post("/adwishlist",protect, async (req, res, next) => {
  adWishList(req,res,next);
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