import os
import sys

import uvicorn

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

if __name__ == "__main__":
    print("Starting CodeViz AI Backend Server...")
    print("API Documentation: http://127.0.0.1:8001/docs")
    print("Health Check: http://127.0.0.1:8001/api/health")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8001, reload=True)
