const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-20250514';

async function callClaude(prompt, maxTokens = 1500) {
    const response = await client.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
    });
    return response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
}

async function parseResumeAndGenerateQuestions({ resumeText, role, expLevel }) {
    const prompt = `You are an expert technical interviewer and resume analyst.

Resume:
"""
${resumeText.slice(0, 4000)}
"""

Target role: ${role}
Experience level: ${expLevel}

Tasks:
1. Extract the top 6-8 skills from this resume most relevant to the role.
2. Extract up to 3 work experiences (title, company, duration).
3. Generate exactly 5 personalized interview questions (mix of behavioral, technical, situational) tailored to this person's background.
4. Write a 1-sentence candidate summary.

Respond ONLY in valid JSON (no markdown, no backticks):
{
  "skills": ["skill1","skill2"],
  "experience": [{"title":"","company":"","duration":""}],
  "questions": [
    {"id":1,"text":"question text","type":"behavioral|technical|situational"}
  ],
  "summary": "one sentence summary"
}`;

    const raw = await callClaude(prompt);
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

async function generateFollowUp({ question, answer, nextQuestion }) {
    const prompt = `You are a professional interviewer conducting a mock interview.

The candidate was asked: "${question}"
Their answer: "${answer}"
The next question to ask is: "${nextQuestion}"

Write a brief 1-2 sentence natural transition: acknowledge their answer warmly (without over-praising), then ask the next question. Keep it conversational and professional. No markdown.`;

    return callClaude(prompt, 300);
}

async function generateClosing(lastAnswer) {
    const prompt = `You are a professional interviewer. The candidate just answered the final question: "${lastAnswer.slice(0, 300)}"

Write a warm 2-sentence closing: thank them genuinely, let them know their evaluation report is being prepared. Keep it brief and professional. No markdown.`;

    return callClaude(prompt, 200);
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

    const raw = await callClaude(prompt, 1500);
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

module.exports = {
    callClaude,
    parseResumeAndGenerateQuestions,
    generateFollowUp,
    generateClosing,
    evaluateInterview,
};