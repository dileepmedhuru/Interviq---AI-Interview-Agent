const Interview = require('../models/Interview');
const Report    = require('../models/Report');
const Resume    = require('../models/Resume');
const User      = require('../models/User');
const claude    = require('../services/claudeService');

// ─────────────────────────────────────────────────────────────────
// POST /api/interview/setup
// ─────────────────────────────────────────────────────────────────
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
            user:      req.user._id,
            resume:    resumeId || undefined,
            role,
            expLevel:  expLevel || 'mid',
            skills:    parsed.skills,
            questions: parsed.questions,
            status:    'in_progress',
            startedAt: new Date(),
        });

        if (resumeId) {
            await Resume.findByIdAndUpdate(resumeId, {
                skills:     parsed.skills,
                experience: parsed.experience,
                summary:    parsed.summary,
            });
        }

        res.status(201).json({
            success: true,
            interview: {
                id:        interview._id,
                role:      interview.role,
                expLevel:  interview.expLevel,
                skills:    interview.skills,
                questions: interview.questions,
                summary:   parsed.summary,
            },
        });
    } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────
// POST /api/interview/:id/answer
// ─────────────────────────────────────────────────────────────────
exports.submitAnswer = async (req, res, next) => {
    try {
        const { questionIndex, answer, answers: bulkAnswers } = req.body;
        const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
        if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
        if (interview.status !== 'in_progress') return res.status(400).json({ success: false, message: 'Interview not active' });

        // Bulk save (used at the end of interview)
        if (Array.isArray(bulkAnswers) && bulkAnswers.length > 0) {
            interview.answers = bulkAnswers.map(a => ({
                question:   a.question,
                answer:     a.answer,
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
            aiResponse            = await claude.generateClosing(answer);
            interview.status      = 'completed';
            interview.completedAt = new Date();
            interview.duration    = Math.round((interview.completedAt - interview.startedAt) / 1000);
        } else {
            const nextQ = interview.questions[questionIndex + 1];
            aiResponse  = await claude.generateFollowUp({ question: currentQ.text, answer, nextQuestion: nextQ.text });
        }

        await interview.save();
        res.json({
            success:           true,
            aiResponse,
            isComplete:        isLast,
            nextQuestionIndex: isLast ? null : questionIndex + 1,
        });
    } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────
// POST /api/interview/:id/evaluate
// ─────────────────────────────────────────────────────────────────
exports.evaluateInterview = async (req, res, next) => {
    try {
        const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
        if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
        if (interview.answers.length === 0) return res.status(400).json({ success: false, message: 'No answers to evaluate' });

        const evaluation = await claude.evaluateInterview({
            answers:   interview.answers,
            questions: interview.questions,
            role:      interview.role,
            expLevel:  interview.expLevel,
        });

        if (interview.report) await Report.findByIdAndDelete(interview.report);

        const report = await Report.create({
            interview:     interview._id,
            user:          req.user._id,
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
            avgScore:        Math.round(avgScore * 10) / 10,
        });

        res.json({ success: true, report });
    } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/interview/history
// ─────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────
// GET /api/interview/:id
// ─────────────────────────────────────────────────────────────────
exports.getInterview = async (req, res, next) => {
    try {
        const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id }).populate('report');
        if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
        res.json({ success: true, interview });
    } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────
// DELETE /api/interview/:id
// ─────────────────────────────────────────────────────────────────
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
            avgScore:        Math.round(avgScore * 10) / 10,
        });

        res.json({ success: true, message: 'Interview deleted' });
    } catch (err) { next(err); }
};

// ═════════════════════════════════════════════════════════════════
// POST /api/interview/run-code
//
// Accepts:
//   { code, language, functionName, testCases }
//   testCases: array of visible test cases from the problem bank
//     each: { inputCode: '[[1,2,3],9]', expected: '[0,1]',
//             expectedDisplay: '[0, 1]', input: 'nums=[1,2,3], target=9' }
//
// For each visible test case:
//   1. Wraps user code in a language-specific harness
//   2. Calls the user's function with the test case args
//   3. Sends to Judge0, captures stdout
//   4. Compares stdout to expected value
//
// Returns:
//   { success, results: [{ passed, expected, actual, input, error }],
//     passed, total }
// ═════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/interview/run-code
//
// Beginner-friendly execution:
//   • User writes complete stdin/stdout programs (input() / Scanner / cin)
//   • We pipe tc.stdin straight into the program — no harness injection
//   • Compare trimmed stdout to tc.expected
// ═══════════════════════════════════════════════════════════════════════════════

const https = require('https');

const JUDGE0_URL = 'https://ce.judge0.com/submissions?base64_encoded=false&wait=true';

const LANG_IDS = {
    javascript: 63,
    python:     71,
    java:       62,
    cpp:        54,
    c:          50,
    typescript: 74,
    go:         60,
    rust:       73,
    ruby:       72,
};

// ── Submit to Judge0 ───────────────────────────────────────────────────────────
function judge0Submit(sourceCode, languageId, stdin = '') {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            source_code: sourceCode,
            language_id: languageId,
            stdin,
        });

        const urlObj  = new URL(JUDGE0_URL);
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
                try   { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error('Invalid Judge0 response: ' + data.slice(0, 300))); }
            });
        });

        req.on('error', reject);
        req.setTimeout(25000, () => {
            req.destroy();
            reject(new Error('Judge0 timeout — please try again'));
        });
        req.write(body);
        req.end();
    });
}

