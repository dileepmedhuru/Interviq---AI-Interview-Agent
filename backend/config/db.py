import os
from pymongo import MongoClient

_client = None
_db = None

def get_db():
    global _client, _db
    if _db is not None:
        return _db
    
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/ai-interview-agent")
    
    # Parse DB name from URI if present, otherwise default
    db_name = "ai-interview-agent"
    # Basic check for path in URI
    parts = mongo_uri.split("/")
    if len(parts) > 3:
        path_part = parts[-1].split("?")[0]
        if path_part:
            db_name = path_part
            
    _client = MongoClient(mongo_uri)
    _db = _client[db_name]
    print(f"[INFO] Connected to MongoDB: {db_name}")
    return _db
