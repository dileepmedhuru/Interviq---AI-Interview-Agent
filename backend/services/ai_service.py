import os
import json
import random
from groq import Groq
from backend.services.problem_bank import PROBLEM_BANK, EASY_KEYS, MEDIUM_KEYS, ALL_KEYS
from backend.config.constants import SECTION_MARKS, GRAND_TOTAL_MARKS

# Initialize Groq client
# We read the GROQ_API_KEY from environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = None
if GROQ_API_KEY:
    client = Groq(api_key=GROQ_API_KEY)

MODEL = "llama-3.3-70b-versatile"

def call_ai(prompt: str, max_tokens: int = 1500) -> str:
    global client
    if not client:
        # Re-try reading from env in case it was set later
        api_key = os.getenv("GROQ_API_KEY")
        if api_key:
            client = Groq(api_key=api_key)
        else:
            raise Exception("GROQ_API_KEY environment variable is not set")
            
    response = client.chat.completions.create(
        model=MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7
    )
    return response.choices[0].message.content

_recently_used = set()

def pick_problems_for_session(exp_level: str = 'mid') -> list:
    global _recently_used
    
    if exp_level == 'entry':
        pool1 = EASY_KEYS
        pool2 = EASY_KEYS
    elif exp_level == 'mid':
        pool1 = EASY_KEYS
        pool2 = ALL_KEYS
    else:
        pool1 = ALL_KEYS
        pool2 = MEDIUM_KEYS

    def pick(pool, exclude=[]):
        exclude_set = _recently_used.union(set(exclude))
        avail = [k for k in pool if k not in exclude_set]
        src = avail if avail else [k for k in pool if k not in exclude]
        return random.choice(src)

    key1 = pick(pool1)
    _recently_used.add(key1)
    key2 = pick(pool2, [key1])
    _recently_used.add(key2)

    if len(_recently_used) > int(len(ALL_KEYS) * 0.5):
        _recently_used.clear()

    # Get details
    p1 = PROBLEM_BANK[key1].copy()
    p1['key'] = key1
    p2 = PROBLEM_BANK[key2].copy()
    p2['key'] = key2
    return [p1, p2]

