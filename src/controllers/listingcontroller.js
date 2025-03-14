const { deleteImage } = require("../config/azureStorage");
const Listing = require("../models/Listing");
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
console.log(ads);
res.status(200).json(ads);
  }catch(error){
    console.error("Error fetching ads: ",error);
    res.status(500).json({error:"Server Error"});
  }
}




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

// @desc    Add a review to a listing
// @route   POST /api/listings/:id/reviews
// @access  Private
const addReview = async (req, res, next) => {
  const { rating, comment } = req.body;

  if (!rating || !comment) {
    return res.status(400).json({ message: "Please fill all required fields" });
  }

  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Add the new review
    const newReview = {
      user: req.user._id,
      rating,
      comment,
    };

    listing.reviews.push(newReview);
    await listing.save();

    res.status(201).json({ message: "Review added successfully" });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a listing
// @route   DELETE /api/listings/:id
// @access  Private (landlords only)
const deleteListing = async (req, res, next) => {
  try{
    console.log("came to delete");
    const listing = await Listing.findById(req.body.propertyId);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }
    for(const img of listing.images){
      await deleteImage(img);
    }
    await listing.deleteOne();
    res.status(200).json({ message: "Listing deleted successfully" });
  }catch(err){
    next(err);
  }


  };
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

// @desc    Filter and sort listings
// @route   GET /api/listings/filter
// @access  Public
const filterListings = async (req, res, next) => {
  try {
    const {
      minPrice = 0,
      maxPrice = Infinity,
      housingTypes = [],
      roomTypes = [],
      facilities = [],
      sortBy = "newest", // Default sorting: newest to oldest
    } = req.query;

    // Build the filter object
    const filter = {};

    // Price range filter
    filter.price = { $gte: parseFloat(minPrice), $lte: parseFloat(maxPrice) };

    // Housing type filter
    if (housingTypes.length > 0) {
      filter.housingType = { $in: housingTypes };
    }

    // Room type filter
    if (roomTypes.length > 0) {
      filter.$or = roomTypes.map((type) => ({
        [`roomTypes.${type.toLowerCase()}Room`]: { $gt: 0 },
      }));
    }

    // Facilities filter
    if (facilities.length > 0) {
      filter.facilities = { $all: facilities };
    }

    // Build the sort object
    let sort = {};
    switch (sortBy) {
      case "newest":
        sort = { createdAt: -1 }; // Newest to oldest
        break;
      case "oldest":
        sort = { createdAt: 1 }; // Oldest to newest
        break;
      case "priceLowest":
        sort = { price: 1 }; // Price lowest to highest
        break;
      case "priceHighest":
        sort = { price: -1 }; // Price highest to lowest
        break;
      default:
        sort = { createdAt: -1 }; // Default: newest to oldest
    }

    // Fetch filtered and sorted listings
    const listings = await Listing.find(filter)
      .sort(sort)
      .populate("landlord", "firstName lastName email");

    res.status(200).json(listings);
  } catch (err) {
    next(err);
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
  filterListings
};