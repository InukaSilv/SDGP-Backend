
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const logger = require('../utils/logger'); 

// Register a new user
router.post('/register', async (req, res) => {
    const { name, email, password, isLandlord } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email is already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            isLandlord: isLandlord || false,
        });

        const savedUser = await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        logger.error('Error registering user', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login a user
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({
            token,
            user: { id: user._id, name: user.name, email: user.email, isLandlord: user.isLandlord },
        });
    } catch (error) {
        logger.error('Error logging in user', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get logged-in user's profile
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        logger.error('Error fetching user profile', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user profile
router.put('/profile', protect, async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (name) user.name = name;
        if (email) user.email = email;
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword;
        }

        const updatedUser = await user.save();
        res.status(200).json({
            id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            isLandlord: updatedUser.isLandlord,
        });
    } catch (error) {
        logger.error('Error updating user profile', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;