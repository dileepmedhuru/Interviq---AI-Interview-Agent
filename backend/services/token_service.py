import os
import time
import jwt
import bcrypt

JWT_SECRET = os.getenv("JWT_SECRET", "default_jwt_secret_please_change")
JWT_REFRESH_SECRET = os.getenv("JWT_REFRESH_SECRET", "default_jwt_refresh_secret_please_change")

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def sign_access_token(user_id: str) -> str:
    # default to 7 days
    expires_in_days = 7
    exp_str = os.getenv("JWT_EXPIRES_IN", "7d")
    if exp_str.endswith("d"):
        try:
            expires_in_days = int(exp_str[:-1])
        except ValueError:
            pass
            
    payload = {
        "id": str(user_id),
        "exp": int(time.time()) + (expires_in_days * 24 * 60 * 60)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def sign_refresh_token(user_id: str) -> str:
    # default to 30 days
    expires_in_days = 30
    exp_str = os.getenv("JWT_REFRESH_EXPIRES_IN", "30d")
    if exp_str.endswith("d"):
        try:
            expires_in_days = int(exp_str[:-1])
        except ValueError:
            pass
            
    payload = {
        "id": str(user_id),
        "exp": int(time.time()) + (expires_in_days * 24 * 60 * 60)
    }
    return jwt.encode(payload, JWT_REFRESH_SECRET, algorithm="HS256")

def verify_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise Exception("Token expired")
    except jwt.InvalidTokenError:
        raise Exception("Token invalid")

def verify_refresh_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_REFRESH_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise Exception("Refresh token expired")
    except jwt.InvalidTokenError:
        raise Exception("Refresh token invalid")

def get_cookie_options(max_age_days: int = 7) -> dict:
    return {
        "httponly": True,
        "secure": os.getenv("NODE_ENV", "development") == "production",
        "samesite": "strict",
        "max_age": max_age_days * 24 * 60 * 60,
    }
