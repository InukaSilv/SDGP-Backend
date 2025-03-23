const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const passport = require('passport');
const { signup, login, socialAuth,checkForForget,uploadId } = require('../controllers/authcontroller');
const { uploadImage,deleteImage } = require("../config/azureStorage");
const { validateSignup, validateLogin } = require('../validators/authValidators');
const { protect } = require("../middlewares/authMiddleware");
const { updateUserProfile,updatePayment  } = require('../controllers/usercontroller');
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits:{
        fileSize:5*1024*1024,
        files:10
    }
})



// Local authentication
router.post('/signup', validateSignup, signup);
router.post('/login', validateLogin, login);
router.post('/checkforforget',checkForForget);
router.put("/update-user", async (req, res, next) => {
    updateUserProfile(req, res, next);
});

router.put("/updatepayment",async(req,res,next)=>{
    updatePayment(req,res,next);
})

router.post('/uploadId',upload.array("images",2), async(req,res ,next)=>{
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
        uploadId(req, res, next);
    }catch(err){
        next(err);
    }
})

// Google authentication
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account'
}));

router.get('/google/callback',
    passport.authenticate('google', { session: false }),
    async (req, res, next) => {
        try {
            const result = await socialAuth(req.user, 'google');
            
            if (result.success) {
                return res.redirect(
                    `${process.env.CLIENT_URL}/auth/success?token=${result.token}`
                );
            }
            
            res.redirect(`${process.env.CLIENT_URL}/login?error=social-auth-failed`);
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;