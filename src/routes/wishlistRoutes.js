const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const User = require("../models/User");
const { adWishList,getWishList,deleteWishList } = require("../controllers/wishlistcontroller");  
// @desc    Add or remove listing to wishlist
// @route   POST /api/wishlist/:listingId
// @access  Private (premium students only)
router.post("/adwishlist",protect, async (req, res, next) => {
  adWishList(req,res,next);
});

router.get("/getWishList",async(req,res,next)=>{
  getWishList(req,res,next);
})

router.delete("/deletewishlist",async(req,res,next)=>{
  deleteWishList(req,res,next);
})



module.exports = router;