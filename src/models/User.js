
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true
    },
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        minlength: 3,
        maxlength: 20,
        match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
    },
    password: {
        type: String,
        select: false,
        minlength: 8
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        match: [/^\+94\d{9}$/, 'Invalid Sri Lankan phone number format']
    },
    dob: {
        type: Date,
        required: [true, 'Date of birth is required']
    },
    role: {
        type: String,
        enum: ['student', 'landlord'],
        required: [true, 'Role is required'],
        default: 'student'
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
    socialAuth: {
        googleId: String,
        facebookId: String
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
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ 'socialAuth.googleId': 1 });
UserSchema.index({ 'socialAuth.facebookId': 1 });

module.exports = mongoose.model('Users', UserSchema);
index({ 'socialAuth.facebookId': 1 });

module.exports = mongoose.model('User', UserSchema);