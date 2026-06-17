import os
import requests
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from bson import ObjectId
from backend.config.db import get_db
from backend.routes.auth import get_current_user
from backend.services import ai_service
from backend.services.email_service import send_report_email
from backend.config.utils import get_frontend_url

router = APIRouter(prefix="/interview", tags=["Interview"])

# Schemas
class SetupInterviewSchema(BaseModel):
    role: str
    expLevel: str = "mid"
    resumeId: str = None
    resumeText: str = None

class SubmitAnswerSchema(BaseModel):
    questionIndex: int = None
    answer: str = None
    answers: list = None  # for legacy bulk submit

class RunCodeSchema(BaseModel):
    code: str
    language: str
    testCases: list = None

def clean_object_ids(obj):
    if isinstance(obj, list):
        return [clean_object_ids(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: clean_object_ids(v) for k, v in obj.items()}
    elif isinstance(obj, ObjectId):
        return str(obj)
    return obj

# Serializers
def serialize_question(q) -> dict:
    return {
        "id": q.get("id"),
        "section": q.get("section"),
        "text": q.get("text", ""),
        "type": q.get("type", "technical"),
        "category": q.get("category", "technical"),
        "options": q.get("options"),
        "correctAnswer": q.get("correctAnswer"),
        "language": q.get("language"),
        "explanation": q.get("explanation"),
        "functionSignature": q.get("functionSignature"),
        "starterCode": q.get("starterCode"),
        "testCases": q.get("testCases"),
        "title": q.get("title"),
        "difficulty": q.get("difficulty"),
        "constraints": q.get("constraints", []),
        "examples": q.get("examples", []),
        "skill": q.get("skill", "General")
    }

def serialize_answer(a) -> dict:
    return {
        "question": a.get("question", ""),
        "answer": a.get("answer", ""),
        "grade": a.get("grade"),
        "feedback": a.get("feedback"),
        "planningReasoning": a.get("planningReasoning"),
        "answeredAt": a.get("answeredAt").isoformat() if hasattr(a.get("answeredAt"), "isoformat") else str(a.get("answeredAt", ""))
    }

def serialize_interview(iv) -> dict:
    res = {
        "id": str(iv["_id"]),
        "_id": str(iv["_id"]),
        "user": str(iv.get("user")),
        "resume": str(iv.get("resume")) if iv.get("resume") else None,
        "role": iv.get("role", ""),
        "expLevel": iv.get("expLevel", "mid"),
        "skills": iv.get("skills", []),
        "status": iv.get("status", "setup"),
        "questions": [serialize_question(q) for q in iv.get("questions", [])],
        "answers": [serialize_answer(a) for a in iv.get("answers", [])],
        "report": str(iv["report"]) if iv.get("report") else None,
        "duration": iv.get("duration"),
        "startedAt": iv.get("startedAt").isoformat() if hasattr(iv.get("startedAt"), "isoformat") else str(iv.get("startedAt", "")),
        "completedAt": iv.get("completedAt").isoformat() if hasattr(iv.get("completedAt"), "isoformat") else str(iv.get("completedAt", "")) if iv.get("completedAt") else None,
        "createdAt": iv.get("createdAt").isoformat() if hasattr(iv.get("createdAt"), "isoformat") else str(iv.get("createdAt", "")) if iv.get("createdAt") else iv.get("startedAt").isoformat() if hasattr(iv.get("startedAt"), "isoformat") else str(iv.get("startedAt", "")),
    }
    return clean_object_ids(res)

def serialize_report(rp) -> dict:
    res = {
        "id": str(rp["_id"]),
        "_id": str(rp["_id"]),
        "interview": str(rp["interview"]),
        "user": str(rp["user"]),
        "scores": rp.get("scores", {}),
        "sectionScores": rp.get("sectionScores", {}),
        "earnedMarks": rp.get("earnedMarks", 0),
        "grandTotal": rp.get("grandTotal", 60),
        "feedback": rp.get("feedback", []),
        "recommendations": rp.get("recommendations", []),
        "summary": rp.get("summary", ""),
        "strengths": rp.get("strengths", []),
        "areasToImprove": rp.get("areasToImprove", [])
    }
    return clean_object_ids(res)

@router.get("/public/{id}")
def get_public_report(id: str):
    """Public endpoint - no auth required. Returns report for email link viewers."""
    db = get_db()
    try:
        interview = db.interviews.find_one({"_id": ObjectId(id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid interview ID")

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    ser = serialize_interview(interview)
    if interview.get("report"):
        report = db.reports.find_one({"_id": interview["report"]})
        if report:
            ser["report"] = serialize_report(report)

    return {"success": True, "interview": ser}

@router.post("/setup")
def setup_interview(body: SetupInterviewSchema, current_user: dict = Depends(get_current_user)):
    db = get_db()
    
    if not body.role:
        raise HTTPException(status_code=400, detail="Role is required")
        
    raw_text = body.resumeText
    if body.resumeId:
        resume = db.resumes.find_one({"_id": ObjectId(body.resumeId), "user": current_user["_id"]})
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        raw_text = resume.get("rawText", "")
        
    if not raw_text:
        raise HTTPException(status_code=400, detail="Resume text is required")

    try:
        parsed = ai_service.parse_resume_and_generate_questions(
            resume_text=raw_text,
            role=body.role,
            exp_level=body.expLevel
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI setup error: {str(e)}")

    new_interview = {
        "user": current_user["_id"],
        "resume": ObjectId(body.resumeId) if body.resumeId else None,
        "role": body.role,
        "expLevel": body.expLevel,
        "skills": parsed.get("skills", []),
        "questions": parsed.get("questions", []),
        "answers": [],
        "status": "in_progress",
        "startedAt": datetime.utcnow(),
        "createdAt": datetime.utcnow()
    }
    
    result = db.interviews.insert_one(new_interview)
    new_interview["_id"] = result.inserted_id

    if body.resumeId:
        db.resumes.update_one(
            {"_id": ObjectId(body.resumeId)},
            {"$set": {
                "skills": parsed.get("skills", []),
                "experience": parsed.get("experience", []),
                "summary": parsed.get("summary", "")
            }}
        )

    return {
        "success": True,
        "interview": serialize_interview(new_interview)
    }

@router.post("/{id}/answer")
def submit_answer(id: str, body: SubmitAnswerSchema, current_user: dict = Depends(get_current_user)):
    db = get_db()
    
    interview = db.interviews.find_one({"_id": ObjectId(id), "user": current_user["_id"]})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    if interview.get("status") != "in_progress":
        raise HTTPException(status_code=400, detail="Interview not active")

    # Bulk save logic (legacy / fallback)
    if body.answers and len(body.answers) > 0:
        existing_answers = interview.get("answers", [])
        db_answers = []
        for a in body.answers:
            ans_data = {
                "question": a.get("question"),
                "answer": a.get("answer"),
                "answeredAt": datetime.fromisoformat(a["answeredAt"].replace("Z", "+00:00")) if a.get("answeredAt") else datetime.utcnow()
            }
            # Find matching existing answer to preserve grades/feedback
            existing = next((ea for ea in existing_answers if ea["question"] == a.get("question")), None)
            if existing:
                for k, v in existing.items():
                    if k not in ans_data:
                        ans_data[k] = v
            db_answers.append(ans_data)
        db.interviews.update_one({"_id": ObjectId(id)}, {"$set": {"answers": db_answers}})
        return {"success": True, "message": "Answers saved", "count": len(db_answers)}

    # Individual save
    if body.questionIndex is None or body.answer is None:
        raise HTTPException(status_code=400, detail="questionIndex and answer are required")
        
    questions = interview.get("questions", [])
    if body.questionIndex >= len(questions):
        raise HTTPException(status_code=400, detail="Invalid question index")

    current_q = questions[body.questionIndex]
    
    # Check if answer exists
    existing_answers = interview.get("answers", [])
    ans_idx = -1
    for i, a in enumerate(existing_answers):
        if a["question"] == current_q["text"]:
            ans_idx = i
            break

    ans_data = {
        "question": current_q["text"],
        "answer": body.answer,
        "answeredAt": datetime.utcnow()
    }

    # If it is Section 3: Run the Grading + Planning Agent Loop!
    is_sec3 = int(current_q.get("section", 1)) == 3
    ai_response = ""
    is_last = False
    next_question_obj = None

    if is_sec3:
        # Count Section 3 answers so far (including current one)
        sec3_count = 0
        for a in existing_answers:
            q_match = next((q for q in questions if q["text"] == a["question"]), None)
            if q_match and int(q_match.get("section", 1)) == 3:
                sec3_count += 1
        if ans_idx < 0:
            sec3_count += 1

        # Check if already evaluated (to prevent re-running in final submit loop)
        if ans_idx >= 0 and existing_answers[ans_idx].get("grade") is not None:
            is_last = body.questionIndex >= len(questions) - 1
            return {
                "success": True,
                "aiResponse": "Skipping re-evaluation",
                "isComplete": is_last,
                "nextQuestionIndex": None if is_last else body.questionIndex + 1,
                "nextQuestion": None
            }
        try:
            # Load resume for context
            resume_text = ""
            if interview.get("resume"):
                res_doc = db.resumes.find_one({"_id": interview["resume"]})
                if res_doc:
                    resume_text = res_doc.get("rawText", "")
            
            # Temporary append the current answer locally for loop evaluation
            local_iv = interview.copy()
            if ans_idx >= 0:
                local_iv["answers"][ans_idx] = ans_data
            else:
                local_iv["answers"].append(ans_data)
                
            loop_res = ai_service.run_adaptive_agent_loop(
                interview=local_iv,
                current_answer=body.answer,
                question_index=body.questionIndex,
                resume_text=resume_text
            )
            
            # Save grading and planning in answer
            ans_data["grade"] = loop_res.get("grade", 0)
            ans_data["feedback"] = loop_res.get("feedback", "")
            ans_data["planningReasoning"] = loop_res.get("planning_reasoning", "")
            
            is_complete = loop_res.get("is_complete", False)
            next_q = loop_res.get("next_question")
            
            # Guarantee exactly 6 questions
            if sec3_count < 6:
                is_complete = False
                if not next_q:
                    # Fallback question inside the loop if LLM failed to return one
                    next_q = {
                        "text": "Could you describe a challenging technical project you worked on recently?",
                        "category": "technical" if sec3_count < 5 else "behavioral",
                        "difficulty": "medium",
                        "skill": "Project Experience",
                        "transition": "Let's move to a new topic."
                    }
            else:
                is_complete = True
                next_q = None

            # Save answer
            if ans_idx >= 0:
                db.interviews.update_one(
                    {"_id": ObjectId(id)},
                    {"$set": {f"answers.{ans_idx}": ans_data}}
                )
            else:
                db.interviews.update_one(
                    {"_id": ObjectId(id)},
                    {"$push": {"answers": ans_data}}
                )
                
            if is_complete or not next_q:
                # Loop decided we are done!
                ai_response = ai_service.generate_closing(body.answer)
                is_last = True
            else:
                ai_response = next_q.get("transition", "")
                
                # Append next question to questions array in DB
                new_q_id = len(questions) + 1
                next_question_obj = {
                    "id": new_q_id,
                    "section": 3,
                    "text": next_q.get("text"),
                    "type": "technical" if next_q.get("category") == "technical" else "behavioral",
                    "category": next_q.get("category", "technical"),
                    "options": None,
                    "correctAnswer": None,
                    "difficulty": next_q.get("difficulty"),
                    "skill": next_q.get("skill", "General")
                }
                
                db.interviews.update_one(
                    {"_id": ObjectId(id)},
                    {"$push": {"questions": next_question_obj}}
                )
        except Exception as e:
            # Fallback
            print(f"Error in adaptive agent loop: {e}")
            # Save basic answer
            if ans_idx >= 0:
                db.interviews.update_one({"_id": ObjectId(id)}, {"$set": {f"answers.{ans_idx}": ans_data}})
            else:
                db.interviews.update_one({"_id": ObjectId(id)}, {"$push": {"answers": ans_data}})
                
            # Fallback question generation
            if sec3_count < 6:
                is_last = False
                fallback_q = {
                    "id": len(questions) + 1,
                    "section": 3,
                    "text": "Could you describe a challenging technical project you worked on recently?",
                    "type": "technical" if sec3_count < 5 else "behavioral",
                    "category": "technical" if sec3_count < 5 else "behavioral",
                    "options": None,
                    "correctAnswer": None,
                    "difficulty": "medium",
                    "skill": "Project Experience"
                }
                db.interviews.update_one(
                    {"_id": ObjectId(id)},
                    {"$push": {"questions": fallback_q}}
                )
                ai_response = f"Got it. Let's move to the next question: {fallback_q['text']}"
            else:
                is_last = True
                ai_response = "Thank you for completing this interview. We are processing your evaluation."
    else:
        # Save standard answer for section 1 or 2
        if ans_idx >= 0:
            db.interviews.update_one({"_id": ObjectId(id)}, {"$set": {f"answers.{ans_idx}": ans_data}})
        else:
            db.interviews.update_one({"_id": ObjectId(id)}, {"$push": {"answers": ans_data}})
            
        # Refetch to get correct length
        refetched_iv = db.interviews.find_one({"_id": ObjectId(id)})
        refetched_qs = refetched_iv.get("questions", [])
        
        is_last = body.questionIndex >= len(refetched_qs) - 1
        if is_last:
            ai_response = ai_service.generate_closing(body.answer)
        else:
            next_q_ref = refetched_qs[body.questionIndex + 1]
            ai_response = ai_service.generate_follow_up(
                question=current_q["text"],
                answer=body.answer,
                next_question=next_q_ref["text"]
            ) if hasattr(ai_service, "generate_follow_up") else f"Got it. Next question: {next_q_ref['text']}"

    if is_last:
        completed_at = datetime.utcnow()
        started_at = interview.get("startedAt", datetime.utcnow())
        duration = int((completed_at - started_at).total_seconds())
        
        db.interviews.update_one(
            {"_id": ObjectId(id)},
            {"$set": {
                "status": "completed",
                "completedAt": completed_at,
                "duration": duration
            }}
        )

    return {
        "success": True,
        "aiResponse": ai_response,
        "isComplete": is_last,
        "nextQuestionIndex": None if is_last else body.questionIndex + 1,
        "nextQuestion": next_question_obj
    }

@router.post("/{id}/evaluate")
def evaluate_interview(id: str, request: Request, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    db = get_db()
    
    interview = db.interviews.find_one({"_id": ObjectId(id), "user": current_user["_id"]})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    answers = interview.get("answers", [])
    if len(answers) == 0:
        raise HTTPException(status_code=400, detail="No answers to evaluate")

    try:
        evaluation = ai_service.evaluate_interview(
            answers=answers,
            questions=interview.get("questions", []),
            role=interview["role"],
            exp_level=interview.get("expLevel", "mid")
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI evaluation failed: {str(e)}")

    # Delete existing report if it exists
    if interview.get("report"):
        db.reports.delete_one({"_id": interview["report"]})

    new_report = {
        "interview": ObjectId(id),
        "user": current_user["_id"],
        "scores": {
            "overall": evaluation["overall"],
            "relevance": evaluation["relevance"],
            "clarity": evaluation["clarity"],
            "depth": evaluation["depth"]
        },
        "sectionScores": evaluation.get("sectionScores", {"mcq": 0, "coding": 0, "video": 0}),
        "earnedMarks": evaluation.get("earnedMarks", 0),
        "grandTotal": evaluation.get("grandTotal", 60),
        "feedback": evaluation.get("feedback", []),
        "recommendations": evaluation.get("recommendations", []),
        "summary": evaluation.get("summary", ""),
        "strengths": evaluation.get("strengths", []),
        "areasToImprove": evaluation.get("areasToImprove", []),
        "createdAt": datetime.utcnow()
    }
    
    result = db.reports.insert_one(new_report)
    report_id = result.inserted_id

    # Update interview with report reference
    completed_at = interview.get("completedAt", datetime.utcnow())
    started_at = interview.get("startedAt", datetime.utcnow())
    duration = int((completed_at - started_at).total_seconds())

    db.interviews.update_one(
        {"_id": ObjectId(id)},
        {"$set": {
            "report": report_id,
            "status": "completed",
            "completedAt": completed_at,
            "duration": duration
        }}
    )

    # Update User summary stats
    all_reports = list(db.reports.find({"user": current_user["_id"]}, {"scores.overall": 1}))
    total_interviews = len(all_reports)
    avg_score = round(sum([r["scores"]["overall"] for r in all_reports]) / total_interviews, 1) if total_interviews > 0 else 0.0

    db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "totalInterviews": total_interviews,
            "avgScore": avg_score
        }}
    )

    # Send report email in background
    try:
        to_email = current_user.get("email")
        user_name = current_user.get("name", "Candidate")
        if to_email:
            frontend_url = get_frontend_url(request)
            report_url = f"{frontend_url}/pages/report.html?id={id}&public=true"
            background_tasks.add_task(
                send_report_email,
                email=to_email,
                name=user_name,
                report=new_report,
                role=interview["role"],
                exp_level=interview.get("expLevel", "mid"),
                report_url=report_url
            )
    except Exception as email_err:
        print(f"Error queuing report email: {email_err}")

    return {
        "success": True,
        "report": serialize_report(new_report)
    }

@router.get("/history")
def get_history(page: int = 1, limit: int = 10, current_user: dict = Depends(get_current_user)):
    db = get_db()
    skip = (page - 1) * limit
    
    cursor = db.interviews.find({"user": current_user["_id"]}).sort("createdAt", -1).skip(skip).limit(limit)
    interviews = list(cursor)
    total = db.interviews.count_documents({"user": current_user["_id"]})
    
    # Populate overall scores from reports if they exist
    populated_interviews = []
    for iv in interviews:
        ser = serialize_interview(iv)
        if iv.get("report"):
            report = db.reports.find_one({"_id": iv["report"]}, {"scores.overall": 1})
            if report:
                overall = report.get("scores", {}).get("overall", 0)
                ser["report"] = {
                    "id": str(report["_id"]),
                    "_id": str(report["_id"]),
                    "scores": {"overall": overall}
                }
        populated_interviews.append(ser)
        
    import math
    return {
        "success": True,
        "interviews": populated_interviews,
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit)
    }

@router.get("/{id}")
def get_interview(id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    interview = db.interviews.find_one({"_id": ObjectId(id), "user": current_user["_id"]})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    ser = serialize_interview(interview)
    if interview.get("report"):
        report = db.reports.find_one({"_id": interview["report"]})
        if report:
            ser["report"] = serialize_report(report)
            
    return {"success": True, "interview": ser}

@router.delete("/{id}")
def delete_interview(id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    
    interview = db.interviews.find_one({"_id": ObjectId(id), "user": current_user["_id"]})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if interview.get("report"):
        db.reports.delete_one({"_id": interview["report"]})
        
    db.interviews.delete_one({"_id": ObjectId(id)})

    # Recalculate stats
    all_reports = list(db.reports.find({"user": current_user["_id"]}, {"scores.overall": 1}))
    total_interviews = len(all_reports)
    avg_score = round(sum([r["scores"]["overall"] for r in all_reports]) / total_interviews, 1) if total_interviews > 0 else 0.0

    db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "totalInterviews": total_interviews,
            "avgScore": avg_score
        }}
    )

    return {"success": True, "message": "Interview deleted"}

# ─────────────────────────────────────────────────────────────────
# Judge0 Code Execution
# ─────────────────────────────────────────────────────────────────
JUDGE0_URL = "https://ce.judge0.com/submissions?base64_encoded=false&wait=true"

LANG_IDS = {
    "javascript": 63,
    "python":     71,
    "java":       62,
    "cpp":        54,
    "c":          50,
    "typescript": 74,
    "go":         60,
    "rust":       73,
    "ruby":       72,
}

def judge0_submit(source_code: str, language_id: int, stdin: str = "") -> dict:
    body = {
        "source_code": source_code,
        "language_id": language_id,
        "stdin": stdin
    }
    response = requests.post(JUDGE0_URL, json=body, timeout=25)
    if response.status_code not in [200, 201]:
        raise Exception(f"Judge0 error: {response.text[:300]}")
    return response.json()

def normalize_output(raw: str) -> str:
    if raw is None:
        return ""
    return "\n".join([line.rstrip() for line in str(raw).splitlines()]).strip()

def values_match(actual: str, expected: str) -> bool:
    if normalize_output(actual) == normalize_output(expected):
        return True
    return normalize_output(actual).lower() == normalize_output(expected).lower()

@router.post("/run-code")
def run_code(body: RunCodeSchema, current_user: dict = Depends(get_current_user)):
    lang = (body.language or "").lower()
    language_id = LANG_IDS.get(lang)
    
    if not language_id:
        raise HTTPException(
            status_code=400,
            detail=f"Language '{lang}' not supported. Supported: {', '.join(LANG_IDS.keys())}"
        )

    # No test cases: raw run
    if not body.testCases or len(body.testCases) == 0:
        try:
            j0 = judge0_submit(body.code, language_id, "")
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Code runner unavailable: {str(e)}")
            
        stdout = (j0.get("stdout") or "").rstrip()
        stderr = (j0.get("stderr") or "").rstrip()
        compile_err = (j0.get("compile_output") or "").rstrip()
        status_id = j0.get("status", {}).get("id")

        ran = False
        error = None
        if status_id == 6 or compile_err:
            error = compile_err or "Compilation error"
        elif status_id == 5:
            error = "Time Limit Exceeded"
        elif status_id is not None and 7 <= status_id <= 14:
            error = stderr or j0.get("status", {}).get("description") or "Runtime error"
        else:
            ran = True
            if stderr:
                error = stderr
                
        return {"success": True, "ran": ran, "output": stdout, "error": error, "statusId": status_id}

    # Run visible test cases
    visible_tcs = [tc for tc in body.testCases if not tc.get("hidden", False)]
    results = []
    passed_count = 0
    
    for i, tc in enumerate(visible_tcs):
        stdin = str(tc.get("stdin", tc.get("inputCode", "")))
        expected = tc.get("expectedDisplay", tc.get("expected", ""))
        
        try:
            j0 = judge0_submit(body.code, language_id, stdin)
        except Exception as e:
            results.append({
                "passed": False,
                "expected": expected,
                "actual": None,
                "input": tc.get("input", stdin),
                "error": f"Code runner unavailable: {str(e)}",
                "statusId": None
            })
            continue

        stdout = (j0.get("stdout") or "").rstrip()
        stderr = (j0.get("stderr") or "").rstrip()
        compile_err = (j0.get("compile_output") or "").rstrip()
        status_id = j0.get("status", {}).get("id")

        # Compile error: halt execution of remaining cases
        if status_id == 6 or compile_err:
            err_msg = compile_err or "Compilation Error"
            results.append({
                "passed": False,
                "expected": expected,
                "actual": None,
                "input": tc.get("input", stdin),
                "error": err_msg,
                "statusId": status_id,
                "isCompileError": True
            })
            
            # Block remaining
            for j in range(i + 1, len(visible_tcs)):
                rem = visible_tcs[j]
                rem_stdin = str(rem.get("stdin", rem.get("inputCode", "")))
                results.append({
                    "passed": False,
                    "expected": rem.get("expectedDisplay", rem.get("expected", "")),
                    "actual": None,
                    "input": rem.get("input", rem_stdin),
                    "error": "Blocked by compilation error",
                    "statusId": 6,
                    "isCompileError": True
                })
            break

        # Time Limit Exceeded
        if status_id == 5:
            results.append({
                "passed": False,
                "expected": expected,
                "actual": None,
                "input": tc.get("input", stdin),
                "error": "Time Limit Exceeded -- your code is too slow",
                "statusId": status_id
            })
            continue

        # Runtime Error
        if status_id is not None and 7 <= status_id <= 14:
            results.append({
                "passed": False,
                "expected": expected,
                "actual": None,
                "input": tc.get("input", stdin),
                "error": stderr or j0.get("status", {}).get("description") or "Runtime Error",
                "statusId": status_id
            })
            continue

        # Normal run
        passed = values_match(stdout, tc.get("expected"))
        if passed:
            passed_count += 1
            
        results.append({
            "passed": passed,
            "expected": expected,
            "actual": stdout if stdout else "(no output)",
            "input": tc.get("input", stdin),
            "error": stderr if stderr else None,
            "statusId": status_id
        })

    return {
        "success": True,
        "results": results,
        "passed": passed_count,
        "total": len(results)
    }
