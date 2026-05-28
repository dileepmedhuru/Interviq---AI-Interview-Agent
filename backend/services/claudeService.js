const Groq = require('groq-sdk');

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

async function callAI(prompt, maxTokens = 1500) {
    const response = await client.chat.completions.create({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
    });
    return response.choices[0].message.content;
}

async function parseResumeAndGenerateQuestions({ resumeText, role, expLevel }) {
    const prompt = `You are a friendly and encouraging interview coach helping a beginner build confidence.

Resume:
"""
${resumeText.slice(0, 4000)}
"""

Target role: ${role}
Experience level: ${expLevel}

Generate exactly 6 interview questions following these STRICT rules:
1. Questions must be BASIC and confidence-building, not intimidating
2. One question from each programming language mentioned in resume (e.g. Python basics, C basics)
3. One simple coding question (e.g. write a function, basic algorithm) from their strongest language
4. Two questions about their actual projects (simple, what they built and why)
5. One soft skill question (simple, about teamwork or learning)
6. Avoid deep system design, distributed systems, or advanced architecture questions
7. Frame questions positively and encouragingly

BAD example: "How would you design a distributed system?"
GOOD example: "Can you explain what Flask does and how you used it in your project?"

BAD example: "Describe scalable image processing architecture"  
GOOD example: "Walk me through how your handwriting recognition project works in simple terms"

Respond ONLY in valid JSON (no markdown, no backticks):
{
  "skills": ["skill1","skill2"],
  "experience": [{"title":"","company":"","duration":""}],
  "questions": [
    {"id":1,"text":"question text","type":"technical","category":"python"},
    {"id":2,"text":"question text","type":"technical","category":"coding"},
    {"id":3,"text":"question text","type":"technical","category":"project"},
    {"id":4,"text":"question text","type":"technical","category":"project"},
    {"id":5,"text":"question text","type":"behavioral","category":"softskill"},
    {"id":6,"text":"question text","type":"technical","category":"basics"}
  ],
  "summary": "one sentence summary"
}`;

    const raw = await callAI(prompt);
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

async function generateFollowUp({ question, answer, nextQuestion }) {
    const prompt = `You are a professional interviewer conducting a mock interview.

The candidate was asked: "${question}"
Their answer: "${answer}"
The next question to ask is: "${nextQuestion}"

Write a brief 1-2 sentence natural transition: acknowledge their answer warmly (without over-praising), then ask the next question. Keep it conversational and professional. No markdown.`;

    return callAI(prompt, 300);
}

async function generateClosing(lastAnswer) {
    const prompt = `You are a professional interviewer. The candidate just answered the final question: "${lastAnswer.slice(0, 300)}"

Write a warm 2-sentence closing: thank them genuinely, let them know their evaluation report is being prepared. Keep it brief and professional. No markdown.`;

    return callAI(prompt, 200);
}

async function evaluateInterview({ answers, role, expLevel }) {
    const qa = answers
        .map((a, i) => `Q${i + 1}: ${a.question}\nAnswer: ${a.answer}`)
        .join('\n\n');

    const prompt = `You are an expert interview evaluator. Evaluate these interview responses for a ${role} position (${expLevel} level).

${qa}

Score each dimension from 1-10 and provide detailed feedback.
Respond ONLY in valid JSON (no markdown, no backticks):
{
  "overall": 7,
  "relevance": 8,
  "clarity": 7,
  "depth": 6,
  "feedback": [
    {"type":"good","text":"specific strength observed"},
    {"type":"improve","text":"specific area to improve"},
    {"type":"bad","text":"significant gap if any"}
  ],
  "recommendations": [
    "Actionable improvement tip 1",
    "Actionable improvement tip 2",
    "Actionable improvement tip 3"
  ],
  "summary": "2-sentence overall evaluation summary",
  "strengths": ["strength 1","strength 2"],
  "areasToImprove": ["area 1","area 2"]
}`;

    const raw = await callAI(prompt, 1500);
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

module.exports = {
    callClaude: callAI,
    parseResumeAndGenerateQuestions,
    generateFollowUp,
    generateClosing,
    evaluateInterview,
};