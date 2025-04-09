const { deleteImage } = require("../config/azureStorage");
const Listing = require("../models/Listing");
const EligibleUser = require("../models/EligibleUser");
const Review = require("../models/Reviews")
const User = require("../models/User");
const PremiumWishList = require("../models/PremiumWishList");
const {Server} = require("socket.io");
const notifyWishlistedUsers = require("../utils/notifyWishlistedUsers");

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
      residents: parseInt(residents, 100), // Maximum number of slots
      currentResidents: parseInt(residents, 100), // Initialize to 0
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

    // increase the count of the ads to keep track
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $push: { ads: savedListing._id },
        $inc: { adCount: 1 } 
      },
      { new: true } 
    );

    res.status(201).json({savedListing,updatedUser});
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
const addslots = async (req, res) => {
  try {
    const { operation, adId } = req.body;
    const property = await Listing.findById(adId);
    if (!property) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (operation === "add" && property.currentResidents < property.residents) {
      property.currentResidents += 1;
    } else if (operation === "minus" && property.currentResidents > 0) {
      property.currentResidents -= 1;
    } else {
      return res.status(400).json({ message: "Invalid operation or no slots available" });
    }

    await property.save();

    // Notify wishlisted users if a slot becomes available
    if (operation === "minus" && property.currentResidents < property.residents) {
      await notifyWishlistedUsers(property._id);
    }

    // Emit socket event for real-time updates
    io.emit("slotsUpdated", { adId, residents: property.currentResidents });

    res.status(200).json({ message: "Slots updated successfully", property });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Retrieving property based on location and filters
const getListing = async (req, res) => {
  try {
    let {
      lat,
      lng,
      radius,
      priceRange,          
      selectedResidents,   
      selectedHousingType, 
      selectedRoomType,    
      selectedFacility,    
      selectedOption,      
    } = req.query;

    if (!lat || !lng || !radius) {
      return res.status(400).json({ error: "Location parameters not provided properly" });
    }

    const newlat = parseFloat(lat);
    const newlng = parseFloat(lng);
    const newradius = parseFloat(radius);

    let query = {
      location: {
        $geoWithin: {
          $centerSphere: [[newlng, newlat], newradius / 6378.1],
        },
      }
    };

    if (priceRange && priceRange.length === 2) {
      const [minPrice, maxPrice] = priceRange.map((price) => parseInt(price));
      query.price = { $gte: minPrice, $lte: maxPrice };
    }

    if (selectedResidents) {
      query.residents = { $gte: parseInt(selectedResidents) };
    }

    if (selectedHousingType && selectedHousingType.length > 0) {
      const housingTypesArray = Array.isArray(selectedHousingType)
        ? selectedHousingType
        : [selectedHousingType];
      query.housingType = { $in: housingTypesArray };
    }

    if (selectedRoomType && selectedRoomType.length > 0) {
      const roomTypesArray = Array.isArray(selectedRoomType) 
        ? selectedRoomType 
        : [selectedRoomType];
      const roomTypeConditions = roomTypesArray.map(type => {
        if (type === 'Single') {
          return { 'roomTypes.singleRoom': { $gt: 0 } };
        } else if (type === 'Double') {
          return { 'roomTypes.doubleRoom': { $gt: 0 } };
        }
        return null;
      }).filter(condition => condition !== null); 
      if (roomTypeConditions.length > 0) {
        query.$or = roomTypeConditions;
      }
    }

    if (selectedFacility && selectedFacility.length > 0) {
      const facilitiesArray = Array.isArray(selectedFacility) 
        ? selectedFacility 
        : [selectedFacility];
      query.facilities = { $all: facilitiesArray };
    }

    let sortOptions = {};
    if (selectedOption) {
      switch (selectedOption) {
        case 'Price: High to Low':
          sortOptions = { price: -1 };
          break;
        case 'Price: Low to High':
          sortOptions = { price: 1 };
          break; 
        case 'Date: Oldest on Top':
          sortOptions = { createdAt: -1 };
          break;
        case 'Date: Newest on Top':
          sortOptions = { createdAt: 1 };
          break;
          
      }
    }

    console.log("Query parameters:", {
      latitude: newlat,
      longitude: newlng,
      radius: newradius,
      filters: query,
      sort: sortOptions
    });
    
    const ads = await Listing
      .find(query)
      .sort({ boostStatus: -1, ...sortOptions })
      .populate('landlord', 'firstName lastName email phone profilePhoto'); 

      
    res.status(200).json(ads);

  } catch (error) {
    console.error("Error fetching ads: ", error);
    res.status(500).json({ error: "Server Error" });
  }
};

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

// edit and update a listing
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

  // add a review to a lisiting
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
  

// get owner details
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

// get reviews and similar properties
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

// uploading profile profilePhoto
const uploadDp = async (req, res, next) => {
  const user = await User.findById(req.body.user); 
  if (!user) {
    return res.status(404).send({ message: "User not found." });
  }

  user.profilePhoto = req.img;
  await user.save(); 
  res.status(200).send({ message: "Profile photo updated successfully.",user });
};



// Track a view 
// when a user clicks on a listing it takes the record
const trackView = async (req, res) => {
  console.log("came here to check time")
  try {
    const { listingId, duration } = req.body;
    console.log(listingId,duration)
    const listing = await Listing.findById(listingId);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    listing.views += 1;
    listing.viewTimestamps.push({ duration });
    await listing.save();

    res.status(200).json({ message: 'View tracked successfully' });
  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};


// Track a contact click
const trackContactClick = async (req, res) => {
  try {
    const { listingId } = req.body;
    const listing = await Listing.findById(listingId);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    listing.contactClicks += 1;
    listing.contactClickTimestamps.push({ timestamp: Date.now() });
    await listing.save();

    res.status(200).json({ message: 'Contact click tracked successfully' });
  } catch (error) {
    console.error('Error tracking contact click:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};


// changing boostad status
const boostAd = async (req,res,next) =>{
  const {adId} = req.body;
  console.log(adId);
  const listing = await Listing.findById(adId);
  console.log(listing);
  if(listing.boostStatus === true){
    listing.boostStatus = false;
  }else{
    listing.boostStatus = true;
  }
  await listing.save();
  res.status(200).json({message:"Ad boosted successfully"});
}


module.exports = {
  createListing,
  updateListing,
  deleteListing,
  addReview,
  searchPersonalListing,
  addslots,
  initializeSocket,
  getListing,
  addEligibleUser,
  checkRevieweElig,
  getOwner,
  getReviews,
  uploadDp,
  trackView,
  trackContactClick,
  boostAd,
};