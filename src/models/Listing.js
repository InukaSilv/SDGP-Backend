const mongoose = require("mongoose");
const { type } = require("os");
const listingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  address:{
    type:String,
    required:true,
  },
  location: {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true },
  },
  images: {
    type: [String], // Array of image URLs
  },
  price: {
    type: Number,
    required: true,
  },
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  housingType: {
    type: String,
    enum: ["Hostel", "House", "Apartment"],
    required: true,
  },
  roomTypes: {
    singleRoom: {
      type: Number,
      default: 0,
      min: 0,
    },
    doubleRoom: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  facilities: {
    type: [String], // Array of amenities
    default: [],
  },
  residents: {
    type: Number,
    required: true,
    min: 1,
  },
  currentResidents: {
    type: Number,
    default: 0,
    min: 0,
  },
  contact: {
    type: String,
    required: true,
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  totalRatingCount:{
    type:Number,
    default:0,
    min:0
  },
  views:{
    type:Number,
    default:0,
    min:0
  },
  starsCount: {
    type: Map,
    of: Number,
    default: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  },
  reviews: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Reviews",
          },
        ], // Array of review objects
}, { timestamps: true });

// Calculate average rating before saving
listingSchema.pre("save", function (next) {
  if (this.reviews.length > 0) {
    const totalRating = this.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    this.averageRating = (totalRating / this.reviews.length).toFixed(1);
  } else {
    this.averageRating = 0;
  }
  next();
});

listingSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Listing", listingSchema);
