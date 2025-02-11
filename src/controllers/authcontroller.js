// controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateToken, verifyToken } = require('../utils/jwUtils');
const { sendEmail } = require('../utils/emailUtils');

// Signup with email verification
exports.signup = async (req, res, next) => {
  try {
    const { firstName, lastName, username, email, password, phone, dob, role, isPremium } = req.body;

    // Check if a user already exists by email or username
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

    // Generate email verification token (1-hour expiry)
    const verificationToken = generateToken({ userId: newUser._id }, '1h');

    // Save the token and its expiry on the user document
    newUser.verificationToken = verificationToken;
    newUser.verificationTokenExpires = Date.now() + 3600000; // 1 hour in milliseconds
    await newUser.save();

    // Construct verification URL and send the verification email
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

// Login with email or username
exports.login = async (req, res, next) => {
  try {
    const { emailOrUsername, password } = req.body;

    // Find user by email or username and include sensitive fields
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
    }).select('+password +verificationToken');

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Ensure the user's email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email not verified. Please check your inbox for the verification link.'
      });
    }

    // Generate JWT token
    const token = generateToken({ userId: user._id });

    // Remove sensitive data before sending the user object
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

// Social authentication handler (e.g., for Google or Facebook)
exports.socialAuth = async (profile, provider) => {
  try {
    // Build the dynamic field name, e.g., "socialAuth.googleId"
    const socialIdField = `socialAuth.${provider}Id`;
    let user = await User.findOne({ [socialIdField]: profile.id });

    if (!user) {
      // Create new user if one doesn't exist
      user = await User.create({
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        email: profile.emails[0].value,
        socialAuth: {
          [provider + 'Id']: profile.id
        },
        isEmailVerified: true,
        role: 'student' // Default role
      });
    }

    // Generate a JWT token for the authenticated user
    const token = generateToken({ userId: user._id });

    return {
      success: true,
      token,
      data: user
    };

  } catch (err) {
    throw new Error(`Social authentication failed: ${err.message}`);
  }
};

// Email verification endpoint (triggered by verification link)
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

    // Mark email as verified and remove verification token fields
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
