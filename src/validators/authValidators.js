const { check, body } = require('express-validator');

exports.validateSignup = [
    check('firstName')
        .trim()
        .notEmpty().withMessage('First name is required')
        .isLength({ max: 30 }).withMessage('First name must be less than 30 characters'),

    check('lastName')
        .trim()
        .notEmpty().withMessage('Last name is required')
        .isLength({ max: 30 }).withMessage('Last name must be less than 30 characters'),

    check('username')
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 20 }).withMessage('Username must be between 3-20 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers and underscores'),

    check('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email address')
        .normalizeEmail(),

    check('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .withMessage('Password must contain at least one uppercase, one lowercase, one number and one special character'),

    check('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required')
        .matches(/^\+94\d{9}$/).withMessage('Invalid Sri Lankan phone number format (+94xxxxxxxxx)'),

    check('dob')
        .notEmpty().withMessage('Date of birth is required')
        .isISO8601().withMessage('Invalid date format (YYYY-MM-DD)'),

    check('role')
        .isIn(['student', 'landlord']).withMessage('Invalid role selected')
];

exports.validateLogin = [
    check('emailOrUsername')
        .trim()
        .notEmpty().withMessage('Email or username is required'),

    check('password')
        .notEmpty().withMessage('Password is required')
];