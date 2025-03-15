const { deleteImage } = require("../config/azureStorage");
const Listing = require("../models/Listing");
const EligibleUser = require("../models/EligibleUser");
const Review = require("../models/Reviews")
const User = require("../models/User");
const {Server} = require("socket.io");
let io;
const initializeSocket = (server) =>{
  io = new Server(server,{
    cors:{
      origin:"http://localhost:5173",
      methods:["GET", "POST","PUT"],
    }
  })
console.log("Socket initialized")
  io.on("connection", (socket) =>{
    console.log("client connected: ", socket.id)
  })
}

// @desc    Get all listings
// @route   GET /api/listings
// @access  Public
const getAllListings = async (req, res, next) => {
  try {
    let listings;
    if (req.user && req.user.role === "landlord") {
      // If the user is a landlord, return only their listings
      listings = await Listing.find({ landlord: req.user._id }).populate(
        "landlord",
        "firstName lastName email"
      );
    } else {
      // If the user is a student or not logged in, return all listings
      listings = await Listing.find().populate("landlord", "firstName lastName email");
    }
    res.json(listings);
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new listing
// @route   POST /api/listings
// @access  Private (landlords only)
const createListing = async (req, res, next) => {
  const {
    title,
    description,
    housingType,
    roomType,
    facilities,
    residents, 
    contact,
    lat,
    lng,
    price,
    singleRoom,
    doubleRoom,
    address,
  } = req.body;

  // Validate required fields
  if (
    !title ||
    !description ||
    !housingType ||
    !roomType ||
    !facilities ||
    !residents ||
    !contact ||
    !lat || !lng || 
    !price || !address
  ) {
    return res.status(400).json({ message: "Please fill all required fields and upload images" });
  }

  try {
    // Upload images to Azure Blob Storage (handled in the route)
    const imageUrls = req.imageUrls;

    // Create new listing
    const newListing = new Listing({
      landlord: req.user._id,
      title,
      description,
      housingType,
      roomTypes: {
        singleRoom: parseInt(singleRoom, 10),
        doubleRoom: parseInt(doubleRoom, 10),
      },
      facilities: JSON.parse(facilities),
      residents: parseInt(residents, 10), // Maximum number of slots
      currentResidents: 0, // Initialize to 0
      contact,
      price: parseFloat(price),
      address,
      location: {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)], 
      },
      images: req.imageUrls, 
    });

    const savedListing = await newListing.save();

    // Add the listing ID to the landlord's ads array
    await User.findByIdAndUpdate(req.user._id, {
      $push: { ads: savedListing._id },
    });

    res.status(201).json(savedListing);
  } catch (err) {
    next(err);
    console.log(err);
    console.log("Request body error", req.body);
  }
};

// retreive all the listing of a particular landlord 
const searchPersonalListing = async(req,res) => {
  try{
    const personalListing = await Listing.find({landlord:req.user._id});
    if(personalListing.length === 0){
      return res.status(404).json({message:"No listing found for this landlord"});
    }
    return res.status(200).json(personalListing);
  }catch (err){
console.error(err);
  }
}

// chnaging the slots in myAds
const addslots = async(req,res) => {
try{
  const {operation , adId} = req.body;
  const property = await Listing.findById(adId);
  if(!property){
    return res.status(404).json({message:"Listnig not found"});
  }
  if(operation === "add"){
    property.residents += 1;
  }else if(operation === "minus" && property.residents > 0){
    property.residents -=1
  }else{
    return res.status(400).json({message:"Invalid operation"});
  }
  await property.save();
  io.emit("slotsUpdated", {adId, residents:property.residents});
}catch(err){
  console.error(err)
}
}

// retreiveing property based on location
const getListing = async(req,res) =>{
  try{
    let {lat, lng, radius} = req.query;
    if(!lat || !lng || !radius){
      return res.status(400).json({error:"lng or lat not provided properly"});
    }
    newlat = parseFloat(lat);
    newlng = parseFloat(lng);
    newradius = parseFloat(radius);

    console.log("came to get the properties")
    console.log(lat);
    console.log(lng);
    console.log(radius);

   const ads = await Listing.find({
  location: {
    $geoWithin: {
      $centerSphere: [[lng, lat], radius/ 6378.1], 
    },
  },
});
res.status(200).json(ads);
  }catch(error){
    console.error("Error fetching ads: ",error);
    res.status(500).json({error:"Server Error"});
  }
}

