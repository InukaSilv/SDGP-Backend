const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateToken, verifyToken } = require('../utils/jwtUtils');
const { sendEmail } = require('../utils/emailUtils');
const crypto = require('crypto');

// Signup with email verification
exports.signup = async (req, res, next) => {
    try {
        const { firstName, lastName, username, email, password, phone, dob, role, isPremium } = req.body;

        // Check existing user
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email or username'
            });
        }

        // Create new user
        const newUser = await User.create({
            firstName,
            lastName,
            username,
            email,
            password,
            phone,
            dob: new Date(dob),
            role,
            isPremium
        });

        // Generate verification token
        const verificationToken = generateToken(
            { userId: newUser._id }, 
            process.env.EMAIL_VERIFICATION_EXPIRES
        );

        // Save verification token
        newUser.verificationToken = verificationToken;
        newUser.verificationTokenExpires = Date.now() + 3600000; // 1 hour
        await newUser.save();

        // Send verification email
        const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
        
        await sendEmail({
            email: newUser.email,
            subject: 'Verify Your Email Address',
            html: `
                <h2>Welcome to RiVVE!</h2>
                <p>Please verify your email by clicking the link below:</p>
                <a href="${verificationUrl}">Verify Email</a>
                <p>This link will expire in 1 hour.</p>
            `
        });

        res.status(201).json({
            success: true,
            message: 'Signup successful! Please check your email for verification instructions.',
            data: {
                id: newUser._id,
                email: newUser.email
            }
        });

    } catch (err) {
        next(err);
    }
};

// Login with email/username
exports.login = async (req, res, next) => {
    try {
        const { emailOrUsername, password } = req.body;

        // Find user by email or username
        const user = await User.findOne({
            $or: [
                { email: emailOrUsername },
                { username: emailOrUsername }
            ]
        }).select('+password +verificationToken');

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check email verification
        if (!user.isEmailVerified) {
            return res.status(403).json({
                success: false,
                message: 'Email not verified. Check your inbox for verification link.'
            });
        }

        // Generate JWT token
        const token = generateToken({ userId: user._id }, process.env.JWT_EXPIRES_IN);

        // Remove sensitive data
        user.password = undefined;
        user.verificationToken = undefined;

        res.status(200).json({
            success: true,
            token,
            data: user
        });

    } catch (err) {
        next(err);
    }
};

// Social authentication handler
exports.socialAuth = async (profile, provider) => {
    try {
        const socialIdField = `socialAuth.${provider}Id`;
        let user = await User.findOne({ [socialIdField]: profile.id });

        if (!user) {
            // Create new user if not exists
            user = await User.create({
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                email: profile.emails[0].value,
                socialAuth: {
                    [socialIdField]: profile.id
                },
                isEmailVerified: true,
                role: 'student' // Default role
            });
        }

        // Generate JWT token
        const token = generateToken({ userId: user._id }, process.env.JWT_EXPIRES_IN);

        return {
            success: true,
            token,
            data: user
        };

    } catch (err) {
        throw new Error(`Social authentication failed: ${err.message}`);
    }
};

// Email verification
exports.verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.query;
        const decoded = verifyToken(token);

        const user = await User.findOne({
            _id: decoded.userId,
            verificationToken: token,
            verificationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification token'
            });
        }

        // Mark email as verified
        user.isEmailVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Email verified successfully!'
        });

    } catch (err) {
        next(err);
    }
};