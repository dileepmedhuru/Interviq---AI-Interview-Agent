import os
import uvicorn
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 5000))
    print(f"[INFO] Starting Python FastAPI Server on http://{host}:{port}")
    uvicorn.run("backend.server:app", host=host, port=port, reload=True)
