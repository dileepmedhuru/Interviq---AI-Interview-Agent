const Resume = require('../models/Resume');
const { parseResume } = require('../services/resumeParser');

// POST /api/resume/upload
exports.uploadResume = async (req, res, next) => {
    try {
        if (!req.file && !req.body.text)
            return res.status(400).json({ success: false, message: 'Resume file or text required' });

        let rawText;
        let originalName = 'pasted-text.txt';

        if (req.file) {
            rawText = await parseResume(req.file);
            originalName = req.file.originalname;
        } else {
            rawText = req.body.text.trim();
        }

        if (!rawText || rawText.length < 50)
            return res.status(400).json({ success: false, message: 'Resume text is too short' });

        // Deactivate old resumes
        await Resume.updateMany({ user: req.user._id }, { isActive: false });

        const resume = await Resume.create({
            user: req.user._id,
            originalName,
            rawText,
        });

        res.status(201).json({ success: true, resume: { id: resume._id, originalName } });
    } catch (err) {
        next(err);
    }
};

// GET /api/resume/active
exports.getActiveResume = async (req, res, next) => {
    try {
        const resume = await Resume.findOne({ user: req.user._id, isActive: true }).select('-rawText');
        res.json({ success: true, resume });
    } catch (err) {
        next(err);
    }
};