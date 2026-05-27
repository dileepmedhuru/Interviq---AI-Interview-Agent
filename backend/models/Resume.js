const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        originalName: String,
        rawText: {
            type: String,
            required: true,
        },
        skills: [String],
        experience: [
            {
                title: String,
                company: String,
                duration: String,
            },
        ],
        education: [
            {
                degree: String,
                institution: String,
                year: String,
            },
        ],
        summary: String,
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Resume', resumeSchema);