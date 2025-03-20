const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { type } = require("os");

const UserSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: function(){ return this.registerType === "password";},
        trim: true
    },
    lastName: {
        type: String,
        required: function(){ return this.registerType === "password";},
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
    },
    phone: {
        type: String,
        required: function(){ return this.registerType === "password";},
        match: [/^0\d{9}$/, 'Invalid Sri Lankan phone number format, phone number must start from 0 and should exactly have 10 characters']
    },
    dob: {
        type: Date,
        required: function(){ return this.registerType === "password";}
    },
    role: {
        type: String,
        enum: ['Student', 'Landlord'],
        required: [true, 'Role is required'],
        default: 'Student'
    },
    ads: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Listing",
        },
    ],
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Wishlist",
    }],
    registerType: {
        type: String,
        enum:['password','google'],
        requried:[true,'Registration type is required'],
        default:'password'
    },
    paymentType: {
        type: String,
        enum:['monthly','yearly','none'],
        requried:[true,'Payment type is required'],
        default:'none',
        trim: true
    },
    isPremium: {
        type: Boolean,
        default: false
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isPhoneVerified: {
        type: Boolean,
        default: false
    },
    isIdVerified: {
        type: Boolean,
        default: false
    },
    profilePhoto:{
        type: String,
        default:""
    },
    verificationToken: String,
    verificationTokenExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Password hashing middleware
// UserSchema.pre('save', async function (next) {
//     if (!this.isModified('password')) return next();

//     try {
//         const salt = await bcrypt.genSalt(12);
//         this.password = await bcrypt.hash(this.password, salt);
//         next();
//     } catch (err) {
//         next(err);
//     }
// });

// Indexes (Avoid duplicates)
UserSchema.index({ 'socialAuth.googleId': 1 });

module.exports = mongoose.model('User', UserSchema);    