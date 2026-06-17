import os
from fastapi import Request

def get_frontend_url(request: Request) -> str:
    # Try origin header first
    origin = request.headers.get("origin")
    if origin:
        return origin.rstrip("/")
    
    # Try referer header
    referer = request.headers.get("referer")
    if referer:
        from urllib.parse import urlparse
        parsed = urlparse(referer)
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}"
    
    # Try custom headers or standard Host header (especially useful behind reverse proxies)
    proto = request.headers.get("x-forwarded-proto", "http")
    host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    if host:
        return f"{proto}://{host}"
        
    # Default fallback to env var or localhost
    return os.getenv("FRONTEND_URL", "http://localhost:5000").rstrip("/")
