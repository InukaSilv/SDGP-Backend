const express = require('express');
const router = express.Router();
const passport = require('passport');
const { signup, login, socialAuth } = require('../controllers/authcontroller');
const { validateSignup, validateLogin } = require('../validators/authValidators');

// Local authentication
router.post('/signup', validateSignup, signup);
router.post('/login', validateLogin, login);

// Google authentication
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account'
}));

router.get('/google/callback',
    passport.authenticate('google', { session: false }),
    async (req, res, next) => {
        try {
            const result = await socialAuth(req.user, 'google');
            
            if (result.success) {
                return res.redirect(
                    `${process.env.CLIENT_URL}/auth/success?token=${result.token}`
                );
            }
            
            res.redirect(`${process.env.CLIENT_URL}/login?error=social-auth-failed`);
        } catch (err) {
            next(err);
        }
    }
);

// Facebook authentication
router.get('/facebook', passport.authenticate('facebook', {
    scope: ['email'],
    authType: 'rerequest'
}));

router.get('/facebook/callback',
    passport.authenticate('facebook', { session: false }),
    async (req, res, next) => {
        try {
            const result = await socialAuth(req.user, 'facebook');
            
            if (result.success) {
                return res.redirect(
                    `${process.env.CLIENT_URL}/auth/success?token=${result.token}`
                );
            }
            
            res.redirect(`${process.env.CLIENT_URL}/login?error=social-auth-failed`);
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;