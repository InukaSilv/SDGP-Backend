const express = require("express");
const { createListing, searchPersonalListing, addslots, getListing } = require("../controllers/listingcontroller");
const multer = require("multer");
const { uploadImage } = require("../config/azureStorage");
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
router.post("/listing-all",protect,upload.array("images",7), async(req,res ,next)=>{
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

router.put("/update-lis")

module.exports = router;
