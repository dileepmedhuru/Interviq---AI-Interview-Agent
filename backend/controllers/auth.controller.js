const crypto = require('crypto');
const User = require('../models/User');
const {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    cookieOptions,
} = require('../services/tokenService');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

// POST /api/auth/register
exports.register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password)
            return res.status(400).json({ success: false, message: 'All fields are required' });

        if (password.length < 8)
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });

        const existing = await User.findOne({ email });
        if (existing)
            return res.status(409).json({ success: false, message: 'Email already registered' });

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const user = await User.create({ name, email, password, verificationToken });

        // Send verification email (non-blocking)
        sendVerificationEmail(email, name, verificationToken).catch(console.error);

        const accessToken = signAccessToken(user._id);
        const refreshToken = signRefreshToken(user._id);
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        res
            .cookie('accessToken', accessToken, cookieOptions(7))
            .cookie('refreshToken', refreshToken, cookieOptions(30))
            .status(201)
            .json({ success: true, user: user.toPublicJSON(), accessToken });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({ success: false, message: 'Email and password required' });

        const user = await User.findOne({ email }).select('+password');
        if (!user)
            return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const match = await user.comparePassword(password);
        if (!match)
            return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const accessToken = signAccessToken(user._id);
        const refreshToken = signRefreshToken(user._id);
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        res
            .cookie('accessToken', accessToken, cookieOptions(7))
            .cookie('refreshToken', refreshToken, cookieOptions(30))
            .json({ success: true, user: user.toPublicJSON(), accessToken });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/logout
exports.logout = async (req, res, next) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
        res
            .clearCookie('accessToken')
            .clearCookie('refreshToken')
            .json({ success: true, message: 'Logged out' });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/refresh
exports.refresh = async (req, res, next) => {
    try {
        const token = req.cookies?.refreshToken;
        if (!token)
            return res.status(401).json({ success: false, message: 'No refresh token' });

        const decoded = verifyRefreshToken(token);
        const user = await User.findById(decoded.id).select('+refreshToken');

        if (!user || user.refreshToken !== token)
            return res.status(401).json({ success: false, message: 'Invalid refresh token' });

        const accessToken = signAccessToken(user._id);
        res
            .cookie('accessToken', accessToken, cookieOptions(7))
            .json({ success: true, accessToken });
    } catch (err) {
        next(err);
    }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
    res.json({ success: true, user: req.user.toPublicJSON() });
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user)
            return res.json({ success: true, message: 'If that email exists, a reset link was sent' });

        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
        await user.save({ validateBeforeSave: false });

        sendPasswordResetEmail(email, user.name, token).catch(console.error);
        res.json({ success: true, message: 'If that email exists, a reset link was sent' });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user)
            return res.status(400).json({ success: false, message: 'Token invalid or expired' });

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ success: true, message: 'Password reset successful' });
    } catch (err) {
        next(err);
    }
};

// GET /api/auth/verify/:token
exports.verifyEmail = async (req, res, next) => {
    try {
        const user = await User.findOne({ verificationToken: req.params.token });
        if (!user)
            return res.status(400).json({ success: false, message: 'Invalid verification token' });

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save({ validateBeforeSave: false });

        res.json({ success: true, message: 'Email verified successfully' });
    } catch (err) {
        next(err);
    }
};