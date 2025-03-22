const PremiumWishList = require("../models/PremiumWishList");
const User = require("../models/User");

const adWishList = async (req, res, next) => {
    try {
      const { userId, adId } = req.body;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const existingWish = await PremiumWishList.findOne({ user: userId, property: adId });
      if (existingWish) {
        await existingWish.deleteOne();
        return res.status(201).json({ message: "Removed from wishlist", status: false });
      }
      const newWish = new PremiumWishList({
        user: userId,
        property: adId,
        email: user.email,
      });
      await newWish.save();
      res.status(201).json({ message: "Added to wishlist successfully", status: true });
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      res.status(500).json({ message: "Server error" });
    }
  };

  module.exports = {
    adWishList,
  };