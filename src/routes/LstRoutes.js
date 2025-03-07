const express = require("express");
const { createListing } = require("../controllers/listingcontroller");
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

router.post("/listing-all",protect,upload.array("images",7), async(req,res ,next)=>{
    try{
        if(!req.files || req.files.length === 0){
            return res.status(400).send({message:"No file uploaded."});
        }
        console.log("Came to upload images");
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

module.exports = router;
