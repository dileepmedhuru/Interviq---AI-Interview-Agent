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
    const prompt = `You are a friendly interview coach helping a BEGINNER build confidence.

Resume:
"""
${resumeText.slice(0, 4000)}
"""
Target role: ${role}
Experience level: ${expLevel}

Generate exactly 11 interview questions:
- 4 MCQ questions (basic concept, 4 options each)
- 2 coding questions (simple, from languages in resume)
- 2 project questions (about their actual projects)
- 1 behavioral question
- 2 basic technical question (about skills in resume)

DIFFICULTY: Basic level only. Build confidence.
BAD: "Design distributed systems"
GOOD: "Write a simple Python function that adds two numbers"

Respond ONLY in valid JSON (no markdown, no backticks):
{
  "skills": ["skill1"],
  "experience": [{"title":"","company":"","duration":""}],
  "questions": [
    {"id":1,"text":"What is a variable in Python?","type":"technical","category":"mcq","options":["A storage location","A function","A loop","A class"],"correctAnswer":0,"language":null},
    {"id":2,"text":"Write a Python function to find the maximum of two numbers","type":"technical","category":"coding","options":null,"correctAnswer":null,"language":"python"},
    {"id":3,"text":"Tell me about your project","type":"technical","category":"open","options":null,"correctAnswer":null,"language":null}
  ],
  "summary": "one sentence summary"
}`;

    const raw = await callAI(prompt, 2000);
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

async function generateFollowUp({ question, answer, nextQuestion }) {
    const prompt = `You are a warm encouraging interviewer for a beginner.
Asked: "${question}" | Answer: "${answer}" | Next: "${nextQuestion}"
Write 1-2 sentences: acknowledge positively then transition. No markdown.`;
    return callAI(prompt, 300);
}

async function generateClosing(lastAnswer) {
    const prompt = `Interviewer closing after: "${lastAnswer.slice(0, 300)}"
Write 2 warm encouraging sentences thanking them. No markdown.`;
    return callAI(prompt, 200);
}

async function evaluateInterview({ answers, role, expLevel }) {
    const qa = answers.map((a, i) => `Q${i+1}: ${a.question}\nAnswer: ${a.answer}`).join('\n\n');
    const prompt = `Encouraging interview evaluator for ${role} (${expLevel} level).
${qa}
Respond ONLY in valid JSON (no markdown):
{"overall":7,"relevance":8,"clarity":7,"depth":6,"feedback":[{"type":"good","text":"strength"},{"type":"improve","text":"area"}],"recommendations":["tip1","tip2","tip3"],"summary":"2-sentence encouraging summary","strengths":["s1","s2"],"areasToImprove":["a1","a2"]}`;
    const raw = await callAI(prompt, 1500);
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

module.exports = { callClaude: callAI, parseResumeAndGenerateQuestions, generateFollowUp, generateClosing, evaluateInterview };