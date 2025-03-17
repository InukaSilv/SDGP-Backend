const express = require("express");
const { createListing, searchPersonalListing, addslots, getListing, updateListing,deleteListing,addEligibleUser,checkRevieweElig, addReview,getOwner,getReviews,uploadDp } = require("../controllers/listingcontroller");
const multer = require("multer");
const { uploadImage,deleteImage } = require("../config/azureStorage");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits:{
        fileSize:5*1024*1024,
        files:10
    }
})

// add listing
router.post("/listing-all",protect,upload.array("images",6), async(req,res ,next)=>{
    try{
        if(!req.files || req.files.length === 0){
            return res.status(400).send({message:"No file uploaded."});
        }
        const imageUrls = [];
        for(const file of req.files){
            const url = await uploadImage(file);
            imageUrls.push(url);
        }
        req.imageUrls = imageUrls;
        createListing(req, res, next);
    }catch(err){
        next(err);
    }
});

//get lisitng under 1 propfile to view all at once
router.get("/profile-listing",protect, async (req, res,next)=>{
searchPersonalListing(req, res);
})

// add slots displayed
router.put("/add-slot", protect, async(req,res,next)=>{
addslots(req,res);
})

router.get("/get-listing", async(req, res, next)=>{
    getListing(req,res);
})

router.put("/update-listing", protect, upload.array("images", 6), async (req, res, next) => {
    try {
        let { removeImages = [] } = req.body;
        if (typeof removeImages === "string") {
            removeImages = [removeImages];
        }

        if (removeImages.length === 0 && (!req.files || req.files.length === 0)) {
            return updateListing(req, res);
        }
        if (removeImages.length > 0) {
            for (const url of removeImages) {
                await deleteImage(url);
            }
        }
        const imageUrls = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const url = await uploadImage(file);
                imageUrls.push(url);
            }
        }
        req.imageUrls = imageUrls;

        updateListing(req, res);
        
    } catch (err) {
        next(err);
    }
});

// delete a post
router.delete("/delete-post", protect, async(req,res,next)=>{
deleteListing(req,res);
})

// add student to the property so that the student can add reviews
router.post("/add-student-property" , protect , async(req,res,next) =>{
    addEligibleUser(req,res);
})

// get the properties which a student can reveiew
router.get("/check-reviews",protect,async(req,res,next) => {
    checkRevieweElig(req,res,next);
})

// add review
router.post("/post-review",protect,async(req, res, next) =>{
    addReview(req,res,next);
})

router.get("/getowner",async(req,res,next) =>{
    getOwner(req,res,next);
})

router.get("/get-reviews", async(req,res,next)=>{
    getReviews(req,res,next);
})

router.put("/uploadDp",upload.single("image"),async(req,res,next) =>{
    try {
      if (!req.file) {
        return res.status(400).send({ message: "No file uploaded." });
      }
  
      const file = req.file;
      const url = await uploadImage(file); 
      console.log("Image upload success:", url);
      req.img=url;
      uploadDp(req,res,next);
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      res.status(500).send({ message: "Server error." });
    }
   
})

module.exports = router;
