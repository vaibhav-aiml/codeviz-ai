from enum import Enum
from pydantic import BaseModel
from typing import Optional, List, Dict

class AnalysisStatus(str, Enum):
    QUEUED = "queued"
    CLONING = "cloning"
    ANALYZING = "analyzing"
    GENERATING_DIAGRAM = "generating_diagram"
    COMPLETED = "completed"
    FAILED = "failed"

class ArchitectureResult(BaseModel):
    mermaid_code: str
    summary: str
    key_patterns: List[str]
    key_components: List[str]
    files_analyzed: int
    processing_time: float
    repo_stats: Optional[Dict] = None