
const jwt = require('jsonwebtoken');

const generateToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn,
    issuer: 'rivve-api',
    audience: ['student', 'landlord']
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'rivve-api',
      audience: ['student', 'landlord']
    });
  } catch (err) {
    const error = new Error('Invalid or expired token');
    error.statusCode = 401;
    error.isOperational = true;
    throw error;
  }
};

module.exports = {
  generateToken,
  verifyToken
};
