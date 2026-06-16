const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
    input:           { type: String, default: '' },
    inputCode:       { type: String, default: '[]' },
    stdin:           { type: String, default: '' },        // ← new: plain stdin text
    expected:        { type: String, default: 'null' },
    expectedDisplay: { type: String, default: '' },
    hidden:          { type: Boolean, default: false },
    explanation:     { type: String, default: null },
}, { _id: false });

const exampleSchema = new mongoose.Schema({
    input:       { type: String, default: '' },
    output:      { type: String, default: '' },
    explanation: { type: String, default: null },
}, { _id: false });

const questionSchema = new mongoose.Schema({
    id:                Number,
    section:           { type: Number, enum: [1, 2, 3], default: null },
    text:              String,
    type:              { type: String, enum: ['behavioral', 'technical', 'situational'], default: 'technical' },
    category:          { type: String, enum: ['mcq', 'coding', 'open', 'behavioral', 'technical'], default: 'technical' },
    options:           [String],
    correctAnswer:     Number,
    language:          String,
    explanation:       String,
    functionSignature: String,
    starterCode:       { type: mongoose.Schema.Types.Mixed, default: null },  // ← String OR {python,javascript,...}
    testCases:         { type: [testCaseSchema], default: undefined },
    title:             { type: String, default: null },
    difficulty:        { type: String, enum: ['easy', 'medium', 'hard', null], default: null },
    constraints:       { type: [String], default: [] },
    examples:          { type: [exampleSchema], default: [] },
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