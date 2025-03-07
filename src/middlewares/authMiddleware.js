const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger'); 

// Middleware to protect routes
const protect = async (req, res, next) => {
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];
            console.log("token received in middle")

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token
            req.user = await User.findById(decoded.userId).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'Unauthorized: User not found' });
            }

            next();
        } catch (error) {
            logger.warn('Token verification failed', error);
            return res.status(401).json({ message: 'Unauthorized: Invalid token' });
        }
    }

    if (!token) {
        logger.warn('Unauthorized access attempt without token');
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
};

module.exports = { protect };
