const User = require('../models/User');
const Interview = require('../models/Interview');
const Report = require('../models/Report');

// GET /api/user/profile
exports.getProfile = async (req, res) => {
    res.json({ success: true, user: req.user.toPublicJSON() });
};

// PUT /api/user/profile
exports.updateProfile = async (req, res, next) => {
    try {
        const { name, avatar } = req.body;
        const update = {};
        if (name) update.name = name;
        if (avatar !== undefined) update.avatar = avatar;

        const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true });
        res.json({ success: true, user: user.toPublicJSON() });
    } catch (err) {
        next(err);
    }
};

// PUT /api/user/password
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id).select('+password');

        const match = await user.comparePassword(currentPassword);
        if (!match)
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });

        if (newPassword.length < 8)
            return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });

        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password updated' });
    } catch (err) {
        next(err);
    }
};

// GET /api/user/stats
exports.getStats = async (req, res, next) => {
    try {
        const [total, completed, reports] = await Promise.all([
            Interview.countDocuments({ user: req.user._id }),
            Interview.countDocuments({ user: req.user._id, status: 'completed' }),
            Report.find({ user: req.user._id }).select('scores.overall createdAt'),
        ]);

        const avgScore = reports.length
            ? (reports.reduce((s, r) => s + r.scores.overall, 0) / reports.length).toFixed(1)
            : 0;

        const best = reports.length
            ? Math.max(...reports.map((r) => r.scores.overall))
            : 0;

        // Trend: last 5 scores
        const trend = reports
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
            .reverse()
            .map((r) => ({ score: r.scores.overall, date: r.createdAt }));

        res.json({ success: true, stats: { total, completed, avgScore, best, trend } });
    } catch (err) {
        next(err);
    }
};