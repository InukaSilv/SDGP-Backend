const mongoose = require("mongoose");
const { type } = require("os");

const ToReviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  firstName:{
    type:String,
    required:true,
  },
  images: {
    type: [String], 
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },

});

module.exports = mongoose.model("ToReview", ToReviewSchema);