def parse_resume_and_generate_questions(resume_text: str, role: str, exp_level: str = 'mid') -> dict:
    coding_q1, coding_q2 = pick_problems_for_session(exp_level)
    
    prompt = f"""You are an interview coach. Generate a structured 3-section interview setup based on the resume.

Resume:
\"\"\"
{resume_text[:3500]}
\"\"\"
Target role: {role}
Experience level: {exp_level or 'mid'}

REQUIREMENTS:
- Section 1: EXACTLY 8 MCQ questions (section:1, category:"mcq") -- test conceptual knowledge relevant to the role. Include "options" array, "correctAnswer" index (0-3), and "explanation".
- Section 2: EXACTLY 2 coding questions -- ALREADY PROVIDED BELOW, copy them verbatim as JSON.
- Section 3: EXACTLY 1 initial technical question (section:3, category:"technical", id:11, difficulty:"medium") -- chosen based on their resume skills to start the adaptive verbal interview.

Total: 11 questions. IDs 1-11.

CODING QUESTIONS (section 2) -- copy these EXACTLY into your JSON output, do NOT modify them:
Q9:  id=9,  section=2, category="coding", title="{coding_q1['title']}", difficulty="{coding_q1['difficulty']}", text="{coding_q1['description'].replace('"', "'")}"
Q10: id=10, section=2, category="coding", title="{coding_q2['title']}", difficulty="{coding_q2['difficulty']}", text="{coding_q2['description'].replace('"', "'")}"

Respond ONLY with valid JSON, no markdown, no backticks:
{{
  "skills": ["skill1","skill2"],
  "experience": [{{"title":"","company":"","duration":""}}],
  "summary": "one sentence summarizing candidate profile",
  "questions": [
    {{"id":1,"section":1,"text":"...","type":"technical","category":"mcq","options":["A","B","C","D"],"correctAnswer":0,"explanation":"..."}},
    ...8 MCQ questions with IDs 1-8...,
    {{"id":9,"section":2,"category":"coding","title":"{coding_q1['title']}","difficulty":"{coding_q1['difficulty']}","text":"copy the title here"}},
    {{"id":10,"section":2,"category":"coding","title":"{coding_q2['title']}","difficulty":"{coding_q2['difficulty']}","text":"copy the title here"}},
    {{"id":11,"section":3,"type":"technical","category":"technical","text":"The initial technical question...","skill":"Name of the skill tested"}}
  ]
}}
"""
    raw = call_ai(prompt, 4000)
    cleaned = raw.replace("```json", "").replace("```", "").strip()
    
    # Try parsing
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as e:
        # Fallback to regex find first { and last }
        import re
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if match:
            try:
                parsed = json.loads(match.group(0))
            except Exception as e2:
                raise Exception(f"AI returned invalid JSON: {e2}")
        else:
            raise Exception(f"AI returned invalid JSON: {e}")

    # Validate and inject coding questions
    if "questions" in parsed and isinstance(parsed["questions"], list):
        coding_slot = 0
        normalized_qs = []
        for i, q in enumerate(parsed["questions"]):
            section = int(q.get("section", 1))
            if i < 8:
                section = 1
            elif i < 10:
                section = 2
            else:
                section = 3

            category = q.get("category")
            if not category:
                if section == 1:
                    category = "mcq"
                elif section == 2:
                    category = "coding"
                else:
                    category = "technical"

            if section == 2:
                src = coding_q1 if coding_slot == 0 else coding_q2
                coding_slot += 1
                q_item = {
                    "id": q.get("id", i + 1),
                    "section": 2,
                    "text": src["description"],
                    "type": "technical",
                    "category": "coding",
                    "options": None,
                    "correctAnswer": None,
                    "language": None,
                    "explanation": None,
                    "functionSignature": None,
                    "starterCode": None,
                    "testCases": src["testCases"],
                    "title": src["title"],
                    "difficulty": src["difficulty"],
                    "constraints": src.get("constraints", []),
                    "examples": src.get("examples", []),
                }
            else:
                q_item = {
                    "id": q.get("id", i + 1),
                    "section": section,
                    "text": q.get("text", "Question unavailable"),
                    "type": q.get("type", "technical"),
                    "category": category,
                    "options": q.get("options"),
                    "correctAnswer": q.get("correctAnswer"),
                    "language": q.get("language"),
                    "explanation": q.get("explanation"),
                    "functionSignature": None,
                    "starterCode": None,
                    "testCases": None,
                    "title": q.get("title"),
                    "difficulty": q.get("difficulty", "medium" if section == 3 else None),
                    "constraints": [],
                    "examples": [],
                    "skill": q.get("skill", "General")
                }
            normalized_qs.append(q_item)
        parsed["questions"] = normalized_qs

    return parsed

