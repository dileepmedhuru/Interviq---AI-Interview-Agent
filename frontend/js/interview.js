const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    id:            Number,
    section:       { type: Number, enum: [1, 2, 3], default: 1 },
    text:          String,
    type:          { type: String, enum: ['behavioral', 'technical', 'situational'] },
    category:      { type: String, enum: ['mcq', 'coding', 'open', 'behavioral', 'technical'], default: 'open' },
    options:       [String],
    correctAnswer: Number,
    language:      String,
    explanation:   String,
}, { _id: false });

const answerSchema = new mongoose.Schema({
    question:   String,
    answer:     String,
    answeredAt: { type: Date, default: Date.now },
});

const interviewSchema = new mongoose.Schema(
    {
        user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        resume:   { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
        role:     { type: String, required: true, trim: true },
        expLevel: { type: String, enum: ['entry', 'mid', 'senior', 'lead'], default: 'mid' },
        skills:    [String],
        questions: [questionSchema],
        answers:   [answerSchema],
        status:    { type: String, enum: ['setup', 'in_progress', 'completed', 'abandoned'], default: 'setup' },
        report:    { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
        duration:    Number,
        startedAt:   Date,
        completedAt: Date,
    },
    { timestamps: true }
);

module.exports = mongoose.model('Interview', interviewSchema);