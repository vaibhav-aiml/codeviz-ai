import hmac
import hashlib
import uuid
from typing import Optional
from fastapi import FastAPI, HTTPException, Query, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .config import settings
from .logger import logger
from .redis_client import store
from .tasks import analyze_repository_task, celery_app
from .github_stats import get_github_stats

# Optional Sentry initialization
if settings.SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            integrations=[FastApiIntegration()],
            traces_sample_rate=1.0,
        )
        logger.info("Sentry error tracking initialized.")
    except Exception as e:
        logger.warning(f"Failed to initialize Sentry: {e}")

if not settings.GITHUB_WEBHOOK_SECRET:
    logger.warning("GITHUB_WEBHOOK_SECRET is not set. Webhook endpoint will skip HMAC signature verification in local development.")

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="CodeViz AI", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware with explicit allow-list
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalysisRequest(BaseModel):
    repo_url: HttpUrl
    branch: Optional[str] = "main"

@app.get("/")
async def root():
    return {"message": "CodeViz AI API is running!", "docs": "/docs"}

@app.get("/api/health")
async def health_check():
    """Detailed health check endpoint exposing Redis and Celery connectivity status"""
    redis_status = "connected"
    try:
        client = store.client
        if client is None:
            redis_status = "fallback_mode (disconnected)"
        else:
            client.ping()
    except Exception as e:
        redis_status = f"unhealthy ({e})"

    celery_status = "configured"
    try:
        insp = celery_app.control.inspect(timeout=1.0)
        workers = insp.ping()
        if not workers:
            celery_status = "no_workers_found"
    except Exception:
        celery_status = "unavailable"

    overall_status = "healthy" if redis_status == "connected" and celery_status == "configured" else "degraded"

    return {
        "status": overall_status,
        "service": "codeviz-api",
        "redis": redis_status,
        "celery": celery_status
    }

@app.post("/api/analyze")
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def start_analysis(request: Request, body: AnalysisRequest):
    """Start a new codebase analysis with validation & rate limiting"""
    url_str = str(body.repo_url)
    host = body.repo_url.host.lower() if body.repo_url.host else ""
    
    # Validation 1: Host verification
    if not host.endswith("github.com"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported git host '{host}'. Only GitHub repositories are supported."
        )

    # Validation 2: Pre-flight repository size check
    repo_stats = get_github_stats(url_str)
    if repo_stats and "error" not in repo_stats:
        size_kb = repo_stats.get("size_kb", 0)
        max_kb = settings.MAX_REPO_SIZE_MB * 1024
        if size_kb > max_kb:
            raise HTTPException(
                status_code=400,
                detail=f"Repository size ({size_kb / 1024:.1f} MB) exceeds maximum allowed size ({settings.MAX_REPO_SIZE_MB} MB)."
            )
    else:
        logger.warning(f"Pre-flight stats check unavailable for {url_str}. Proceeding with analysis...")

    analysis_id = str(uuid.uuid4())
    initial_data = {
        "analysis_id": analysis_id,
        "status": "queued",
        "repo_url": url_str,
        "branch": body.branch,
        "result": None
    }
    store.save_analysis(analysis_id, initial_data)

    # Enqueue task to Celery task queue (with fallback if broker unavailable)
    try:
        analyze_repository_task.delay(analysis_id, url_str, body.branch)
        logger.info(f"Enqueued task {analysis_id} to Celery worker.")
    except Exception as e:
        logger.error(f"CRITICAL: Celery task enqueue failed ({e}). Degrading to local synchronous execution.")
        if settings.SENTRY_DSN:
            try:
                import sentry_sdk
                sentry_sdk.capture_exception(e)
            except Exception:
                pass
        try:
            analyze_repository_task(analysis_id, url_str, body.branch)
        except Exception as task_err:
            logger.error(f"Local task execution error: {task_err}")

    return {
        "analysis_id": analysis_id,
        "status": "queued",
        "message": "Analysis started successfully"
    }

@app.get("/api/status/{analysis_id}")
async def get_status(analysis_id: str):
    """Get analysis status from state store"""
    analysis = store.get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return {
        "analysis_id": analysis_id,
        "status": analysis.get("status", "unknown"),
        "result": analysis.get("result")
    }

@app.get("/api/file-content/{analysis_id}")
async def get_file_content(analysis_id: str, path: str = Query(..., description="File path")):
    """Get content of a specific file from analyzed repository"""
    analysis = store.get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    result = analysis.get("result")
    if not result:
        raise HTTPException(status_code=404, detail="No result found for this analysis")
    
    file_contents = result.get("file_contents")
    if not file_contents:
        raise HTTPException(status_code=404, detail="File contents not available")
    
    # Exact match check
    content = file_contents.get(path)
    if content is None:
        normalized_path = path.replace("\\", "/")
        content = file_contents.get(normalized_path)
    
    if content is None:
        for key in file_contents:
            if key.endswith(path) or key.replace("\\", "/").endswith(path):
                content = file_contents[key]
                break
    
    if content is None:
        available = list(file_contents.keys())[:5]
        raise HTTPException(status_code=404, detail=f"File not found: {path}. Available: {available}")
    
    return {"path": path, "content": content}

@app.post("/api/webhook/github")
async def github_webhook(
    request: Request,
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256")
):
    """GitHub push webhook endpoint with HMAC signature verification"""
    payload_bytes = await request.body()
    secret = settings.GITHUB_WEBHOOK_SECRET
    
    if secret:
        if not x_hub_signature_256 or not x_hub_signature_256.startswith("sha256="):
            raise HTTPException(status_code=401, detail="Missing or invalid X-Hub-Signature-256 header")
        
        expected_sig = "sha256=" + hmac.new(
            secret.encode("utf-8"),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(expected_sig, x_hub_signature_256):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    payload = await request.json()
    event_type = request.headers.get("X-GitHub-Event", "push")
    
    if event_type == "push":
        repository = payload.get("repository", {})
        repo_url = repository.get("html_url") or repository.get("clone_url")
        default_branch = repository.get("default_branch", "main")
        
        if repo_url:
            analysis_id = str(uuid.uuid4())
            initial_data = {
                "analysis_id": analysis_id,
                "status": "queued",
                "repo_url": repo_url,
                "branch": default_branch,
                "result": None
            }
            store.save_analysis(analysis_id, initial_data)
            
            try:
                analyze_repository_task.delay(analysis_id, repo_url, default_branch)
            except Exception as e:
                logger.error(f"CRITICAL: Celery enqueue failed for webhook ({e}). Executing task locally...")
                analyze_repository_task(analysis_id, repo_url, default_branch)
                
            return {
                "message": "Push event received and analysis enqueued",
                "analysis_id": analysis_id
            }

    return {"message": f"Event '{event_type}' received but no action required."}
