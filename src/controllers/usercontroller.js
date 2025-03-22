const User = require('../models/User');

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
    console.log(phone)
}

const updatePayment = async(req,res,next) =>{
    const {action,userId} = req.body;
    if (!action || !userId) {
        return res.status(400).json({ message: "Action and userId are required" });
      }
      const user = await User.findByIdAndUpdate(
        userId,
        { paymentType: action },
        { new: true } 
      );
      res.status(200).json({ message: "Payment updated successfully", user });
    }
    

module.exports = {
    getUserProfile,
    updateUserProfile,
    verifyPhone,
    updatePayment
};
