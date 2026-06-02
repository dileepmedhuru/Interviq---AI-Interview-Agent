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

async function parseResumeAndGenerateQuestions({ resumeText, role, expLevel }) {
    const prompt = `You are an interview coach. Generate a structured 3-section interview based on the resume and role below.

Resume:
"""
${resumeText.slice(0, 4000)}
"""
Target role: ${role}
Experience level: ${expLevel}

STRICT REQUIREMENTS:
- Section 1: EXACTLY 5 MCQ questions (section:1, category:"mcq") — multiple choice with 4 options, relevant to role and resume skills
- Section 2: EXACTLY 2 coding questions (section:2, category:"coding") — practical coding tasks matching resume languages
- Section 3: EXACTLY 7 open questions (section:3) — 5 with category:"technical" and 2 with category:"behavioral"

Total: 14 questions. IDs 1-14.

Respond ONLY with valid JSON, no markdown, no backticks, no extra text:
{
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [{"title":"","company":"","duration":""}],
  "summary": "one sentence summary of candidate",
  "questions": [
    {
      "id": 1,
      "section": 1,
      "text": "What is the time complexity of binary search?",
      "type": "technical",
      "category": "mcq",
      "options": ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
      "correctAnswer": 1,
      "language": null,
      "explanation": "Binary search halves the search space each step, giving O(log n)."
    },
    {
      "id": 2,
      "section": 1,
      "text": "Which HTTP method is used to update a resource?",
      "type": "technical",
      "category": "mcq",
      "options": ["GET", "POST", "PUT", "DELETE"],
      "correctAnswer": 2,
      "language": null,
      "explanation": "PUT replaces a resource entirely; PATCH partially updates it."
    },
    {
      "id": 3,
      "section": 1,
      "text": "What does SQL JOIN do?",
      "type": "technical",
      "category": "mcq",
      "options": ["Deletes rows", "Combines rows from two tables", "Creates a new table", "Filters duplicates"],
      "correctAnswer": 1,
      "language": null,
      "explanation": "JOIN combines rows from two or more tables based on a related column."
    },
    {
      "id": 4,
      "section": 1,
      "text": "Which data structure is LIFO?",
      "type": "technical",
      "category": "mcq",
      "options": ["Queue", "Stack", "Heap", "Graph"],
      "correctAnswer": 1,
      "language": null,
      "explanation": "Stack uses Last In First Out order."
    },
    {
      "id": 5,
      "section": 1,
      "text": "What is a closure in programming?",
      "type": "technical",
      "category": "mcq",
      "options": ["A loop construct", "A function with access to its outer scope", "A database connection", "A type of class"],
      "correctAnswer": 1,
      "language": null,
      "explanation": "A closure is a function that remembers variables from the enclosing scope."
    },
    {
      "id": 6,
      "section": 2,
      "text": "Write a function to check if a string is a palindrome.",
      "type": "technical",
      "category": "coding",
      "options": null,
      "correctAnswer": null,
      "language": "python",
      "explanation": null
    },
    {
      "id": 7,
      "section": 2,
      "text": "Write a function to find the two numbers in an array that sum to a target value.",
      "type": "technical",
      "category": "coding",
      "options": null,
      "correctAnswer": null,
      "language": "python",
      "explanation": null
    },
    {
      "id": 8,
      "section": 3,
      "text": "Explain how you would design a RESTful API for a user authentication system.",
      "type": "technical",
      "category": "technical",
      "options": null,
      "correctAnswer": null,
      "language": null,
      "explanation": null
    },
    {
      "id": 9,
      "section": 3,
      "text": "What is the difference between SQL and NoSQL databases? When would you choose each?",
      "type": "technical",
      "category": "technical",
      "options": null,
      "correctAnswer": null,
      "language": null,
      "explanation": null
    },
    {
      "id": 10,
      "section": 3,
      "text": "How do you handle errors and exceptions in production code?",
      "type": "technical",
      "category": "technical",
      "options": null,
      "correctAnswer": null,
      "language": null,
      "explanation": null
    },
    {
      "id": 11,
      "section": 3,
      "text": "Explain the concept of database indexing and when to use it.",
      "type": "technical",
      "category": "technical",
      "options": null,
      "correctAnswer": null,
      "language": null,
      "explanation": null
    },
    {
      "id": 12,
      "section": 3,
      "text": "How do you approach performance optimization in a web application?",
      "type": "technical",
      "category": "technical",
      "options": null,
      "correctAnswer": null,
      "language": null,
      "explanation": null
    },
    {
      "id": 13,
      "section": 3,
      "text": "Tell me about a challenging technical problem you solved. What was your approach?",
      "type": "behavioral",
      "category": "behavioral",
      "options": null,
      "correctAnswer": null,
      "language": null,
      "explanation": null
    },
    {
      "id": 14,
      "section": 3,
      "text": "Describe a time you had a disagreement with a teammate. How did you resolve it?",
      "type": "behavioral",
      "category": "behavioral",
      "options": null,
      "correctAnswer": null,
      "language": null,
      "explanation": null
    }
  ]
}

Now generate the actual questions tailored to the resume and role above. Keep the exact same JSON structure but make questions specific to the candidate's skills and the target role.`;

    const raw = await callAI(prompt, 3500);
    let parsed;
    try {
        parsed = JSON.parse(raw.replace(/```json\n?|```\n?/g, '').trim());
    } catch (e) {
        // Try to extract JSON from response
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
            parsed = JSON.parse(match[0]);
        } else {
            throw new Error('AI returned invalid JSON: ' + e.message);
        }
    }

    // Ensure all questions have required fields with fallbacks
    if (parsed.questions && Array.isArray(parsed.questions)) {
        parsed.questions = parsed.questions.map((q, i) => ({
            id:            q.id || i + 1,
            section:       q.section || (i < 5 ? 1 : i < 7 ? 2 : 3),
            text:          q.text || 'Question unavailable',
            type:          q.type || 'technical',
            category:      q.category || (i < 5 ? 'mcq' : i < 7 ? 'coding' : 'technical'),
            options:       q.options || null,
            correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : null,
            language:      q.language || null,
            explanation:   q.explanation || null,
        }));
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
            feedback: [{ type: 'improve', text: 'Most questions were skipped. Try answering more questions next time.' }],
            recommendations: ['Attempt all questions for a better evaluation.'],
            summary: 'The interview was mostly skipped. No detailed evaluation available.',
            strengths: ['Completed the interview process'],
            areasToImprove: ['Answer more questions for meaningful feedback'],
        };
    }

    const prompt = `You are an encouraging interview evaluator for a ${role} position (${expLevel} level).

Questions and answers:
${qa}

Respond ONLY in valid JSON (no markdown, no backticks):
{
  "overall": 7,
  "relevance": 8,
  "clarity": 7,
  "depth": 6,
  "feedback": [
    {"type": "good", "text": "specific strength observed"},
    {"type": "improve", "text": "specific area to improve"}
  ],
  "recommendations": ["actionable tip 1", "actionable tip 2", "actionable tip 3"],
  "summary": "2-sentence encouraging summary of performance",
  "strengths": ["strength 1", "strength 2"],
  "areasToImprove": ["area 1", "area 2"]
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