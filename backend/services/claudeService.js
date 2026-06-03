const Groq = require('groq-sdk');
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL  = 'llama-3.3-70b-versatile';

async function callAI(prompt, maxTokens = 1500) {
    const response = await client.chat.completions.create({
        model: MODEL, max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
    });
    return response.choices[0].message.content;
}

// ─── Hardcoded well-known problem banks keyed by common algorithm topics ────────
// Used as fallback when AI doesn't generate good test cases
const PROBLEM_BANK = {
    maxSubarray: {
        functionSignature: 'maxSubarray',
        starterCode: 'function maxSubarray(nums) {\n  // your code here\n}',
        testCases: [
            { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', inputCode: '[[-2,1,-3,4,-1,2,1,-5,4]]', expected: '6', expectedDisplay: '6', hidden: false },
            { input: 'nums = [1]', inputCode: '[[1]]', expected: '1', expectedDisplay: '1', hidden: false },
            { input: 'nums = [5,4,-1,7,8]', inputCode: '[[5,4,-1,7,8]]', expected: '23', expectedDisplay: '23', hidden: true },
            { input: 'nums = [-1,-2,-3]', inputCode: '[[-1,-2,-3]]', expected: '-1', expectedDisplay: '-1', hidden: true },
        ],
    },
    twoSum: {
        functionSignature: 'twoSum',
        starterCode: 'function twoSum(nums, target) {\n  // your code here\n}',
        testCases: [
            { input: 'nums = [2,7,11,15], target = 9', inputCode: '[[2,7,11,15], 9]', expected: '[0,1]', expectedDisplay: '[0, 1]', hidden: false },
            { input: 'nums = [3,2,4], target = 6', inputCode: '[[3,2,4], 6]', expected: '[1,2]', expectedDisplay: '[1, 2]', hidden: false },
            { input: 'nums = [3,3], target = 6', inputCode: '[[3,3], 6]', expected: '[0,1]', expectedDisplay: '[0, 1]', hidden: true },
        ],
    },
    reverseString: {
        functionSignature: 'reverseString',
        starterCode: 'function reverseString(s) {\n  // your code here\n}',
        testCases: [
            { input: 's = "hello"', inputCode: '["hello"]', expected: '"olleh"', expectedDisplay: '"olleh"', hidden: false },
            { input: 's = "Hannah"', inputCode: '["Hannah"]', expected: '"hannaH"', expectedDisplay: '"hannaH"', hidden: false },
            { input: 's = "racecar"', inputCode: '["racecar"]', expected: '"racecar"', expectedDisplay: '"racecar"', hidden: true },
        ],
    },
    fibonacci: {
        functionSignature: 'fibonacci',
        starterCode: 'function fibonacci(n) {\n  // your code here\n}',
        testCases: [
            { input: 'n = 5', inputCode: '[5]', expected: '5', expectedDisplay: '5', hidden: false },
            { input: 'n = 10', inputCode: '[10]', expected: '55', expectedDisplay: '55', hidden: false },
            { input: 'n = 0', inputCode: '[0]', expected: '0', expectedDisplay: '0', hidden: true },
            { input: 'n = 1', inputCode: '[1]', expected: '1', expectedDisplay: '1', hidden: true },
        ],
    },
    isPalindrome: {
        functionSignature: 'isPalindrome',
        starterCode: 'function isPalindrome(s) {\n  // your code here\n}',
        testCases: [
            { input: 's = "racecar"', inputCode: '["racecar"]', expected: 'true', expectedDisplay: 'true', hidden: false },
            { input: 's = "hello"', inputCode: '["hello"]', expected: 'false', expectedDisplay: 'false', hidden: false },
            { input: 's = "A man a plan a canal Panama"', inputCode: '["amanaplanacanalpanama"]', expected: 'true', expectedDisplay: 'true', hidden: true },
        ],
    },
    factorial: {
        functionSignature: 'factorial',
        starterCode: 'function factorial(n) {\n  // your code here\n}',
        testCases: [
            { input: 'n = 5', inputCode: '[5]', expected: '120', expectedDisplay: '120', hidden: false },
            { input: 'n = 0', inputCode: '[0]', expected: '1', expectedDisplay: '1', hidden: false },
            { input: 'n = 7', inputCode: '[7]', expected: '5040', expectedDisplay: '5040', hidden: true },
        ],
    },
    binarySearch: {
        functionSignature: 'binarySearch',
        starterCode: 'function binarySearch(nums, target) {\n  // your code here\n  // return index, or -1 if not found\n}',
        testCases: [
            { input: 'nums = [-1,0,3,5,9,12], target = 9', inputCode: '[[-1,0,3,5,9,12], 9]', expected: '4', expectedDisplay: '4', hidden: false },
            { input: 'nums = [-1,0,3,5,9,12], target = 2', inputCode: '[[-1,0,3,5,9,12], 2]', expected: '-1', expectedDisplay: '-1', hidden: false },
            { input: 'nums = [1], target = 1', inputCode: '[[1], 1]', expected: '0', expectedDisplay: '0', hidden: true },
        ],
    },
};

// ─── Match AI question text to a known problem to get reliable test cases ────────
function matchProblemBank(text, fnSig) {
    const t = (text + ' ' + (fnSig || '')).toLowerCase();
    if (t.includes('maximum sum') || t.includes('max subarray') || t.includes('kadane')) return PROBLEM_BANK.maxSubarray;
    if (t.includes('two sum') || t.includes('twosum') || t.includes('add up to target') || t.includes('two numbers')) return PROBLEM_BANK.twoSum;
    if (t.includes('reverse') && (t.includes('string') || t.includes('str'))) return PROBLEM_BANK.reverseString;
    if (t.includes('fibonacci') || t.includes('fib sequence')) return PROBLEM_BANK.fibonacci;
    if (t.includes('palindrome')) return PROBLEM_BANK.isPalindrome;
    if (t.includes('factorial')) return PROBLEM_BANK.factorial;
    if (t.includes('binary search') || t.includes('binarysearch')) return PROBLEM_BANK.binarySearch;
    return null;
}

// ─── Ask AI to generate ONLY test cases for a given problem ──────────────────────
async function generateTestCasesForProblem(questionText, fnSig, lang) {
    const prompt = `Generate test cases for this coding problem as JSON only (no markdown, no explanation):

Problem: "${questionText}"
Function name: ${fnSig || 'solution'}
Language: ${lang || 'javascript'}

Respond with ONLY a JSON array of exactly 4 test cases. No other text.
First 2 have "hidden": false. Last 2 have "hidden": true.
Each object must have these exact keys:
- "input": human-readable string like "nums = [1,2,3], target = 5"
- "inputCode": JSON array of JS arguments like "[[1,2,3], 5]"
- "expected": the expected return value as a JS literal string like "2" or "[0,1]" or "true"
- "expectedDisplay": same as expected but formatted for display
- "hidden": boolean

Example response format:
[
  {"input":"nums = [2,7,11,15], target = 9","inputCode":"[[2,7,11,15],9]","expected":"[0,1]","expectedDisplay":"[0, 1]","hidden":false},
  {"input":"nums = [3,2,4], target = 6","inputCode":"[[3,2,4],6]","expected":"[1,2]","expectedDisplay":"[1, 2]","hidden":false},
  {"input":"nums = [3,3], target = 6","inputCode":"[[3,3],6]","expected":"[0,1]","expectedDisplay":"[0, 1]","hidden":true},
  {"input":"nums = [1,5,3,7], target = 8","inputCode":"[[1,5,3,7],8]","expected":"[1,3]","expectedDisplay":"[1, 3]","hidden":true}
]

Now generate 4 test cases for the problem above. Return ONLY the JSON array.`;

    try {
        const raw = await callAI(prompt, 800);
        const clean = raw.replace(/```json\n?|```\n?/g, '').trim();
        // Find the array in the response
        const match = clean.match(/\[[\s\S]*\]/);
        if (!match) return null;
        const cases = JSON.parse(match[0]);
        if (!Array.isArray(cases) || cases.length === 0) return null;
        // Validate each case has the required fields
        const valid = cases.filter(c => c.input && c.expected !== undefined);
        if (valid.length < 2) return null;
        // Ensure first 2 are visible, rest hidden
        return valid.map((c, i) => ({ ...c, hidden: i >= 2 }));
    } catch (e) {
        return null;
    }
}

async function parseResumeAndGenerateQuestions({ resumeText, role, expLevel }) {
    const prompt = `You are an interview coach. Generate a structured 3-section interview.

Resume:
"""
${resumeText.slice(0, 4000)}
"""
Target role: ${role}
Experience level: ${expLevel}

REQUIREMENTS:
- Section 1: EXACTLY 5 MCQ questions (section:1, category:"mcq")
- Section 2: EXACTLY 2 coding questions (section:2, category:"coding") — classic algorithmic problems (like LeetCode Easy/Medium). Must include testCases.
- Section 3: EXACTLY 7 open questions (section:3) — 5 technical + 2 behavioral

Total: 14 questions. IDs 1-14.

CODING QUESTIONS — critical rules:
1. Pick well-known algorithmic problems: Two Sum, Maximum Subarray, Valid Parentheses, Reverse String, Fibonacci, Binary Search, FizzBuzz, Palindrome Check, Factorial, Count Vowels, etc.
2. functionSignature: camelCase JS function name, e.g. "maxSubarray"
3. starterCode: minimal JS function stub with empty body
4. testCases: REQUIRED array of EXACTLY 4 objects. First 2 have hidden:false, last 2 have hidden:true.
   Each testCase object: { "input": "human readable", "inputCode": "JSON array of args", "expected": "JS literal", "expectedDisplay": "readable output", "hidden": bool }
   Example for maxSubarray:
   [
     {"input":"nums = [-2,1,-3,4,-1,2,1,-5,4]","inputCode":"[[-2,1,-3,4,-1,2,1,-5,4]]","expected":"6","expectedDisplay":"6","hidden":false},
     {"input":"nums = [1]","inputCode":"[[1]]","expected":"1","expectedDisplay":"1","hidden":false},
     {"input":"nums = [5,4,-1,7,8]","inputCode":"[[5,4,-1,7,8]]","expected":"23","expectedDisplay":"23","hidden":true},
     {"input":"nums = [-1,-2,-3]","inputCode":"[[-1,-2,-3]]","expected":"-1","expectedDisplay":"-1","hidden":true}
   ]

Respond ONLY with valid JSON, no markdown, no backticks:
{
  "skills": ["skill1", "skill2"],
  "experience": [{"title":"","company":"","duration":""}],
  "summary": "one sentence",
  "questions": [
    {"id":1,"section":1,"text":"...","type":"technical","category":"mcq","options":["A","B","C","D"],"correctAnswer":0,"language":null,"explanation":"...","functionSignature":null,"starterCode":null,"testCases":null},
    {"id":6,"section":2,"text":"Given an array of integers, find the maximum sum of a contiguous subarray.","type":"technical","category":"coding","options":null,"correctAnswer":null,"language":"javascript","explanation":"Kadane's algorithm runs in O(n).","functionSignature":"maxSubarray","starterCode":"function maxSubarray(nums) {\\n  // your code here\\n}","testCases":[{"input":"nums = [-2,1,-3,4,-1,2,1,-5,4]","inputCode":"[[-2,1,-3,4,-1,2,1,-5,4]]","expected":"6","expectedDisplay":"6","hidden":false},{"input":"nums = [1]","inputCode":"[[1]]","expected":"1","expectedDisplay":"1","hidden":false},{"input":"nums = [5,4,-1,7,8]","inputCode":"[[5,4,-1,7,8]]","expected":"23","expectedDisplay":"23","hidden":true},{"input":"nums = [-1,-2,-3]","inputCode":"[[-1,-2,-3]]","expected":"-1","expectedDisplay":"-1","hidden":true}]},
    {"id":8,"section":3,"text":"...","type":"technical","category":"technical","options":null,"correctAnswer":null,"language":null,"explanation":null,"functionSignature":null,"starterCode":null,"testCases":null},
    {"id":13,"section":3,"text":"...","type":"behavioral","category":"behavioral","options":null,"correctAnswer":null,"language":null,"explanation":null,"functionSignature":null,"starterCode":null,"testCases":null}
  ]
}

Generate ALL 14 questions. For coding questions, testCases is MANDATORY — never null, never empty.`;

    const raw = await callAI(prompt, 4500);
    let parsed;
    try {
        parsed = JSON.parse(raw.replace(/```json\n?|```\n?/g, '').trim());
    } catch (e) {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
            try { parsed = JSON.parse(match[0]); }
            catch (e2) { throw new Error('AI returned invalid JSON: ' + e2.message); }
        } else {
            throw new Error('AI returned invalid JSON: ' + e.message);
        }
    }

    if (parsed.questions && Array.isArray(parsed.questions)) {
        // Process in parallel — fix coding questions that have bad/missing testCases
        const fixJobs = parsed.questions.map(async (q, i) => {
            let section = Number(q.section);
            if (!section || isNaN(section)) {
                if (i < 5)      section = 1;
                else if (i < 7) section = 2;
                else            section = 3;
            }
            let category = q.category;
            if (!category) {
                if (section === 1) category = 'mcq';
                else if (section === 2) category = 'coding';
                else if (q.type === 'behavioral') category = 'behavioral';
                else category = 'technical';
            }
            let type = q.type || (category === 'behavioral' ? 'behavioral' : 'technical');

            let testCases = q.testCases || null;
            let fnSig = q.functionSignature || null;
            let starterCode = q.starterCode || null;

            if (category === 'coding') {
                const needsFixing = !testCases || !Array.isArray(testCases) || testCases.length < 2
                    || testCases.every(tc => !tc.input || tc.input.includes('sample'));

                if (needsFixing) {
                    // 1. Try matching known problem bank
                    const known = matchProblemBank(q.text || '', fnSig);
                    if (known) {
                        testCases = known.testCases;
                        if (!fnSig) fnSig = known.functionSignature;
                        if (!starterCode) starterCode = known.starterCode;
                    } else {
                        // 2. Ask AI specifically for test cases
                        const aiCases = await generateTestCasesForProblem(q.text || '', fnSig, q.language);
                        if (aiCases) {
                            testCases = aiCases;
                        } else {
                            // 3. Last resort: placeholder with "verify manually" 
                            testCases = [
                                { input: 'see problem description', inputCode: '[]', expected: 'null', expectedDisplay: 'check manually', hidden: false },
                                { input: 'edge case', inputCode: '[]', expected: 'null', expectedDisplay: 'check manually', hidden: false },
                            ];
                        }
                    }
                } else {
                    // Ensure first 2 are visible, rest hidden
                    testCases = testCases.map((tc, idx) => ({
                        input:           tc.input || `Test ${idx + 1}`,
                        inputCode:       tc.inputCode || '[]',
                        expected:        String(tc.expected ?? 'null'),
                        expectedDisplay: tc.expectedDisplay || String(tc.expected ?? '?'),
                        hidden:          idx >= 2,
                    }));
                }

                if (!starterCode && fnSig) {
                    starterCode = `function ${fnSig}() {\n  // your code here\n}`;
                }
                if (!fnSig) fnSig = 'solution';
            }

            return {
                id:                q.id ?? (i + 1),
                section,
                text:              q.text || 'Question unavailable',
                type,
                category,
                options:           Array.isArray(q.options) ? q.options : null,
                correctAnswer:     typeof q.correctAnswer === 'number' ? q.correctAnswer : null,
                language:          q.language || (category === 'coding' ? 'javascript' : null),
                explanation:       q.explanation || null,
                functionSignature: fnSig,
                starterCode,
                testCases,
            };
        });

        parsed.questions = await Promise.all(fixJobs);
    }

    return parsed;
}

