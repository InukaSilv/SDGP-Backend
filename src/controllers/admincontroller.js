const Listing = require("../models/Listing");
const EligibleUser = require("../models/EligibleUser");
const Review = require("../models/Reviews")
const User = require("../models/User");
const toReview = require("../models/ToReview.js");
const { deleteImage } = require("../config/azureStorage");
const { createVerify } = require("crypto");


const getData = async (req, res, next) => {
    try{
            const userCount = await User.countDocuments();
            const studentCount = await User.countDocuments({role:"Student"});
            const LandlordCount = await User.countDocuments({role:"Landlord"});
            const adCount = await Listing.countDocuments();
            const llToReview = await toReview.countDocuments();
            res.status(200).json({ 
                totalUsers: userCount,
                studentUsers: studentCount,
                Landlords:LandlordCount,
                ads:adCount,
                toReview:llToReview,
});

    }catch(error){
        console.error("Error getting counts:", error);
        res.status(500).json({ message: "Error retrieving counts", error: error.message });
    }
}

const getUserData = async (req, res, next) => {
    try{
        const users = await User.find(); 
        console.log(users);
        res.status(200).json({ users });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Error retrieving users", error: error.message });
    }
};

const deleteUser = async (req, res, next) =>{
    const{id}= req.body;
    if (!id) {
        return res.status(400).json({ message: "User ID is required." });
    }
    const user = await User.findByIdAndDelete(id);
    res.status(200).json({ message: "User deleted successfully." });

}

const getAdsData = async (req,res,next) =>{
    try{
        const Ads = await Listing.find();
        res.status(200).json({Ads});
    }catch(error){
        console.error("Error fetching Ads:", error);
        res.status(500).json({ message: "Error retrieving Ads", error: error.message });
    }
}

const getVerifies = async (req,res,next) =>{
    try{
        const revs = await toReview.find();
        console.log(revs);
        res.status(200).json({revs});
    }catch(error){
        console.error("Error fetching verifies:", error);
        res.status(500).json({ message: "Error fetching verifies", error: error.message });
    }
}

const verify = async (req, res, next) => {
    try {
      const { id } = req.body;
      const rev = await toReview.findById(id);
      if (!rev) {
        return res.status(404).json({ message: "Review not found" });
      }
      const user = await User.findById(rev.user);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      user.IdVerificationStatus = "Verified";
      user.isIdVerified = true;
      user.IDimages.push(...rev.images);
      await user.save();
      await rev.deleteOne(); 
      res.status(200).json({ message: "Verified successfully" }); 
    } catch (error) {
      console.error("Error verifying user:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  };
  
const reject = async (req,res,next) =>{
    const {id} = req.body;
    try{
        const verify = await toReview.findById(id);
        if (!verify) {
            return res.status(404).json({ message: "Review not found" });
          }
        const user = await User.findById(verify.user)
        if (!user) {
            return res.status(404).json({ message: "User not found" });
          }

          user.IdVerificationStatus = "Rejected";
          await user.save();
         for(const img of verify.images){
               await deleteImage(img);
             }
        await verify.deleteOne();
        res.status(200).json({ message: "Rejected" }); 
    }catch(error) {
        console.error("Error verifying user:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
      }

}

module.exports = {
getData,
getUserData,
deleteUser,
getAdsData,
getVerifies,
verify,
reject,
};