// ── Normalise output for comparison ───────────────────────────────────────────
// Strips trailing whitespace/newlines and lowercases booleans
function normalise(raw) {
    if (raw === undefined || raw === null) return '';
    // Trim each line and rejoin so trailing spaces per line don't cause false fails
    return String(raw)
        .split('\n')
        .map(l => l.trimEnd())
        .join('\n')
        .trim();
}

function valuesMatch(actual, expected) {
    // Direct match
    if (normalise(actual) === normalise(expected)) return true;
    // Python True/False vs true/false
    const a = normalise(actual).toLowerCase();
    const e = normalise(expected).toLowerCase();
    return a === e;
}

// ── Main export ────────────────────────────────────────────────────────────────
exports.runCode = async (req, res, next) => {
    try {
        const { code, language, testCases } = req.body;

        if (!code)     return res.status(400).json({ success: false, message: 'Missing code' });
        if (!language) return res.status(400).json({ success: false, message: 'Missing language' });

        const lang       = (language || '').toLowerCase();
        const languageId = LANG_IDS[lang];

        if (!languageId) {
            return res.status(400).json({
                success: false,
                message: `Language "${lang}" not supported. Supported: ${Object.keys(LANG_IDS).join(', ')}`,
            });
        }

        // ── No test cases: raw run (empty stdin) ───────────────────────────────
        if (!Array.isArray(testCases) || testCases.length === 0) {
            let j0;
            try {
                j0 = await judge0Submit(code, languageId, '');
            } catch (e) {
                return res.status(502).json({ success: false, message: 'Code runner unavailable: ' + e.message });
            }

            const stdout     = (j0.stdout         || '').trimEnd();
            const stderr     = (j0.stderr         || '').trimEnd();
            const compileErr = (j0.compile_output || '').trimEnd();
            const statusId   = j0.status?.id;

            let ran = false, error = null;
            if (statusId === 6 || compileErr)         { error = compileErr || 'Compilation error'; }
            else if (statusId === 5)                  { error = 'Time Limit Exceeded'; }
            else if (statusId >= 7 && statusId <= 14) { error = stderr || j0.status?.description || 'Runtime error'; }
            else                                      { ran = true; if (stderr) error = stderr; }

            return res.json({ success: true, ran, output: stdout, error, statusId });
        }

        // ── Run each VISIBLE test case ─────────────────────────────────────────
        const visibleTCs = testCases.filter(tc => !tc.hidden);
        const results    = [];
        let passedCount  = 0;

        for (let i = 0; i < visibleTCs.length; i++) {
            const tc = visibleTCs[i];

            // Support both new (.stdin) and legacy (.inputCode) fields
            const stdin = tc.stdin !== undefined ? String(tc.stdin) : String(tc.inputCode || '');

            let j0;
            try {
                j0 = await judge0Submit(code, languageId, stdin);
            } catch (e) {
                results.push({
                    passed:   false,
                    expected: tc.expectedDisplay || tc.expected,
                    actual:   null,
                    input:    tc.input || stdin,
                    error:    'Code runner unavailable: ' + e.message,
                    statusId: null,
                });
                continue;
            }

            const stdout     = (j0.stdout         || '').trimEnd();
            const stderr     = (j0.stderr         || '').trimEnd();
            const compileErr = (j0.compile_output || '').trimEnd();
            const statusId   = j0.status?.id;

            // ── Compilation error — abort all remaining tests ──────────────────
            if (statusId === 6 || compileErr) {
                const errMsg = compileErr || 'Compilation Error';
                results.push({
                    passed: false,
                    expected: tc.expectedDisplay || tc.expected,
                    actual:   null,
                    input:    tc.input || stdin,
                    error:    errMsg,
                    statusId,
                    isCompileError: true,
                });
                for (let j = i + 1; j < visibleTCs.length; j++) {
                    const rem = visibleTCs[j];
                    results.push({
                        passed: false,
                        expected: rem.expectedDisplay || rem.expected,
                        actual:   null,
                        input:    rem.input || rem.stdin || '',
                        error:    'Blocked by compilation error',
                        statusId: 6,
                        isCompileError: true,
                    });
                }
                break;
            }

            // ── Time Limit Exceeded ────────────────────────────────────────────
            if (statusId === 5) {
                results.push({
                    passed:   false,
                    expected: tc.expectedDisplay || tc.expected,
                    actual:   null,
                    input:    tc.input || stdin,
                    error:    'Time Limit Exceeded — your code is too slow',
                    statusId,
                });
                continue;
            }

            // ── Runtime error ──────────────────────────────────────────────────
            if (statusId >= 7 && statusId <= 14) {
                results.push({
                    passed:   false,
                    expected: tc.expectedDisplay || tc.expected,
                    actual:   null,
                    input:    tc.input || stdin,
                    error:    stderr || j0.status?.description || 'Runtime Error',
                    statusId,
                });
                continue;
            }

            // ── Code ran — compare stdout to expected ──────────────────────────
            const passed = valuesMatch(stdout, tc.expected);
            if (passed) passedCount++;

            results.push({
                passed,
                expected: tc.expectedDisplay || tc.expected,
                actual:   stdout.length > 0 ? stdout : '(no output)',
                input:    tc.input || stdin,
                error:    stderr || null,
                statusId,
            });
        }

        return res.json({
            success: true,
            results,
            passed:  passedCount,
            total:   results.length,
        });

    } catch (err) { next(err); }
};