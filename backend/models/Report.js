const mongoose = require('mongoose');

const feedbackItemSchema = new mongoose.Schema({
    type: { type: String, enum: ['good', 'improve', 'bad'] },
    text: String,
});

const reportSchema = new mongoose.Schema(
    {
        interview: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Interview',
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        scores: {
            overall: { type: Number, min: 0, max: 10 },
            relevance: { type: Number, min: 0, max: 10 },
            clarity: { type: Number, min: 0, max: 10 },
            depth: { type: Number, min: 0, max: 10 },
        },
        feedback: [feedbackItemSchema],
        recommendations: [String],
        summary: String,
        strengths: [String],
        areasToImprove: [String],
    },
    { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);