// landlords can add students to make it possible to write reveiws
const addEligibleUser = async (req, res) => {
  try {
    const { adId, email } = req.body;
    const found = await User.findOne({ email:email });

    if (!found) {
      return res.status(404).json({ error: "User not found" });
    }
    if (found.role === "Landlord") {
      return res.status(400).json({ error: "Landlords cannot be eligible users" });
    }
    const check = await EligibleUser.findOne({ property: adId, userId: found._id });

    if (check) {
      return res.status(400).json({ error: "Student already added" });
    }
    const record = new EligibleUser({
      property: adId,
      userId: found._id,
    });
    await record.save();
    console.log("Saved successfully");
    return res.status(201).json({ message: "Eligible user added successfully" });
  } catch (error) {
    console.error("Error adding eligible user: ", error);
    return res.status(500).json({ error: "Server Error" });
  }
};

// retreive the properties of the students who are eligible to reveiw
const checkRevieweElig = async (req, res, next) => {
  try {
    const eligibleRecords = await EligibleUser.find({ userId: req.user._id });
    if (eligibleRecords.length === 0) {
      return res.status(404).json({ error: "No eligible reviews found" });
    }
    const propertyIds = eligibleRecords.map((record) => record.property);
    const propertyDetails = await Listing.find({ _id: propertyIds });
    if (propertyDetails.length === 0) {
      return res.status(404).json({ error: "No property details found" });
    }
    console.log(propertyDetails);
    res.status(200).json({ properties: propertyDetails });
  } catch (error) {
    console.error("Error checking review eligibility: ", error);
    res.status(500).json({ error: "Server Error" });
  }
};



// @desc    Update a listing
// @route   PUT /api/listings/:id
// @access  Private (landlords only)
// const updateListing = async (req, res, next) => {
//   try {
//     const {
//       title,
//       description,
//       facilities,
//       contact,
//       price,
//       singleRoom,
//       doubleRoom,
//       removeImages = [],
//       imageUrls = [],
//       residents, // Maximum number of slots
//       currentResidents, // Number of students currently living there
//     } = req.body;

//     const property = await Listing.findOne({ _id: req.body.propertyId });

//     if (!property) {
//       return res.status(404).json({ message: "Listing not found" });
//     }

//     // Validate currentResidents does not exceed residents
//     if (currentResidents && currentResidents > residents) {
//       return res.status(400).json({ message: "Current residents cannot exceed maximum residents" });
//     }

//     // Update listing fields
//     property.title = title || property.title;
//     property.description = description || property.description;
//     property.facilities = facilities || property.facilities;
//     property.contact = contact || property.contact;
//     property.price = price || property.price;
//     property.roomTypes.singleRoom = singleRoom || property.roomTypes.singleRoom;
//     property.roomTypes.doubleRoom = doubleRoom || property.roomTypes.doubleRoom;
//     property.residents = residents || property.residents;
//     property.currentResidents = currentResidents || property.currentResidents;

//     // Handle image updates
//     if (removeImages.length > 0) {
//       property.images = property.images.filter((img) => !removeImages.includes(img));
//     }

//     if (req.imageUrls && req.imageUrls.length > 0) {
//       property.images = [...property.images, ...req.imageUrls];
//     }

//     await property.save();

//     // Notify wishlisted users if there's an opening
//     if (currentResidents < residents) {
//       await notifyWishlistedUsers(property._id);
//     }

//     res.status(200).json({ message: "Listing updated successfully", property });
//   } catch (error) {
//     console.log(error);
//     next(error);
//   }
// };

// @desc    Search listings by location
// @route   GET /api/listings/search
// @access  Public
const searchListings = async (req, res, next) => {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ message: "Please provide latitude and longitude" });
  }

  try {
    const listings = await Listing.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: 5000, 
        },
      },
    }).populate("landlord", "firstName lastName email");

    res.json(listings);
  } catch (err) {
    next(err);
  }
};

const updateListing = async (req, res, next) =>{
  try{
  const{
    title,
    description,
    facilities,
    contact,
    price,
    singleRoom,
    doubleRoom,
    removeImages=[],
    imageUrls=[],
  } = req.body;

  const property = await Listing.findOne({_id:req.body.propertyId});
  property.title = title;
  property.description = description;
  property.facilities = facilities;
  property.contact= contact;
  property.price = price;
  property.singleRoom = singleRoom;
  property.doubleRoom = doubleRoom;
if(removeImages.length>0){
  property.images = property.images.filter(img => !removeImages.includes(img));
}

if (req.imageUrls && req.imageUrls.length > 0) {
  property.images = [...property.images, ...req.imageUrls];
}
await property.save();
res.status(200).json({ message: "Listing updated successfully", property });
  }catch(error){
    console.log(error);
  }
}


