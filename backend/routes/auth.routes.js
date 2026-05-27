const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, ctrl.register);
router.post('/login', authLimiter, ctrl.login);
router.post('/logout', protect, ctrl.logout);
router.post('/refresh', ctrl.refresh);
router.get('/me', protect, ctrl.getMe);
router.post('/forgot-password', authLimiter, ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);
router.get('/verify/:token', ctrl.verifyEmail);

module.exports = router;