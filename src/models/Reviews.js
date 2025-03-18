const mongoose = require("mongoose");
const { type } = require("os");

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  property:{
    type: mongoose.Schema.Types.ObjectId,
    ref:"Listing",
    required:true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  review: {
    type: String,
    required: true,
  },
  recommend:{
    type:String,
    enum: ['yes', 'no'],
    required:true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },

});

module.exports = mongoose.model("Reviews", reviewSchema);