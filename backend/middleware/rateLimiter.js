const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { success: false, message: 'Too many attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: { success: false, message: 'Too many requests, slow down' },
    standardHeaders: true,
    legacyHeaders: false,
});

const claudeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    message: { success: false, message: 'AI request limit reached, please wait' },
});

module.exports = { authLimiter, apiLimiter, claudeLimiter };