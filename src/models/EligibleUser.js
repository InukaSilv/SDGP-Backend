const mongoose = require("mongoose");

const eligibleReviews = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Listing",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});


// Correct unique index on property and userId
eligibleReviews.index({ property: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("eligibleuser", eligibleReviews);
