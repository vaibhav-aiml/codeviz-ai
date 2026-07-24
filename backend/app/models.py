from enum import Enum

from pydantic import BaseModel


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
    key_patterns: list[str]
    key_components: list[str]
    files_analyzed: int
    processing_time: float
    repo_stats: dict | None = None
