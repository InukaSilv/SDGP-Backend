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

  const getWishList = async (req, res, next) => {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }
    try {
      const wishlist = await PremiumWishList.find({ user: id });
      if (wishlist.length === 0) {
        return res.status(200).json([]);
      }
      const propertyIds = wishlist.map((item) => item.property);
      const listings = await Listing.find({ _id: { $in: propertyIds } });
      res.status(200).json(listings);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      res.status(500).json({ error: "Server error" });
    }
  };

  module.exports = {
    adWishList,
    getWishList,
  };