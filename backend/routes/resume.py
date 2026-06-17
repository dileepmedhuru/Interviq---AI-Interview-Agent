from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, Depends
from bson import ObjectId
from backend.config.db import get_db
from backend.routes.auth import get_current_user
from backend.services.resume_parser import parse_resume

router = APIRouter(prefix="/resume", tags=["Resume"])

@router.post("/upload")
async def upload_resume(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    content_type = request.headers.get("content-type", "")
    
    raw_text = ""
    original_name = "pasted-text.txt"
    
    if "multipart/form-data" in content_type:
        form = await request.form()
        uploaded_file = form.get("resume")
        if not uploaded_file:
            raise HTTPException(status_code=400, detail="Resume file is required in form-data")
        
        file_bytes = await uploaded_file.read()
        mimetype = uploaded_file.content_type
        original_name = uploaded_file.filename
        
        try:
            raw_text = parse_resume(file_bytes, mimetype)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        # Assume JSON
        try:
            body = await request.json()
            text = body.get("text", "")
            raw_text = text.strip()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid request body")
            
    if not raw_text or len(raw_text) < 50:
        raise HTTPException(status_code=400, detail="Resume text is too short")
        
    # Deactivate old resumes
    db.resumes.update_many({"user": current_user["_id"]}, {"$set": {"isActive": False}})
    
    new_resume = {
        "user": current_user["_id"],
        "originalName": original_name,
        "rawText": raw_text,
        "isActive": True,
        "createdAt": datetime.utcnow()
    }
    
    result = db.resumes.insert_one(new_resume)
    
    return {
        "success": True,
        "resume": {
            "id": str(result.inserted_id),
            "originalName": original_name
        }
    }

@router.get("/active")
def get_active_resume(current_user: dict = Depends(get_current_user)):
    db = get_db()
    resume = db.resumes.find_one({"user": current_user["_id"], "isActive": True})
    
    if not resume:
        return {"success": True, "resume": None}
        
    return {
        "success": True,
        "resume": {
            "id": str(resume["_id"]),
            "_id": str(resume["_id"]),
            "originalName": resume.get("originalName", ""),
            "isActive": resume.get("isActive", True)
        }
    }
