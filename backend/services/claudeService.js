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
    const prompt = `You are an interview coach generating a structured 3-section interview.

Resume:
"""
${resumeText.slice(0, 4000)}
"""
Target role: ${role}
Experience level: ${expLevel}

Generate EXACTLY this structure:
- Section 1: 5 MCQ questions (basic/intermediate concepts relevant to role and resume skills, 4 options each)
- Section 2: 2 Coding questions (practical coding tasks from languages/skills in resume)
- Section 3 (Video): 5 technical questions + 2 behavioral questions = 7 total open-ended questions

DIFFICULTY: Match to ${expLevel} level. Be encouraging but realistic. Make questions specific to the resume skills.

Respond ONLY in valid JSON (no markdown, no backticks):
{
  "skills": ["skill1", "skill2"],
  "experience": [{"title":"","company":"","duration":""}],
  "summary": "one sentence summary",
  "questions": [
    {"id":1,"section":1,"text":"What does the async keyword do in JavaScript?","type":"technical","category":"mcq","options":["Makes function return Promise","Pauses execution forever","Creates a new thread","Blocks the event loop"],"correctAnswer":0,"language":null,"explanation":"async functions always return a Promise"},
    {"id":2,"section":1,"text":"Which data structure uses LIFO order?","type":"technical","category":"mcq","options":["Queue","Stack","Linked List","Tree"],"correctAnswer":1,"language":null,"explanation":"Stack uses Last In First Out"},
    {"id":3,"section":1,"text":"What is O(n log n) complexity called?","type":"technical","category":"mcq","options":["Linear","Quadratic","Linearithmic","Constant"],"correctAnswer":2,"language":null,"explanation":"O(n log n) is linearithmic, common in efficient sorting"},
    {"id":4,"section":1,"text":"REST stands for?","type":"technical","category":"mcq","options":["Remote Execution State Transfer","Representational State Transfer","Remote State Transfer","Representational System Transfer"],"correctAnswer":1,"language":null,"explanation":"REST = Representational State Transfer"},
    {"id":5,"section":1,"text":"Which HTTP method is idempotent?","type":"technical","category":"mcq","options":["POST","PATCH","PUT","None of these"],"correctAnswer":2,"language":null,"explanation":"PUT is idempotent - same request always gives same result"},
    {"id":6,"section":2,"text":"Write a function to reverse a string without using built-in reverse methods","type":"technical","category":"coding","options":null,"correctAnswer":null,"language":"python","explanation":null},
    {"id":7,"section":2,"text":"Write a function to find the factorial of a number using recursion","type":"technical","category":"coding","options":null,"correctAnswer":null,"language":"python","explanation":null},
    {"id":8,"section":3,"text":"Explain the concept of database indexing and when you would use it","type":"technical","category":"open","options":null,"correctAnswer":null,"language":null,"explanation":null},
    {"id":9,"section":3,"text":"What is the difference between synchronous and asynchronous programming?","type":"technical","category":"open","options":null,"correctAnswer":null,"language":null,"explanation":null},
    {"id":10,"section":3,"text":"Describe how you would design a RESTful API for a social media app","type":"technical","category":"open","options":null,"correctAnswer":null,"language":null,"explanation":null},
    {"id":11,"section":3,"text":"How do you handle errors and exceptions in your code?","type":"technical","category":"open","options":null,"correctAnswer":null,"language":null,"explanation":null},
    {"id":12,"section":3,"text":"Explain the difference between SQL and NoSQL databases","type":"technical","category":"open","options":null,"correctAnswer":null,"language":null,"explanation":null},
    {"id":13,"section":3,"text":"Tell me about a challenging technical problem you solved and how you approached it","type":"behavioral","category":"behavioral","options":null,"correctAnswer":null,"language":null,"explanation":null},
    {"id":14,"section":3,"text":"Describe a time when you had to work with a difficult team member. How did you handle it?","type":"behavioral","category":"behavioral","options":null,"correctAnswer":null,"language":null,"explanation":null}
  ]
}`;

    const raw = await callAI(prompt, 3000);
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