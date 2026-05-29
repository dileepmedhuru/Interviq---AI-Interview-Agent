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

        const parsed = await claude.parseResumeAndGenerateQuestions({
            resumeText: rawText,
            role,
            expLevel: expLevel || 'mid'
        });

        const interview = await Interview.create({
            user: req.user._id,
            resume: resumeId || undefined,
            role,
            expLevel: expLevel || 'mid',
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
// Accepts single answer; also accepts bulk array for final submission
exports.submitAnswer = async (req, res, next) => {
    try {
        const { questionIndex, answer, answers: bulkAnswers } = req.body;
        const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
        if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
        if (interview.status !== 'in_progress') return res.status(400).json({ success: false, message: 'Interview not active' });

        // Bulk answers submission (from unified interview final submit)
        if (Array.isArray(bulkAnswers) && bulkAnswers.length > 0) {
            interview.answers = bulkAnswers.map(a => ({
                question: a.question,
                answer: a.answer,
                answeredAt: a.answeredAt ? new Date(a.answeredAt) : new Date(),
            }));
            await interview.save();
            return res.json({ success: true, message: 'Answers saved', count: interview.answers.length });
        }

        // Single answer submission
        const currentQ = interview.questions[questionIndex];
        if (!currentQ) return res.status(400).json({ success: false, message: 'Invalid question index' });

        // Avoid duplicate answers for same question index
        const existingIdx = interview.answers.findIndex(a =>
            a.question === currentQ.text
        );
        if (existingIdx >= 0) {
            interview.answers[existingIdx].answer = answer;
        } else {
            interview.answers.push({ question: currentQ.text, answer });
        }

        const isLast = questionIndex >= interview.questions.length - 1;

        let aiResponse;
        if (isLast) {
            aiResponse = await claude.generateClosing(answer);
            interview.status      = 'completed';
            interview.completedAt = new Date();
            interview.duration    = Math.round((interview.completedAt - interview.startedAt) / 1000);
        } else {
            const nextQ = interview.questions[questionIndex + 1];
            aiResponse = await claude.generateFollowUp({
                question: currentQ.text,
                answer,
                nextQuestion: nextQ.text
            });
        }

        await interview.save();
        res.json({
            success: true,
            aiResponse,
            isComplete: isLast,
            nextQuestionIndex: isLast ? null : questionIndex + 1
        });
    } catch (err) { next(err); }
};

// POST /api/interview/:id/evaluate
exports.evaluateInterview = async (req, res, next) => {
    try {
        const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
        if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });

        // Allow re-evaluation or first evaluation
        if (interview.answers.length === 0) {
            return res.status(400).json({ success: false, message: 'No answers to evaluate' });
        }

        const evaluation = await claude.evaluateInterview({
            answers: interview.answers,
            role: interview.role,
            expLevel: interview.expLevel
        });

        // Remove old report if re-evaluating
        if (interview.report) {
            await Report.findByIdAndDelete(interview.report);
        }

        const report = await Report.create({
            interview: interview._id,
            user: req.user._id,
            scores: {
                overall:   evaluation.overall,
                relevance: evaluation.relevance,
                clarity:   evaluation.clarity,
                depth:     evaluation.depth,
            },
            feedback:        evaluation.feedback,
            recommendations: evaluation.recommendations,
            summary:         evaluation.summary,
            strengths:       evaluation.strengths,
            areasToImprove:  evaluation.areasToImprove,
        });

        interview.report      = report._id;
        interview.status      = 'completed';
        interview.completedAt = interview.completedAt || new Date();
        if (interview.startedAt && interview.completedAt) {
            interview.duration = Math.round((interview.completedAt - interview.startedAt) / 1000);
        }
        await interview.save();

        // Recalculate user stats
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

        if (interview.report) await Report.findByIdAndDelete(interview.report);
        await Interview.findByIdAndDelete(req.params.id);

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