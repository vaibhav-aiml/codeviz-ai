from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import Optional
import uuid
import asyncio
from .tasks import analyze_repository_task, set_analyses_ref

app = FastAPI(title="CodeViz AI", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalysisRequest(BaseModel):
    repo_url: HttpUrl
    branch: Optional[str] = "main"

# In-memory storage
analyses = {}

# Set reference in tasks module
set_analyses_ref(analyses)

@app.get("/")
async def root():
    return {"message": "CodeViz AI API is running!", "docs": "/docs"}

@app.post("/api/analyze")
async def start_analysis(request: AnalysisRequest):
    """Start a new codebase analysis"""
    analysis_id = str(uuid.uuid4())
    
    analyses[analysis_id] = {
        "status": "queued",
        "repo_url": str(request.repo_url),
        "branch": request.branch,
        "result": None
    }
    
    asyncio.create_task(analyze_repository_task(analysis_id, str(request.repo_url), request.branch))
    
    return {
        "analysis_id": analysis_id,
        "status": "queued",
        "message": "Analysis started successfully"
    }

@app.get("/api/status/{analysis_id}")
async def get_status(analysis_id: str):
    """Get analysis status"""
    if analysis_id not in analyses:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    analysis = analyses[analysis_id]
    return {
        "analysis_id": analysis_id,
        "status": analysis["status"],
        "result": analysis.get("result")
    }

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "codeviz-api"}

@app.get("/api/file-content/{analysis_id}")
async def get_file_content(analysis_id: str, path: str = Query(..., description="File path")):
    """Get content of a specific file from analyzed repository"""
    if analysis_id not in analyses:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    result = analyses[analysis_id].get("result")
    if not result:
        raise HTTPException(status_code=404, detail="No result found")
    
    file_contents = result.get("file_contents")
    if not file_contents:
        raise HTTPException(status_code=404, detail="File contents not available")
    
    # Try exact match first
    content = file_contents.get(path)
    
    # If not found, try with forward slash
    if content is None:
        normalized_path = path.replace("\\", "/")
        content = file_contents.get(normalized_path)
    
    # If still not found, try searching all keys
    if content is None:
        for key in file_contents.keys():
            if key.endswith(path) or key.replace("\\", "/").endswith(path):
                content = file_contents[key]
                break
    
    if content is None:
        available = list(file_contents.keys())[:5]
        raise HTTPException(status_code=404, detail=f"File not found: {path}. Available: {available}")
    
    return {"path": path, "content": content}