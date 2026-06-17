import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Request, Response, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from bson import ObjectId
from backend.config.db import get_db
from backend.services.token_service import (
    hash_password, verify_password, sign_access_token, sign_refresh_token,
    verify_access_token, verify_refresh_token, get_cookie_options
)
from backend.services.email_service import send_verification_email, send_password_reset_email

router = APIRouter(prefix="/auth", tags=["Auth"])

# Schemas
class RegisterSchema(BaseModel):
    name: str
    email: str
    password: str

class LoginSchema(BaseModel):
    email: str
    password: str

class ForgotPasswordSchema(BaseModel):
    email: str

class ResetPasswordSchema(BaseModel):
    token: str
    password: str

# Helper to serialize user
def serialize_user(user_doc) -> dict:
    return {
        "id": str(user_doc["_id"]),
        "name": user_doc.get("name", ""),
        "email": user_doc.get("email", ""),
        "avatar": user_doc.get("avatar", ""),
        "isVerified": user_doc.get("isVerified", False),
        "totalInterviews": user_doc.get("totalInterviews", 0),
        "avgScore": user_doc.get("avgScore", 0.0),
        "createdAt": user_doc.get("createdAt", datetime.utcnow()).isoformat() if isinstance(user_doc.get("createdAt"), datetime) else user_doc.get("createdAt", "")
    }

# Dependency for route protection
def get_current_user(request: Request) -> dict:
    token = None
    auth_header = request.headers.get("Authorization")
    
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    else:
        token = request.cookies.get("accessToken")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        decoded = verify_access_token(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

    db = get_db()
    user = db.users.find_one({"_id": ObjectId(decoded["id"])})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user

@router.post("/register")
def register(body: RegisterSchema, response: Response):
    db = get_db()
    email_lower = body.email.strip().lower()
    
    if not body.name or not body.email or not body.password:
        raise HTTPException(status_code=400, detail="All fields are required")
        
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        
    existing = db.users.find_one({"email": email_lower})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    hashed = hash_password(body.password)
    verification_token = secrets.token_hex(32)
    
    new_user = {
        "name": body.name.strip(),
        "email": email_lower,
        "password": hashed,
        "avatar": "",
        "isVerified": False,
        "verificationToken": verification_token,
        "totalInterviews": 0,
        "avgScore": 0.0,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    result = db.users.insert_one(new_user)
    user_id = str(result.inserted_id)
    new_user["_id"] = result.inserted_id

    # Send verification email asynchronously / background (simple inline SMTP)
    try:
        send_verification_email(email_lower, body.name, verification_token)
    except Exception as e:
        print(f"Failed to send email: {e}")

    access_token = sign_access_token(user_id)
    refresh_token = sign_refresh_token(user_id)
    
    db.users.update_one({"_id": result.inserted_id}, {"$set": {"refreshToken": refresh_token}})

    # Set cookies
    access_cookie = get_cookie_options(7)
    refresh_cookie = get_cookie_options(30)
    
    response.set_cookie(key="accessToken", value=access_token, **access_cookie)
    response.set_cookie(key="refreshToken", value=refresh_token, **refresh_cookie)
    
    return {
        "success": True,
        "user": serialize_user(new_user),
        "accessToken": access_token
    }

@router.post("/login")
def login(body: LoginSchema, response: Response):
    db = get_db()
    email_lower = body.email.strip().lower()

    if not body.email or not body.password:
        raise HTTPException(status_code=400, detail="Email and password required")

    user = db.users.find_one({"email": email_lower})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_id = str(user["_id"])
    access_token = sign_access_token(user_id)
    refresh_token = sign_refresh_token(user_id)

    db.users.update_one({"_id": user["_id"]}, {"$set": {"refreshToken": refresh_token}})

    access_cookie = get_cookie_options(7)
    refresh_cookie = get_cookie_options(30)

    response.set_cookie(key="accessToken", value=access_token, **access_cookie)
    response.set_cookie(key="refreshToken", value=refresh_token, **refresh_cookie)

    return {
        "success": True,
        "user": serialize_user(user),
        "accessToken": access_token
    }

@router.post("/logout")
def logout(response: Response, current_user: dict = Depends(get_current_user)):
    db = get_db()
    db.users.update_one({"_id": current_user["_id"]}, {"$set": {"refreshToken": None}})
    
    response.delete_cookie(key="accessToken")
    response.delete_cookie(key="refreshToken")
    
    return {"success": True, "message": "Logged out"}

@router.post("/refresh")
def refresh(request: Request, response: Response):
    token = request.cookies.get("refreshToken")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")

    try:
        decoded = verify_refresh_token(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

    db = get_db()
    user = db.users.find_one({"_id": ObjectId(decoded["id"])})
    if not user or user.get("refreshToken") != token:
        raise HTTPException(status_code=401, detail="Token invalid or expired")

    user_id = str(user["_id"])
    access_token = sign_access_token(user_id)
    
    access_cookie = get_cookie_options(7)
    response.set_cookie(key="accessToken", value=access_token, **access_cookie)

    return {
        "success": True,
        "accessToken": access_token
    }

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "success": True,
        "user": serialize_user(current_user)
    }

@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordSchema):
    db = get_db()
    email_lower = body.email.strip().lower()
    
    user = db.users.find_one({"email": email_lower})
    if not user:
        # Avoid user enumeration, return success anyway
        return {"success": True, "message": "Password reset link sent if email exists"}

    reset_token = secrets.token_hex(32)
    expires = datetime.utcnow() + timedelta(hours=1)
    
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"resetPasswordToken": reset_token, "resetPasswordExpires": expires}}
    )

    try:
        send_password_reset_email(email_lower, user.get("name", "User"), reset_token)
    except Exception as e:
        print(f"Failed to send email: {e}")

    return {"success": True, "message": "Password reset link sent"}

@router.post("/reset-password")
def reset_password(body: ResetPasswordSchema):
    db = get_db()
    
    user = db.users.find_one({
        "resetPasswordToken": body.token,
        "resetPasswordExpires": {"$gt": datetime.utcnow()}
    })
    
    if not user:
        raise HTTPException(status_code=400, detail="Token invalid or expired")

    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    hashed = hash_password(body.password)
    
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password": hashed}, "$unset": {"resetPasswordToken": "", "resetPasswordExpires": ""}}
    )

    return {"success": True, "message": "Password reset successful"}

@router.get("/verify/{token}")
def verify_email(token: str):
    db = get_db()
    
    user = db.users.find_one({"verificationToken": token})
    if not user:
        raise HTTPException(status_code=400, detail="Verification token is invalid")

    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"isVerified": True}, "$unset": {"verificationToken": ""}}
    )

    return {"success": True, "message": "Account verified successfully"}
