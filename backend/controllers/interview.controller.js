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
// POST /api/interview/run-code  — Judge0 CE public API
// ═══════════════════════════════════════════════════════════════
const https = require('https');

const JUDGE0_URL = 'https://ce.judge0.com/submissions?base64_encoded=false&wait=true';

const LANG_IDS = {
    javascript: 63,
    python:     70,
    java:       62,
    cpp:        54,
    c:          50,
    sql:        82,
};

// ── Build executable source for each language ─────────────────
function buildSource(lang, userCode, fnSig, args, expected) {
    const argsJson = JSON.stringify(args);

    // Determine if this problem expects a boolean result
    const expectedStr = String(expected).trim();
    const isBoolExpected = expectedStr === 'true' || expectedStr === 'false';

    switch (lang) {
        case 'javascript':
            return `
${userCode}

const __args = ${argsJson};
try {
    const __result = ${fnSig}(...__args);
    console.log(JSON.stringify({ result: __result }));
} catch(e) {
    console.log(JSON.stringify({ error: e.message }));
}`;

        case 'python':
            return `
${userCode}

import json
__args = ${JSON.stringify(args)}
try:
    __result = ${fnSig}(*__args)
    print(json.dumps({"result": __result}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

        case 'java': {
            const argDecls = args.map((v, i) => {
                if (Array.isArray(v)) {
                    const type = typeof v[0] === 'string' ? 'String' : 'int';
                    return `${type}[] arg${i} = {${v.map(x => JSON.stringify(x)).join(', ')}};`;
                }
                if (typeof v === 'string')  return `String arg${i} = ${JSON.stringify(v)};`;
                if (typeof v === 'boolean') return `boolean arg${i} = ${v};`;
                return `int arg${i} = ${v};`;
            }).join('\n        ');
            const argNames = args.map((_, i) => `arg${i}`).join(', ');

            const solutionCode = /class\s+Solution/.test(userCode)
                ? userCode
                : `class Solution {\n${userCode}\n}`;

            return `
import java.util.*;
import java.util.stream.*;

${solutionCode}

public class Main {
    public static void main(String[] args) {
        try {
            Solution sol = new Solution();
            ${argDecls}
            Object result = sol.${fnSig}(${argNames});
            System.out.println(toJson(result));
        } catch (Exception e) {
            System.out.println("{\\"error\\":\\"" + e.getMessage() + "\\"}");
        }
    }

    static String toJson(Object o) {
        if (o == null) return "null";
        if (o instanceof int[])     return Arrays.toString((int[]) o).replace(", ", ",").replace("[ ", "[").replace(" ]", "]");
        if (o instanceof String)    return "\\"" + o + "\\"";
        if (o instanceof Boolean)   return o.toString();
        if (o instanceof List) {
            List<?> l = (List<?>) o;
            return "[" + l.stream().map(x -> toJson(x)).collect(Collectors.joining(",")) + "]";
        }
        return String.valueOf(o);
    }
}`;
        }

        case 'cpp': {
            const callArgs = args.map(v => {
                if (Array.isArray(v)) {
                    const inner = v.map(x => JSON.stringify(x)).join(', ');
                    return typeof v[0] === 'string'
                        ? `vector<string>{${inner}}`
                        : `vector<int>{${inner}}`;
                }
                if (typeof v === 'string')  return `string(${JSON.stringify(v)})`;
                if (typeof v === 'boolean') return v ? 'true' : 'false';
                return String(v);
            }).join(', ');

            return `
#include <bits/stdc++.h>
using namespace std;

${userCode}

template<typename T>
string toJson(T v) { return to_string(v); }
string toJson(string v) { return "\\"" + v + "\\""; }
string toJson(bool v) { return v ? "true" : "false"; }
string toJson(vector<int> v) {
    string s = "[";
    for (int i = 0; i < (int)v.size(); i++) { if(i) s += ","; s += to_string(v[i]); }
    return s + "]";
}
string toJson(vector<string> v) {
    string s = "[";
    for (int i = 0; i < (int)v.size(); i++) { if(i) s += ","; s += "\\"" + v[i] + "\\""; }
    return s + "]";
}

int main() {
    try {
        auto result = ${fnSig}(${callArgs});
        cout << toJson(result) << endl;
    } catch (exception& e) {
        cout << "{\\"error\\":\\"" << e.what() << "\\"}" << endl;
    }
    return 0;
}`;
        }

        case 'c': {
            const callArgs = args.map((v, i) => {
                if (Array.isArray(v)) return `arg${i}`;
                if (typeof v === 'string') return JSON.stringify(v);
                if (typeof v === 'boolean') return v ? '1' : '0';
                return String(v);
            }).join(', ');

            const argDecls = args.map((v, i) => {
                if (Array.isArray(v)) {
                    const inner = v.join(', ');
                    return `int arg${i}[] = {${inner}};\n    int arg${i}Size = ${v.length};`;
                }
                if (typeof v === 'string') return `const char* arg${i} = ${JSON.stringify(v)};`;
                if (typeof v === 'boolean') return `int arg${i} = ${v ? 1 : 0};`;
                return `int arg${i} = ${v};`;
            }).join('\n    ');

            // Build the function call — arrays need size param
            const callStr = args.map((v, i) => {
                if (Array.isArray(v)) return `arg${i}, arg${i}Size`;
                return `arg${i}`;
            }).join(', ');

            // ── KEY FIX: print "true"/"false" when expected is boolean ──
            const printResult = isBoolExpected
                ? `printf("%s\\n", result ? "true" : "false");`
                : `printf("%d\\n", result);`;

            return `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <stdbool.h>

${userCode}

int main() {
    ${argDecls}
    int result = (int)${fnSig}(${callStr});
    ${printResult}
    return 0;
}`;
        }

        case 'sql':
            return userCode;

        default:
            return userCode;
    }
}

// ── Call Judge0 ───────────────────────────────────────────────
function judge0Submit(sourceCode, languageId) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            source_code: sourceCode,
            language_id: languageId,
            stdin: '',
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
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('Judge0 timeout')); });
        req.write(body);
        req.end();
    });
}

// ── Deep equality ─────────────────────────────────────────────
function deepEqual(a, b) {
    if (a === b) return true;
    if (a === null || b === null) return a === b;
    if (typeof a !== typeof b) return String(a) === String(b);
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        if (a.every((v, i) => deepEqual(v, b[i]))) return true;
        const sa = [...a].sort(), sb = [...b].sort();
        return sa.every((v, i) => deepEqual(v, sb[i]));
    }
    if (typeof a === 'object') {
        const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
        if (ka.join() !== kb.join()) return false;
        return ka.every(k => deepEqual(a[k], b[k]));
    }
    return false;
}

function parseArgs(tc) {
    try {
        const parsed = JSON.parse(tc.inputCode);
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch (_) { return []; }
}

function parseExpected(tc) {
    try { return JSON.parse(tc.expected); } catch (_) { return tc.expected; }
}

// ── Main handler ──────────────────────────────────────────────
exports.runCode = async (req, res, next) => {
    try {
        const { code, language, testCases, functionSignature } = req.body;
        if (!code || !language || !testCases || !functionSignature) {
            return res.status(400).json({ success: false, message: 'Missing fields' });
        }

        const lang = language.toLowerCase();
        const languageId = LANG_IDS[lang];
        if (!languageId) {
            return res.status(400).json({ success: false, message: `Language "${lang}" not supported` });
        }

        const results = [];

        for (const tc of testCases) {
            const args     = parseArgs(tc);
            const expected = parseExpected(tc);
            const source   = buildSource(lang, code, functionSignature, args, expected);

            try {
                const j0 = await judge0Submit(source, languageId);

                const stdout     = (j0.stdout         || '').trim();
                const stderr     = (j0.stderr         || '').trim();
                const compileErr = (j0.compile_output || '').trim();
                const statusId   = j0.status?.id;

                // Compile error
                if (statusId === 6 || (compileErr && !stdout)) {
                    results.push({
                        input:    tc.input,
                        expected: tc.expectedDisplay,
                        got:      'Compile error',
                        pass:     false,
                        hidden:   !!tc.hidden,
                        error:    compileErr.slice(0, 400),
                    });
                    continue;
                }

                // TLE
                if (statusId === 5) {
                    results.push({
                        input:    tc.input,
                        expected: tc.expectedDisplay,
                        got:      'Time Limit Exceeded',
                        pass:     false,
                        hidden:   !!tc.hidden,
                        error:    'Your code took too long to execute.',
                    });
                    continue;
                }

                // Runtime error
                if (stderr && !stdout) {
                    results.push({
                        input:    tc.input,
                        expected: tc.expectedDisplay,
                        got:      'Runtime error',
                        pass:     false,
                        hidden:   !!tc.hidden,
                        error:    stderr.slice(0, 400),
                    });
                    continue;
                }

                // Parse output — last non-empty line
                const lastLine = stdout.split('\n').map(l => l.trim()).filter(Boolean).pop() || '';

                let got;

                if (lang === 'javascript' || lang === 'python') {
                    try {
                        const parsed = JSON.parse(lastLine);
                        if (parsed?.error) {
                            results.push({
                                input:    tc.input,
                                expected: tc.expectedDisplay,
                                got:      `Error: ${parsed.error}`,
                                pass:     false,
                                hidden:   !!tc.hidden,
                                error:    parsed.error,
                            });
                            continue;
                        }
                        got = parsed?.result ?? parsed;
                    } catch (_) {
                        got = lastLine;
                    }
                } else {
                    // C, C++, Java — raw output
                    // For C with bool fix, output is already "true"/"false" string
                    if ((lang === 'c' || lang === 'cpp') &&
                        (lastLine === 'true' || lastLine === 'false')) {
                        // Keep as string so deepEqual("true", true) works via String coercion
                        got = lastLine;
                    } else {
                        try { got = JSON.parse(lastLine); }
                        catch (_) { got = lastLine; }
                    }
                }

                const pass = deepEqual(got, expected);

                results.push({
                    input:    tc.input,
                    expected: tc.expectedDisplay,
                    got:      got === null      ? 'null'
                            : got === undefined ? 'undefined'
                            : typeof got === 'object' ? JSON.stringify(got)
                            : String(got),
                    pass,
                    hidden:   !!tc.hidden,
                    error:    null,
                });

            } catch (e) {
                results.push({
                    input:    tc.input,
                    expected: tc.expectedDisplay,
                    got:      'Execution error',
                    pass:     false,
                    hidden:   !!tc.hidden,
                    error:    e.message,
                });
            }
        }

        const passed = results.filter(r => r.pass).length;
        res.json({ success: true, results, passed, total: results.length });

    } catch (err) { next(err); }
};