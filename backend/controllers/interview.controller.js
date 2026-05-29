const Interview = require('../models/Interview');
const Report    = require('../models/Report');
const Resume    = require('../models/Resume');
const User      = require('../models/User');
const claude    = require('../services/claudeService');

// POST /api/interview/setup
exports.setupInterview = async (req, res, next) => {
    try {
        const { resumeId, role, expLevel, resumeText } = req.body;
        if (!role) return res.status(400).json({ success: false, message: 'Role is required' });

        let rawText = resumeText;
        if (resumeId) {
            const resume = await Resume.findOne({ _id: resumeId, user: req.user._id });
            if (!resume) return res.status(404).json({ success: false, message: 'Resume not found' });
            rawText = resume.rawText;
        }
        if (!rawText) return res.status(400).json({ success: false, message: 'Resume text required' });

        const parsed = await claude.parseResumeAndGenerateQuestions({ resumeText: rawText, role, expLevel: expLevel || 'mid' });

        const interview = await Interview.create({
            user: req.user._id,
            resume: resumeId || undefined,
            role, expLevel: expLevel || 'mid',
            skills: parsed.skills,
            questions: parsed.questions,
            status: 'in_progress',
            startedAt: new Date(),
        });

        if (resumeId) {
            await Resume.findByIdAndUpdate(resumeId, {
                skills: parsed.skills,
                experience: parsed.experience,
                summary: parsed.summary,
            });
        }

        res.status(201).json({
            success: true,
            interview: {
                id: interview._id,
                role: interview.role,
                expLevel: interview.expLevel,
                skills: interview.skills,
                questions: interview.questions,
                summary: parsed.summary,
            },
        });
    } catch (err) { next(err); }
};

// POST /api/interview/:id/answer
exports.submitAnswer = async (req, res, next) => {
    try {
        const { questionIndex, answer } = req.body;
        const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
        if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
        if (interview.status !== 'in_progress') return res.status(400).json({ success: false, message: 'Interview not active' });

        const currentQ = interview.questions[questionIndex];
        if (!currentQ) return res.status(400).json({ success: false, message: 'Invalid question index' });

        interview.answers.push({ question: currentQ.text, answer });
        const isLast = questionIndex >= interview.questions.length - 1;

        let aiResponse;
        if (isLast) {
            aiResponse = await claude.generateClosing(answer);
            interview.status    = 'completed';
            interview.completedAt = new Date();
            interview.duration  = Math.round((interview.completedAt - interview.startedAt) / 1000);
        } else {
            const nextQ = interview.questions[questionIndex + 1];
            aiResponse = await claude.generateFollowUp({ question: currentQ.text, answer, nextQuestion: nextQ.text });
        }

        await interview.save();
        res.json({ success: true, aiResponse, isComplete: isLast, nextQuestionIndex: isLast ? null : questionIndex + 1 });
    } catch (err) { next(err); }
};

// POST /api/interview/:id/evaluate
exports.evaluateInterview = async (req, res, next) => {
    try {
        const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
        if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
        if (interview.answers.length === 0) return res.status(400).json({ success: false, message: 'No answers to evaluate' });

        const evaluation = await claude.evaluateInterview({ answers: interview.answers, role: interview.role, expLevel: interview.expLevel });

        const report = await Report.create({
            interview: interview._id, user: req.user._id,
            scores: { overall: evaluation.overall, relevance: evaluation.relevance, clarity: evaluation.clarity, depth: evaluation.depth },
            feedback: evaluation.feedback,
            recommendations: evaluation.recommendations,
            summary: evaluation.summary,
            strengths: evaluation.strengths,
            areasToImprove: evaluation.areasToImprove,
        });

        interview.report = report._id;
        interview.status = 'completed';
        await interview.save();

        const allReports = await Report.find({ user: req.user._id });
        const avgScore   = allReports.reduce((s, r) => s + r.scores.overall, 0) / allReports.length;
        await User.findByIdAndUpdate(req.user._id, {
            totalInterviews: allReports.length,
            avgScore: Math.round(avgScore * 10) / 10,
        });

        res.json({ success: true, report });
    } catch (err) { next(err); }
};

// GET /api/interview/history
exports.getHistory = async (req, res, next) => {
    try {
        const page  = parseInt(req.query.page)  || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip  = (page - 1) * limit;

        const [interviews, total] = await Promise.all([
            Interview.find({ user: req.user._id })
                .sort({ createdAt: -1 }).skip(skip).limit(limit)
                .populate('report', 'scores.overall')
                .select('role expLevel status createdAt completedAt skills duration'),
            Interview.countDocuments({ user: req.user._id }),
        ]);

        res.json({ success: true, interviews, total, page, pages: Math.ceil(total / limit) });
    } catch (err) { next(err); }
};

// GET /api/interview/:id
exports.getInterview = async (req, res, next) => {
    try {
        const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id }).populate('report');
        if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
        res.json({ success: true, interview });
    } catch (err) { next(err); }
};

// DELETE /api/interview/:id
exports.deleteInterview = async (req, res, next) => {
    try {
        const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
        if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });

        // Delete associated report
        if (interview.report) await Report.findByIdAndDelete(interview.report);
        await Interview.findByIdAndDelete(req.params.id);

        // Recalculate user stats
        const allReports = await Report.find({ user: req.user._id });
        const avgScore   = allReports.length
            ? allReports.reduce((s, r) => s + r.scores.overall, 0) / allReports.length
            : 0;
        await User.findByIdAndUpdate(req.user._id, {
            totalInterviews: allReports.length,
            avgScore: Math.round(avgScore * 10) / 10,
        });

        res.json({ success: true, message: 'Interview deleted' });
    } catch (err) { next(err); }
};