async function generateFollowUp({ question, answer, nextQuestion }) {
    const prompt = `You are a warm encouraging interviewer.
Asked: "${question}" | Answer: "${answer}" | Next question: "${nextQuestion}"
Write 1-2 sentences: briefly acknowledge their answer positively then transition to the next question. No markdown.`;
    return callAI(prompt, 300);
}

async function generateClosing(lastAnswer) {
    const prompt = `Interviewer closing after: "${lastAnswer.slice(0, 300)}"
Write 2 warm encouraging sentences thanking them for completing the interview. No markdown.`;
    return callAI(prompt, 200);
}

async function evaluateInterview({ answers, role, expLevel }) {
    const qa = answers
        .filter(a => a.answer && a.answer !== '[Skipped]')
        .map((a, i) => `Q${i+1}: ${a.question}\nAnswer: ${a.answer}`)
        .join('\n\n');

    if (!qa.trim()) {
        return {
            overall: 5, relevance: 5, clarity: 5, depth: 5,
            feedback: [{ type: 'improve', text: 'Most questions were skipped.' }],
            recommendations: ['Attempt all questions for a better evaluation.'],
            summary: 'The interview was mostly skipped.',
            strengths: ['Completed the interview process'],
            areasToImprove: ['Answer more questions for meaningful feedback'],
        };
    }

    const prompt = `You are an encouraging interview evaluator for a ${role} position (${expLevel} level).

Questions and answers:
${qa}

Respond ONLY in valid JSON (no markdown, no backticks):
{
  "overall": 7, "relevance": 8, "clarity": 7, "depth": 6,
  "feedback": [{"type":"good","text":"..."},{"type":"improve","text":"..."}],
  "recommendations": ["tip 1","tip 2","tip 3"],
  "summary": "2-sentence encouraging summary",
  "strengths": ["strength 1","strength 2"],
  "areasToImprove": ["area 1","area 2"]
}`;

    const raw = await callAI(prompt, 1500);
    try {
        return JSON.parse(raw.replace(/```json\n?|```\n?/g, '').trim());
    } catch (e) {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error('AI returned invalid JSON for evaluation');
    }
}

module.exports = {
    callClaude: callAI,
    parseResumeAndGenerateQuestions,
    generateFollowUp,
    generateClosing,
    evaluateInterview,
};