def run_adaptive_agent_loop(interview: dict, current_answer: str, question_index: int, resume_text: str = "") -> dict:
    questions = interview.get("questions", [])
    answers = interview.get("answers", [])
    
    current_q = questions[question_index]
    
    # Calculate how many section 3 questions have been answered so far
    sec3_answers = []
    # Match previous questions to their answers
    for ans in answers:
        # Find which question matches this answer text
        q_match = next((q for q in questions if q["text"] == ans["question"]), None)
        if q_match and q_match["section"] == 3:
            sec3_answers.append({
                "question": q_match,
                "answer": ans
            })
            
    # Include current answer in history for prompt (but it doesn't have grade yet)
    # The history list will show the previous grades if they exist
    history_str = ""
    for idx, item in enumerate(sec3_answers):
        q = item["question"]
        a = item["answer"]
        history_str += f"""
{idx+1}. Question: "{q['text']}" (Skill: {q.get('skill', 'General')}, Difficulty: {q.get('difficulty', 'medium')})
   Candidate Answer: "{a['answer']}"
   Grading Score: {a.get('grade', 'Pending')}/10
   Grading Feedback: "{a.get('feedback', '')}"
   Planning Decision: "{a.get('planningReasoning', '')}"
"""

    k = len(sec3_answers) + 1  # count current question as well
    
    # Prompt the AI to evaluate the current answer and plan the next step
    prompt = f"""You are a combination of two advanced AI interview agents: a Grading Agent and a Planning Agent.
You are interviewing a candidate for the role: "{interview['role']}" ({interview['expLevel']} level).

Candidate's Resume context (if available):
\"\"\"
{resume_text[:2000]}
\"\"\"

HISTORY OF VERBAL QUESTIONS IN THIS SESSION SO FAR:
{history_str or "No previous verbal questions."}

CURRENT STATE:
This is verbal question #{k} out of 6 total verbal questions.
Current Question: "{current_q['text']}"
Target Skill: "{current_q.get('skill', 'General')}"
Current Difficulty: "{current_q.get('difficulty', 'medium')}"

CANDIDATE'S VERBAL RESPONSE TO EVALUATE:
\"\"\"
{current_answer}
\"\"\"

YOUR TASKS:

1. GRADING AGENT:
- Evaluate the candidate's answer for technical accuracy, depth, and communication.
- Give a score from 0 to 10 (integer).
- Provide a concise qualitative feedback string (1-2 sentences).
- List 1-2 key strengths and 1-2 areas to improve.

2. PLANNING AGENT:
- Assess the candidate's current score. 
- Decide the NEXT question based on these rules:
  - If this is question #{k} = 5, the NEXT question will be question #6 (the final question). The 6th question MUST be a behavioural or situational question (category: "behavioral", type: "behavioral", skill: "Behavioral") testing collaboration, conflict resolution, or work ethic in this role. 
  - If we have already reached question #6 (meaning k >= 6), then the interview is complete. Set "is_complete" to true and "next_question" to null.
  - If k < 5, the next question must be a technical question (category: "technical"). 
    - If current grade >= 8 (Candidate aced it): planning decision is to ask a harder, more specific follow-up question on the same skill, or move to another skill at a higher difficulty (e.g. increase difficulty: easy -> medium, medium -> hard).
    - If current grade < 5 (Candidate struggled): planning decision is to ask a simpler, concept-level question, or pivot to another skill at a lower difficulty.
    - If current grade is 5-7 (Intermediate): progress normally (medium follow-up or pivot at medium difficulty).
- Write a 1-2 sentence spoken acknowledgement + transition in the interviewer's voice (warm, conversational, acknowledging their answer then introducing the next topic).
- Generate the next question text, target skill, and target difficulty.

Return ONLY a valid JSON object, no markdown, no backticks, matching this schema:
{{
  "grade": 8,
  "feedback": "Your explanation of closures was clear, but missed lexical scopes.",
  "strengths": ["Clear definition of state capture"],
  "areasToImprove": ["Mention lexical environment"],
  "planning_reasoning": "Candidate aced the easy closures question; increasing difficulty to hard and probing memory implications.",
  "is_complete": false,
  "next_question": {{
    "text": "How do closures affect memory usage in Javascript, and how would you prevent a memory leak?",
    "category": "technical",
    "difficulty": "hard",
    "skill": "Closures Memory",
    "transition": "That's a solid explanation of basic closures. Let's dig deeper: how do closures affect memory footprint, and how do you prevent leaks?"
  }}
}}
"""
    raw_ai = call_ai(prompt, 1500)
    cleaned = raw_ai.replace("```json", "").replace("```", "").strip()
    
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        import re
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if match:
            parsed = json.loads(match.group(0))
        else:
            raise Exception("AI returned invalid JSON: " + raw_ai[:200])

    return parsed

def generate_closing(last_answer: str) -> str:
    prompt = f"""Interviewer closing after candidate's final answer: "{last_answer[:300]}"
Write 2 warm encouraging sentences thanking them for completing the interview. No markdown."""
    return call_ai(prompt, 200)

