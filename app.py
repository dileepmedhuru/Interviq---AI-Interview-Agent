import os
import uvicorn
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"[INFO] Starting Python FastAPI Server on http://localhost:{port}")
    # Run uvicorn on 0.0.0.0 to allow tunneling connections
    uvicorn.run("backend.server:app", host="0.0.0.0", port=port, reload=True)
