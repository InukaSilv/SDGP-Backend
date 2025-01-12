const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token
 * @param {object} payload - Data to encode in the token
 * @param {string} expiresIn - Token expiration time (e.g., '1h', '7d')
 * @returns {string} - Signed JWT token
 */
const generateToken = (payload, expiresIn = '7d') => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @returns {object} - Decoded token payload
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        throw new Error('Invalid or expired token');
    }
};

/**
 * Decode a JWT token without verifying
 * @param {string} token - JWT token to decode
 * @returns {object} - Decoded token payload
 */
const decodeToken = (token) => {
    return jwt.decode(token);
};

module.exports = {
    generateToken,
    verifyToken,
    decodeToken,
};
