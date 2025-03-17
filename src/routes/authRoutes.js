const express = require('express');
const router = express.Router();
const passport = require('passport');
const { signup, login, socialAuth,checkForForget } = require('../controllers/authcontroller');
const { validateSignup, validateLogin } = require('../validators/authValidators');
const { protect } = require("../middlewares/authMiddleware");
const { updateUserProfile,verifyPhone } = require('../controllers/usercontroller');


// Local authentication
router.post('/signup', validateSignup, signup);
router.post('/login', validateLogin, login);
router.post('/checkforforget',checkForForget);
router.put("/update-user", async (req, res, next) => {
    updateUserProfile(req, res, next);
});

router.get("/verifyPhone", async (req, res, next) => {
    console.log("came to verify phone")
    verifyPhone(req, res, next);
});

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