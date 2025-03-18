const User = require('../models/User');
const { sendVerificationCode } = require("../utils/twillio");

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        next(err);
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res, next) => {
    console.log("Request body:", req.body); 
    const { userId, firstName, lastName, phone } = req.body;
    console.log(firstName);
    try {
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { firstName, lastName, phone } },
            { new: true }
        );


        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }
        
        console.log(updatedUser);
        res.status(200).json(updatedUser);

    } catch (err) {
        next(err);
        console.log(err);
    }
};

const verifyPhone = async (req,res,next) =>{
    const {phone} = req.query;

    try {
        // Validate phone number
        if (!phone) {
          return res.status(400).json({ message: "Phone number is required" });
        }
    
        // Send verification code via Twilio
        const verification = await sendVerificationCode(phone);
    
        res.status(200).json({ message: "Verification code sent", verification });
    } catch (err) {
        console.error("Error sending verification code:", err);
        res.status(500).json({ message: "Failed to send verification code", error: err.message });
    }
};

const verifyCodeController = async (req, res, next) => {
    const { phone, code, userId } = req.body;
  
    try {
      // Validate inputs
      if (!phone || !code || !userId) {
        return res.status(400).json({ message: "Phone number, code, and user ID are required" });
      }
  
      // Verify the code using Twilio
      const verificationCheck = await verifyCode(phone, code);
  
      if (verificationCheck.status === "approved") {
        // Update the user's phoneVerified status
        await User.findByIdAndUpdate(userId, { phoneVerified: true });
  
        res.status(200).json({ message: "Phone number verified", verificationCheck });
      } else {
        res.status(400).json({ message: "Invalid code", verificationCheck });
      }
    } catch (err) {
      console.error("Error verifying code:", err);
      res.status(500).json({ message: "Failed to verify code", error: err.message });
    }
};

module.exports = {
    getUserProfile,
    updateUserProfile,
    verifyPhone,
    verifyCodeController
};
