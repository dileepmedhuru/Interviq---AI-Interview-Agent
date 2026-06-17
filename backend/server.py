import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from dotenv import load_dotenv

# Load env variables
load_dotenv()

# Lifecycle / Database connection setup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize MongoDB connection
    from backend.config.db import get_db
    get_db()
    yield
    # Shutdown
    pass

app = FastAPI(
    title="Interview Agent API",
    description="Python FastAPI backend replacement for AI Mock Interview simulation",
    lifespan=lifespan
)

# CORS configuration
# Matches corsMiddleware.js options
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:5000", "http://127.0.0.1:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from backend.routes import auth, user, resume, interview

app.include_router(auth.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(resume.router, prefix="/api")
app.include_router(interview.router, prefix="/api")

# Serve frontend static files & SPA fallback
@app.get("/{path:path}")
def serve_static_or_spa(path: str):
    # If a path starts with api/ but didn't match any routes, return 404
    if path.startswith("api"):
        raise HTTPException(status_code=404, detail="API Endpoint not found")

    # Normalize empty path to index.html
    if not path or path == "/":
        path = "pages/index.html"

    # Resolve static file path under frontend directory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    frontend_dir = os.path.join(base_dir, "frontend")
    file_path = os.path.join(frontend_dir, path)

    # Check if the requested file exists
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)

    # Default SPA fallback
    fallback_path = os.path.join(frontend_dir, "pages", "index.html")
    if os.path.exists(fallback_path):
        return FileResponse(fallback_path)
        
    raise HTTPException(status_code=404, detail="File not found")
