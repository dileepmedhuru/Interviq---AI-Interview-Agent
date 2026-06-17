from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.config.db import get_db
from backend.routes.auth import get_current_user, serialize_user
from backend.services.token_service import hash_password, verify_password

router = APIRouter(prefix="/user", tags=["User"])

class UpdateProfileSchema(BaseModel):
    name: str = None
    avatar: str = None

class ChangePasswordSchema(BaseModel):
    currentPassword: str
    newPassword: str

@router.get("/profile")
def get_profile(current_user: dict = Depends(get_current_user)):
    return {"success": True, "user": serialize_user(current_user)}

@router.put("/profile")
def update_profile(body: UpdateProfileSchema, current_user: dict = Depends(get_current_user)):
    db = get_db()
    
    update = {}
    if body.name is not None:
        update["name"] = body.name
    if body.avatar is not None:
        update["avatar"] = body.avatar
        
    if update:
        db.users.update_one({"_id": current_user["_id"]}, {"$set": update})
        # reload user
        user = db.users.find_one({"_id": current_user["_id"]})
    else:
        user = current_user

    return {"success": True, "user": serialize_user(user)}

@router.put("/password")
def change_password(body: ChangePasswordSchema, current_user: dict = Depends(get_current_user)):
    db = get_db()
    
    # current_user doesn't select password by default in Node, but in pymongo we get the whole doc.
    if not verify_password(body.currentPassword, current_user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
        
    if len(body.newPassword) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
        
    hashed = hash_password(body.newPassword)
    db.users.update_one({"_id": current_user["_id"]}, {"$set": {"password": hashed}})
    
    return {"success": True, "message": "Password updated"}

@router.get("/stats")
def get_stats(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = current_user["_id"]
    
    total = db.interviews.count_documents({"user": user_id})
    completed = db.interviews.count_documents({"user": user_id, "status": "completed"})
    
    reports = list(db.reports.find({"user": user_id}, {"scores.overall": 1, "createdAt": 1}))
    
    avg_score = 0.0
    best = 0.0
    trend = []
    
    if reports:
        overall_scores = [r["scores"]["overall"] for r in reports]
        avg_score = round(sum(overall_scores) / len(overall_scores), 1)
        best = max(overall_scores)
        
        # Sort by createdAt descending
        # Use lambda sorting, handling potential missing createdAt
        reports_sorted = sorted(reports, key=lambda x: x.get("createdAt"), reverse=True)
        recent_5 = reports_sorted[:5]
        # Reverse to chronological
        recent_5.reverse()
        
        trend = [
            {
                "score": r["scores"]["overall"],
                "date": r["createdAt"].isoformat() if hasattr(r.get("createdAt"), "isoformat") else str(r.get("createdAt", ""))
            }
            for r in recent_5
        ]
        
    return {
        "success": True,
        "stats": {
            "total": total,
            "completed": completed,
            "avgScore": avg_score,
            "best": best,
            "trend": trend
        }
    }