// @desc    Delete a listing
// @route   DELETE /api/listings/:id
// @access  Private (landlords only)
const deleteListing = async (req, res, next) => {
  try{
    const listing = await Listing.findById(req.body.propertyId);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }
    for(const img of listing.images){
      await deleteImage(img);
    }

    for (const reviewId of listing.reviews) {
      await Review.findByIdAndDelete(reviewId);
    }
    await EligibleUser.deleteMany({ property: listing._id });
    await listing.deleteOne();
    res.status(200).json({ message: "Listing deleted successfully" });
  }catch(err){
    next(err);
  }
  };

  const addReview = async(req,res,next) =>{
    try{
      const { rating, review, recommend, propertyId } = req.body;
      const newReview = new Review({
        rating,
        review,
        recommend,
        property: propertyId, 
        user: req.user.id, 
      });
      await newReview.save();

      const property = await Listing.findById(propertyId);
      const starsCount = new Map(property.starsCount);
      console.log(starsCount);
      starsCount.set(String(rating),(starsCount.get(String(rating))||0)+1);
      const totalRatingCount = (property.totalRatingCount || 0)+rating;
      const totalRevews = property.reviews.length + 1;
      const averageRating = totalRatingCount/totalRevews;

      await Listing.findByIdAndUpdate(propertyId, {
        $push: { reviews: newReview._id},
        $set:{
          totalRatingCount,
          averageRating,
          starsCount:Object.fromEntries(starsCount),
        }
      });
      res.status(200).json({message:"Review added successfully"});
    }catch(err){
      next(err);
    }
  }
    // if (!listing) {
    //   return res.status(404).json({ message: "Listing not found" });
    // }

    // // Check if the logged-in user is the landlord
    // if (listing.landlord.toString() !== req.user._id.toString()) {
    //   return res.status(401).json({ message: "Not authorized" });
    // }

    // // Delete the listing
    // await listing.remove();

    // res.json({ message: "Listing deleted successfully" });



// @desc    Update listing images
// @route   PUT /api/listings/:id/images
// @access  Private (landlords only)
const updateListingImages = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check if the logged-in user is the landlord
    if (listing.landlord.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Upload new images to Azure Blob Storage (handled in the route)
    const newImageUrls = req.imageUrls; // Assume image URLs are added to req object by the route

    // Add new images to the listing
    listing.images = [...listing.images, ...newImageUrls];
    await listing.save();

    res.json({ message: "Listing images updated successfully", listing });
  } catch (err) {
    next(err);
  }
};


const getOwner = async (req, res, next) => {
  try {
    const { propertyId } = req.query;
    const prop = await Listing.findOne({ _id: propertyId });
    const landlord = await User.findOne({ _id: prop.landlord });
    res.json(landlord);
  } catch (error) {
    console.error("Error fetching owner details:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

const getReviews = async (req, res, next) => {
  try {
    const { reviews, id } = req.query;
    const property = await Listing.findById(id);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    const reviewIds = reviews.split(",");
    let sendreviews = [];
    for (const reviewId of reviewIds) {
      const review = await Review.findById(reviewId);
      if (review) {
        const user = await User.findById(review.user);
        if (user) {
          const record = {
            rating: review.rating,
            review: review.review,
            createdAt: review.createdAt,
            firstName: user.firstName,
            lastName: user.lastName
          };
          sendreviews.push(record);
        }
      }
    }

    // Find similar properties based on housing type and price range
    const similarProperties = await Listing.find({
      housingType: property.housingType,
      price: { $gte: property.price - 50000, $lte: property.price + 50000 }, // Find properties with price range ±500
      _id: { $ne: property._id }, // Exclude the current property
    })
    .limit(2); // Get only 2 similar properties

    console.log(similarProperties)
    // Send the response with reviews and similar properties
    res.status(200).json({
      reviews: sendreviews,
      similarProperties: similarProperties
    });
  } catch (error) {
    console.error("Error fetching reviews and similar properties:", error);
    res.status(500).json({ message: "Server Error" });
  }
};




module.exports = {
  getAllListings,
  createListing,
  updateListing,
  searchListings,
  deleteListing,
  updateListingImages,
  addReview,
  searchPersonalListing,
  addslots,
  initializeSocket,
  getListing,
 addEligibleUser,
 checkRevieweElig,
 getOwner,
 getReviews,
};