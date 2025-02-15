const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwUtils');
const admin = require('../config/firebaseAdmin'); // Firebase Admin SDK

/**
 * Verify Firebase ID token (Only during signup)
 */
const verifyFirebaseToken = async (idToken) => {
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return decodedToken;
    } catch (error) {
        console.error('Firebase Token Verification Failed:', error.message);
        throw new Error('Invalid Firebase token');
    }
};

/**
 * Signup - Uses Firebase only for first-time email verification
 */
exports.signup = async (req, res, next) => {
    try {
        const {  fname, lname, email, phone, dob, password , registerType , isPremium, idToken, role } = req.body;

        // Verify Firebase token
        const decodedToken = await verifyFirebaseToken(idToken);

        // Ensure email is verified before saving user
        if (!decodedToken.email_verified) {
            return res.status(400).json({ success: false, message: 'Email not verified' });
        }

        const existingUser = await User.findOne({ email: decodedToken.email });
        // Check if user already exists
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            firstName: fname,
            lastName: lname,
            email,
            phone,
            dob,
            password: hashedPassword, // Store hashed password
            registerType,
            isPremium,
            isEmailVerified: true,
            role
        });

        await newUser.save();

        // Generate JWT token for session
        const token = generateToken({ userId: newUser._id });

        res.status(201).json({ success: true, message: 'User registered successfully', token, user: newUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Signup failed yakoo' });
    }
};

/**
 * Login - Uses JWT after first signup
 */
exports.login = async (req, res, next) => {
    try {
       const {idToken} = req.body;

       const decodedToken = await admin.auth().verifyIdToken(idToken);
       const email = decodedToken.email;

       let user = await User.findOne({email});
       if(!user){
        return res.status(401).json({success:false,message:'User not found'});
       }

        // Generate JWT token
        const token = generateToken({ userId: user._id });

        res.status(200).json({ success: true, token, data: user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
};

/**
 * Social Authentication (Google, Facebook)
 */
exports.socialAuth = async (profile, provider) => {
    try {
        const socialIdField = `socialAuth.${provider}Id`;
        let user = await User.findOne({ [socialIdField]: profile.id });

        if (!user) {
            user = await User.create({
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                email: profile.emails[0].value,
                socialAuth: { [provider + 'Id']: profile.id },
                isEmailVerified: true,
                role: 'student' // Default role
            });
        }

        const token = generateToken({ userId: user._id });
        return { success: true, token, data: user };
    } catch (error) {
        throw new Error(`Social authentication failed: ${error.message}`);
    }
};