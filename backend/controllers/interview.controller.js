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
exports.submitAnswer = async (req, res, next) => {
    try {
        const { questionIndex, answer, answers: bulkAnswers } = req.body;
        const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
        if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
        if (interview.status !== 'in_progress') return res.status(400).json({ success: false, message: 'Interview not active' });

        if (Array.isArray(bulkAnswers) && bulkAnswers.length > 0) {
            interview.answers = bulkAnswers.map(a => ({
                question: a.question,
                answer: a.answer,
                answeredAt: a.answeredAt ? new Date(a.answeredAt) : new Date(),
            }));
            await interview.save();
            return res.json({ success: true, message: 'Answers saved', count: interview.answers.length });
        }

        const currentQ = interview.questions[questionIndex];
        if (!currentQ) return res.status(400).json({ success: false, message: 'Invalid question index' });

        const existingIdx = interview.answers.findIndex(a => a.question === currentQ.text);
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

        if (interview.answers.length === 0) {
            return res.status(400).json({ success: false, message: 'No answers to evaluate' });
        }

        const evaluation = await claude.evaluateInterview({
            answers:   interview.answers,
            questions: interview.questions,
            role:      interview.role,
            expLevel:  interview.expLevel
        });

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
            sectionScores:   evaluation.sectionScores || { mcq: 0, coding: 0, video: 0 },
            earnedMarks:     evaluation.earnedMarks   || 0,
            grandTotal:      evaluation.grandTotal    || 60,
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

// ═══════════════════════════════════════════════════════════════
// POST /api/interview/run-code
//
// Executes user code as-is via Judge0 CE (public free tier).
// No test-case harness, no return-value wrapping.
// User writes code that reads from stdin and prints to stdout.
// We return the raw output and whether execution succeeded.
// ═══════════════════════════════════════════════════════════════
const https = require('https');

const JUDGE0_URL = 'https://ce.judge0.com/submissions?base64_encoded=false&wait=true';

const LANG_IDS = {
    javascript: 63,
    python:     70,
    java:       62,
    cpp:        54,
    c:          50,
    typescript: 74,
    go:         60,
    rust:       73,
    ruby:       72,
    sql:        82,
};

function judge0Submit(sourceCode, languageId, stdin) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            source_code: sourceCode,
            language_id: languageId,
            stdin: stdin || '',
        });

        const urlObj = new URL(JUDGE0_URL);
        const options = {
            hostname: urlObj.hostname,
            path:     urlObj.pathname + urlObj.search,
            method:   'POST',
            headers: {
                'Content-Type':   'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        };

        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error('Invalid Judge0 response: ' + data.slice(0, 200))); }
            });
        });

        req.on('error', reject);
        req.setTimeout(20000, () => { req.destroy(); reject(new Error('Judge0 timeout')); });
        req.write(body);
        req.end();
    });
}

exports.runCode = async (req, res, next) => {
    try {
        const { code, language, stdin } = req.body;

        if (!code || !language) {
            return res.status(400).json({ success: false, message: 'Missing code or language' });
        }

        const lang = language.toLowerCase();
        const languageId = LANG_IDS[lang];
        if (!languageId) {
            return res.status(400).json({ success: false, message: `Language "${lang}" not supported` });
        }

        let j0;
        try {
            j0 = await judge0Submit(code, languageId, stdin || '');
        } catch (e) {
            return res.status(502).json({
                success: false,
                message: 'Code runner unavailable: ' + e.message
            });
        }

        const stdout     = (j0.stdout         || '').trimEnd();
        const stderr     = (j0.stderr         || '').trimEnd();
        const compileErr = (j0.compile_output || '').trimEnd();
        const statusId   = j0.status?.id;
        const statusDesc = j0.status?.description || '';
        const time       = j0.time   || null;
        const memory     = j0.memory || null;

        // ── Classify the result ──────────────────────────────────
        // Judge0 status IDs:
        //   1  = In Queue
        //   2  = Processing
        //   3  = Accepted  (ran cleanly, output produced)
        //   4  = Wrong Answer (output exists but didn't match — irrelevant here)
        //   5  = Time Limit Exceeded
        //   6  = Compilation Error
        //   7  = Runtime Error (SIGSEGV)
        //   8  = Runtime Error (SIGXFSZ)
        //   9  = Runtime Error (SIGFPE)
        //   10 = Runtime Error (SIGABRT)
        //   11 = Runtime Error (NZEC — non-zero exit)
        //   12 = Runtime Error (Internal)
        //   13 = Exec Format Error
        //   14 = Exec Format Error

        let ran   = false;   // true = code executed without crashing
        let error = null;    // human-readable error string if something went wrong

        if (statusId === 6 || compileErr) {
            error = compileErr || 'Compilation error';
        } else if (statusId === 5) {
            error = 'Time Limit Exceeded — your code took too long.';
        } else if (statusId >= 7 && statusId <= 14) {
            error = stderr || statusDesc || 'Runtime error';
        } else {
            // statusId 3 or 4 — code ran, produced output (or no output)
            ran = true;
            // Surface stderr as a warning even when code ran
            if (stderr) error = stderr;
        }

        return res.json({
            success: true,
            ran,          // did the code execute without crashing?
            output: stdout,
            error,
            time,         // execution time in seconds (e.g. "0.012")
            memory,       // memory in KB
            statusId,
            statusDesc,
        });

    } catch (err) { next(err); }
};