def evaluate_interview(answers: list, questions: list, role: str, exp_level: str) -> dict:
    # Build sections
    # MCQ: section 1
    # Coding: section 2
    # Video: section 3
    section_earned = {1: 0, 2: 0, 3: 0}
    
    # We will compute section scores:
    # MCQ (Section 1): 8 questions. 2 marks per question. Max 16 marks.
    # Coding (Section 2): 2 questions. 10 marks per question. Max 20 marks.
    # Video (Section 3): Max 24 marks.
    
    # For MCQ and Coding, evaluate:
    for idx, q in enumerate(questions):
        sec = int(q.get("section", 1))
        mpq = SECTION_MARKS[sec]["perQuestion"]
        
        # Find corresponding answer
        ans_obj = next((a for a in answers if a["question"] == q["text"]), None)
        if not ans_obj or not ans_obj.get("answer") or ans_obj["answer"] == "[Skipped]":
            continue
            
        ans_val = ans_obj["answer"]
        
        if sec == 1:
            # MCQ
            correct_ans = q.get("correctAnswer")
            if correct_ans is not None:
                letter = ans_val.split(":")[0].strip().upper()
                idx_ans = ['A', 'B', 'C', 'D'].index(letter) if letter in ['A', 'B', 'C', 'D'] else -1
                if idx_ans == correct_ans:
                    section_earned[1] += mpq
        elif sec == 2:
            # Coding
            passed_all = ":OK]" in ans_val
            is_stub = len(ans_val.replace("[CODE:", "").replace("[STDIN_CODE:", "")) < 30
            if not is_stub and passed_all:
                section_earned[2] += mpq
            elif not is_stub:
                section_earned[2] += int(mpq * 0.5)

    # For Section 3 (Video/Adaptive):
    # We already have individual grades (0-10) for each Section 3 answer saved in DB!
    # Let's count them:
    sec3_grades = []
    for ans in answers:
        # Match answer to question to see if it's Section 3
        q_match = next((q for q in questions if q["text"] == ans["question"]), None)
        if q_match and int(q_match["section"]) == 3:
            grade = ans.get("grade")
            if grade is not None:
                sec3_grades.append(grade)
                
    # Max score for section 3 is 24.
    # If we have grades, section 3 marks = (average_grade / 10) * 24.
    if sec3_grades:
        avg_grade = sum(sec3_grades) / len(sec3_grades)
        section_earned[3] = round((avg_grade / 10.0) * SECTION_MARKS[3]["total"])
        
    earned_marks = section_earned[1] + section_earned[2] + section_earned[3]
    grand_total = GRAND_TOTAL_MARKS
    
    overall = round((earned_marks / grand_total) * 10, 1)
    s1_score = round((section_earned[1] / SECTION_MARKS[1]["total"]) * 10, 1)
    s2_score = round((section_earned[2] / SECTION_MARKS[2]["total"]) * 10, 1)
    s3_score = round((section_earned[3] / SECTION_MARKS[3]["total"]) * 10, 1)

    # Compile QA history for AI report evaluation
    answered_qa = []
    for ans in answers:
        if ans.get("answer") and ans["answer"] != "[Skipped]":
            # Strip code tag prefixes for clarity
            ans_clean = ans["answer"]
            if ans_clean.startswith("[CODE:") or ans_clean.startswith("[STDIN_CODE:"):
                ans_clean = ans_clean.split("]\n", 1)[-1] if "]\n" in ans_clean else ans_clean
            answered_qa.append(f"Q: {ans['question']}\nA: {ans_clean[:300]}")
            
    qa_block = "\n\n".join(answered_qa[:6])
    
    feedback = []
    recommendations = []
    summary = ""
    strengths = []
    areas_to_improve = []

    if qa_block.strip():
        prompt = f"""You are an interview evaluator for a {role} position ({exp_level} level).
The candidate scored {earned_marks}/{grand_total} marks ({overall}/10).
Section scores (0-10 scale): MCQ {s1_score}/10, Coding {s2_score}/10, Verbal/Open {s3_score}/10.

Answered questions sample:
{qa_block}

Give ONLY qualitative feedback. Do NOT suggest any scores.
Respond ONLY in valid JSON (no markdown):
{{
  "feedback": [{{"type":"good","text":"... font-end skills are excellent"}},{{"type":"improve","text":"..."}}],
  "recommendations": ["tip 1","tip 2","tip 3"],
  "summary": "2-sentence honest summary mentioning they scored {earned_marks}/{grand_total}",
  "strengths": ["Strength 1", "Strength 2"],
  "areasToImprove": ["Area 1", "Area 2"]
}}"""
        try:
            raw_ai = call_ai(prompt, 900)
            cleaned = raw_ai.replace("```json", "").replace("```", "").strip()
            ai_res = json.loads(cleaned)
            feedback = ai_res.get("feedback", [])
            recommendations = ai_res.get("recommendations", [])
            summary = ai_res.get("summary", "")
            strengths = ai_res.get("strengths", [])
            areas_to_improve = ai_res.get("areasToImprove", [])
        except Exception:
            pass

    if not summary:
        skipped = sum(1 for a in answers if not a.get("answer") or a["answer"] == "[Skipped]")
        summary = f"Scored {earned_marks}/{grand_total} marks ({overall}/10). {skipped} of {len(answers)} questions were skipped."

    return {
        "overall": min(overall, 10),
        "relevance": min(s1_score, 10),
        "clarity": min(s3_score, 10),
        "depth": min(s2_score, 10),
        "sectionScores": {"mcq": s1_score, "coding": s2_score, "video": s3_score},
        "earnedMarks": earned_marks,
        "grandTotal": grand_total,
        "feedback": feedback,
        "recommendations": recommendations,
        "summary": summary,
        "strengths": strengths,
        "areasToImprove": areas_to_improve,
    }
