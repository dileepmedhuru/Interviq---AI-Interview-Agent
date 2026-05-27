const { verifyAccessToken } = require('../services/tokenService');
const User = require('../models/User');

const protect = async (req, res, next) => {
    try {
        let token;

        // Check Authorization header first, then cookie
        if (req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies?.accessToken) {
            token = req.cookies.accessToken;
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token invalid or expired' });
    }
};

module.exports = { protect };