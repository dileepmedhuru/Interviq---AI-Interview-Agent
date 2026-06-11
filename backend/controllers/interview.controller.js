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
// Multi-language server-side execution with test case validation
// ═══════════════════════════════════════════════════════════════
const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ── Language runner registry ──────────────────────────────────
const RUNNERS = {
    python:     runPython,
    javascript: runJavaScript,
    typescript: runJavaScript,   // transpile-free: strip types then run as JS
    java:       runJava,
    cpp:        runCpp,
    go:         runGo,
    rust:       runRust,
};

exports.runCode = async (req, res, next) => {
    try {
        const { code, language, testCases, functionSignature } = req.body;
        if (!code || !language || !testCases || !functionSignature) {
            return res.status(400).json({ success: false, message: 'Missing fields' });
        }

        const lang = language.toLowerCase();
        const runner = RUNNERS[lang];
        if (!runner) {
            return res.status(400).json({ success: false, message: `Language "${lang}" not supported server-side` });
        }

        const results = await runner(code, testCases, functionSignature);
        const passed  = results.filter(r => r.pass).length;
        res.json({ success: true, results, passed, total: results.length });

    } catch (err) { next(err); }
};

// ── Helpers ───────────────────────────────────────────────────
function tmpFile(ext) {
    return path.join(os.tmpdir(), `run_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
}

function execSafe(cmd, opts = {}) {
    return execSync(cmd, { timeout: 8000, encoding: 'utf-8', ...opts }).trim();
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

function deepEqual(a, b) {
    if (a === b) return true;
    if (a === null || b === null) return a === b;
    if (typeof a !== typeof b) {
        return String(a) === String(b);
    }
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

// ── Python runner ─────────────────────────────────────────────
async function runPython(code, testCases, fnSig) {
    const results = [];
    for (const tc of testCases) {
        const args    = parseArgs(tc);
        const argsStr = args.map(a => JSON.stringify(a)).join(', ');
        const script  = `import json, sys\n\n${code}\n\ntry:\n    result = ${fnSig}(${argsStr})\n    print(json.dumps(result))\nexcept Exception as e:\n    print(json.dumps({"__error__": str(e)}))\n`;
        const f = tmpFile('.py');
        try {
            fs.writeFileSync(f, script);
            const cmd = process.platform === 'win32' ? 'python' : 'python3';
            const out = execSafe(`${cmd} "${f}"`);
            let got;
            try { got = JSON.parse(out); } catch (_) { got = out; }
            const isError = got && typeof got === 'object' && got.__error__;
            const expected = parseExpected(tc);
            const pass = !isError && deepEqual(got, expected);
            results.push({ input: tc.input, expected: tc.expectedDisplay, got: isError ? `Error: ${got.__error__}` : JSON.stringify(got), pass, hidden: !!tc.hidden, error: isError ? got.__error__ : null });
        } catch (e) {
            results.push({ input: tc.input, expected: tc.expectedDisplay, got: 'Timeout or crash', pass: false, hidden: !!tc.hidden, error: e.message });
        } finally { try { fs.unlinkSync(f); } catch (_) {} }
    }
    return results;
}

// ── JavaScript / TypeScript runner ────────────────────────────
// Strips TS type annotations with a simple regex then runs via Node.
async function runJavaScript(code, testCases, fnSig) {
    // Basic TS → JS stripping (type annotations, interface blocks, `: type`)
    const jsCode = code
        .replace(/:\s*\w+(\[\])?(\s*\|[\s\w\[\]|]+)?(?=[,)=\n;{])/g, '')   // param types
        .replace(/\binterface\s+\w+\s*\{[^}]*\}/g, '')                       // interface blocks
        .replace(/\btype\s+\w+\s*=\s*[^;\n]+;?/g, '');                       // type aliases

    const results = [];
    for (const tc of testCases) {
        const args     = parseArgs(tc);
        const argsJson = JSON.stringify(args);
        // Build a runner script that calls the function and prints JSON result
        const script = `
const __args = ${argsJson};
${jsCode}
try {
    const __result = ${fnSig}(...__args);
    process.stdout.write(JSON.stringify(__result === undefined ? null : __result));
} catch(e) {
    process.stdout.write(JSON.stringify({__error__: e.message}));
}
`;
        const f = tmpFile('.js');
        try {
            fs.writeFileSync(f, script);
            const out = execSafe(`node "${f}"`);
            let got;
            try { got = JSON.parse(out); } catch (_) { got = out; }
            const isError = got && typeof got === 'object' && got.__error__;
            const expected = parseExpected(tc);
            const pass = !isError && deepEqual(got, expected);
            results.push({ input: tc.input, expected: tc.expectedDisplay, got: isError ? `Error: ${got.__error__}` : JSON.stringify(got), pass, hidden: !!tc.hidden, error: isError ? got.__error__ : null });
        } catch (e) {
            results.push({ input: tc.input, expected: tc.expectedDisplay, got: 'Timeout or crash', pass: false, hidden: !!tc.hidden, error: e.message });
        } finally { try { fs.unlinkSync(f); } catch (_) {} }
    }
    return results;
}

// ── Java runner ───────────────────────────────────────────────
// Wraps user code in a Solution class and calls it via a main method.
async function runJava(code, testCases, fnSig) {
    const results = [];

    // Determine method return type heuristically from test cases
    const firstExpected = testCases[0]?.expected ?? 'null';
    let returnType = 'Object';
    try {
        const v = JSON.parse(firstExpected);
        if (Array.isArray(v)) returnType = 'int[]';
        else if (typeof v === 'number' && Number.isInteger(v)) returnType = 'int';
        else if (typeof v === 'boolean') returnType = 'boolean';
        else if (typeof v === 'string') returnType = 'String';
    } catch (_) {}

    for (const tc of testCases) {
        const args = parseArgs(tc);

        // Build argument declarations & call string
        const argDecls = args.map((a, i) => javaArgDecl(a, i)).join('\n        ');
        const argNames = args.map((_, i) => `arg${i}`).join(', ');

        const userClass = extractOrWrapJava(code, fnSig);

        const mainClass = `
import java.util.*;
import java.util.stream.*;
${userClass}
public class Runner {
    public static void main(String[] args) {
        try {
            Solution sol = new Solution();
            ${argDecls}
            Object result = sol.${fnSig}(${argNames});
            System.out.println(toJson(result));
        } catch(Exception e) {
            System.out.println("{\\"__error__\\":\\"" + e.getMessage().replace("\\"","\\\\\\"") + "\\"}");
        }
    }
    static String toJson(Object o) {
        if (o == null) return "null";
        if (o instanceof int[]) return Arrays.toString((int[])o).replace(" ","").replace("[","[").replace("]","]");
        if (o instanceof boolean[]) return Arrays.toString((boolean[])o);
        if (o instanceof String) return "\\"" + o + "\\"";
        if (o instanceof List) {
            List<?> l = (List<?>)o;
            return "[" + l.stream().map(x -> toJson(x)).collect(Collectors.joining(",")) + "]";
        }
        return String.valueOf(o);
    }
}`;

        const dir  = fs.mkdtempSync(path.join(os.tmpdir(), 'java_'));
        const src  = path.join(dir, 'Runner.java');
        try {
            fs.writeFileSync(src, mainClass);
            execSafe(`javac "${src}"`, { cwd: dir });
            const out = execSafe(`java -cp "${dir}" Runner`);
            let got;
            try { got = JSON.parse(out); } catch (_) { got = out; }
            const isError = got && typeof got === 'object' && got.__error__;
            const expected = parseExpected(tc);
            const pass = !isError && deepEqual(got, expected);
            results.push({ input: tc.input, expected: tc.expectedDisplay, got: isError ? `Error: ${got.__error__}` : JSON.stringify(got), pass, hidden: !!tc.hidden, error: isError ? got.__error__ : null });
        } catch (e) {
            const errMsg = e.stderr || e.message || 'Compile/runtime error';
            results.push({ input: tc.input, expected: tc.expectedDisplay, got: 'Error', pass: false, hidden: !!tc.hidden, error: errMsg.slice(0, 300) });
        } finally {
            try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
        }
    }
    return results;
}

function javaArgDecl(val, idx) {
    if (Array.isArray(val)) {
        const inner = val.map(v => JSON.stringify(v)).join(', ');
        const type  = typeof val[0] === 'string' ? 'String' : 'int';
        return `${type}[] arg${idx} = {${inner}};`;
    }
    if (typeof val === 'string')  return `String arg${idx} = ${JSON.stringify(val)};`;
    if (typeof val === 'boolean') return `boolean arg${idx} = ${val};`;
    if (typeof val === 'number' && !Number.isInteger(val)) return `double arg${idx} = ${val};`;
    return `int arg${idx} = ${val};`;
}

function extractOrWrapJava(code, fnSig) {
    // If user already wrote a class Solution { ... }, use it directly
    if (/class\s+Solution\s*\{/.test(code)) return code;
    // Otherwise wrap it
    return `class Solution {\n    public Object ${fnSig}(Object... args) {\n${code}\n    }\n}`;
}

// ── C++ runner ────────────────────────────────────────────────
async function runCpp(code, testCases, fnSig) {
    const results = [];
    for (const tc of testCases) {
        const args = parseArgs(tc);

        // Build a main() that calls the function and prints JSON-like output
        const callArgs = args.map(a => cppLiteral(a)).join(', ');
        const cppSrc = `
#include <bits/stdc++.h>
using namespace std;

${code}

// JSON printer helpers
string toJson(int v)    { return to_string(v); }
string toJson(bool v)   { return v ? "true" : "false"; }
string toJson(double v) { return to_string(v); }
string toJson(string v) { return "\\"" + v + "\\""; }
string toJson(vector<int> v) {
    string s = "[";
    for(int i=0;i<(int)v.size();i++){if(i)s+=",";s+=to_string(v[i]);}
    return s + "]";
}
string toJson(vector<string> v) {
    string s = "[";
    for(int i=0;i<(int)v.size();i++){if(i)s+=",";s+="\\""+v[i]+"\\""; }
    return s + "]";
}

int main(){
    try {
        auto result = ${fnSig}(${callArgs});
        cout << toJson(result) << endl;
    } catch(exception& e){
        cout << "{\\"__error__\\":\\"" << e.what() << "\\"}" << endl;
    }
    return 0;
}`;

        const src = tmpFile('.cpp');
        const bin = tmpFile('');
        try {
            fs.writeFileSync(src, cppSrc);
            execSafe(`g++ -std=c++17 -O2 -o "${bin}" "${src}"`);
            const out = execSafe(`"${bin}"`).trim();
            let got;
            try { got = JSON.parse(out); } catch (_) { got = out; }
            const isError = got && typeof got === 'object' && got.__error__;
            const expected = parseExpected(tc);
            const pass = !isError && deepEqual(got, expected);
            results.push({ input: tc.input, expected: tc.expectedDisplay, got: isError ? `Error: ${got.__error__}` : JSON.stringify(got), pass, hidden: !!tc.hidden, error: isError ? got.__error__ : null });
        } catch (e) {
            results.push({ input: tc.input, expected: tc.expectedDisplay, got: 'Compile/runtime error', pass: false, hidden: !!tc.hidden, error: (e.stderr || e.message || '').slice(0, 300) });
        } finally {
            try { fs.unlinkSync(src); } catch (_) {}
            try { fs.unlinkSync(bin); } catch (_) {}
        }
    }
    return results;
}

function cppLiteral(val) {
    if (Array.isArray(val)) {
        const inner = val.map(v => cppLiteral(v)).join(', ');
        return typeof val[0] === 'string' ? `vector<string>{${inner}}` : `vector<int>{${inner}}`;
    }
    if (typeof val === 'string')  return `string(${JSON.stringify(val)})`;
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    return String(val);
}

// ── Go runner ─────────────────────────────────────────────────
async function runGo(code, testCases, fnSig) {
    // Check if Go is available
    try { execSafe('go version'); } catch (_) {
        return testCases.map(tc => ({ input: tc.input, expected: tc.expectedDisplay, got: 'Go not installed on server', pass: false, hidden: !!tc.hidden, error: 'Go runtime unavailable' }));
    }

    const results = [];
    for (const tc of testCases) {
        const args = parseArgs(tc);
        const argStr = args.map(a => goLiteral(a)).join(', ');

        const goSrc = `package main
import (
    "encoding/json"
    "fmt"
)

${code}

func main() {
    result := ${fnSig}(${argStr})
    b, _ := json.Marshal(result)
    fmt.Println(string(b))
}`;
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'go_'));
        const src = path.join(dir, 'main.go');
        try {
            fs.writeFileSync(src, goSrc);
            const out = execSafe(`go run "${src}"`);
            let got;
            try { got = JSON.parse(out); } catch (_) { got = out; }
            const isError = got && typeof got === 'object' && got.__error__;
            const expected = parseExpected(tc);
            const pass = !isError && deepEqual(got, expected);
            results.push({ input: tc.input, expected: tc.expectedDisplay, got: isError ? `Error: ${got.__error__}` : JSON.stringify(got), pass, hidden: !!tc.hidden, error: isError ? got.__error__ : null });
        } catch (e) {
            results.push({ input: tc.input, expected: tc.expectedDisplay, got: 'Error', pass: false, hidden: !!tc.hidden, error: (e.stderr || e.message || '').slice(0, 300) });
        } finally {
            try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
        }
    }
    return results;
}

function goLiteral(val) {
    if (Array.isArray(val)) {
        const inner = val.map(v => goLiteral(v)).join(', ');
        return typeof val[0] === 'string' ? `[]string{${inner}}` : `[]int{${inner}}`;
    }
    if (typeof val === 'string')  return JSON.stringify(val);
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    return String(val);
}

// ── Rust runner ───────────────────────────────────────────────
async function runRust(code, testCases, fnSig) {
    try { execSafe('rustc --version'); } catch (_) {
        return testCases.map(tc => ({ input: tc.input, expected: tc.expectedDisplay, got: 'Rust not installed on server', pass: false, hidden: !!tc.hidden, error: 'Rust runtime unavailable' }));
    }

    const results = [];
    for (const tc of testCases) {
        const args = parseArgs(tc);
        const argStr = args.map(a => rustLiteral(a)).join(', ');

        const rustSrc = `
${code}

fn main() {
    let result = ${fnSig}(${argStr});
    println!("{}", serde_json::to_string(&result).unwrap_or_else(|_| format!("{:?}", result)));
}`;
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rust_'));
        const src = path.join(dir, 'main.rs');
        const bin = path.join(dir, 'main');
        try {
            fs.writeFileSync(src, rustSrc);
            execSafe(`rustc "${src}" -o "${bin}" 2>&1`);
            const out = execSafe(`"${bin}"`);
            let got;
            try { got = JSON.parse(out); } catch (_) { got = out; }
            const isError = got && typeof got === 'object' && got.__error__;
            const expected = parseExpected(tc);
            const pass = !isError && deepEqual(got, expected);
            results.push({ input: tc.input, expected: tc.expectedDisplay, got: isError ? `Error: ${got.__error__}` : JSON.stringify(got), pass, hidden: !!tc.hidden, error: isError ? got.__error__ : null });
        } catch (e) {
            results.push({ input: tc.input, expected: tc.expectedDisplay, got: 'Compile/runtime error', pass: false, hidden: !!tc.hidden, error: (e.stderr || e.message || '').slice(0, 300) });
        } finally {
            try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
        }
    }
    return results;
}

function rustLiteral(val) {
    if (Array.isArray(val)) {
        const inner = val.map(v => rustLiteral(v)).join(', ');
        return typeof val[0] === 'string' ? `vec![${inner}]` : `vec![${inner}]`;
    }
    if (typeof val === 'string')  return JSON.stringify(val);
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    return String(val);
}