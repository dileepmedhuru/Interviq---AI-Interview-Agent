const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    id: Number,
    text: String,
    type: { type: String, enum: ['behavioral', 'technical', 'situational'] },
});

const answerSchema = new mongoose.Schema({
    question: String,
    answer: String,
    answeredAt: { type: Date, default: Date.now },
});

const interviewSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        resume: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Resume',
        },
        role: {
            type: String,
            required: true,
            trim: true,
        },
        expLevel: {
            type: String,
            enum: ['entry', 'mid', 'senior', 'lead'],
            default: 'mid',
        },
        skills: [String],
        questions: [questionSchema],
        answers: [answerSchema],
        status: {
            type: String,
            enum: ['setup', 'in_progress', 'completed', 'abandoned'],
            default: 'setup',
        },
        report: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report',
        },
        duration: Number, // seconds
        startedAt: Date,
        completedAt: Date,
    },
    { timestamps: true }
);

module.exports = mongoose.model('Interview', interviewSchema);