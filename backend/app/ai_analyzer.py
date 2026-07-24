from typing import Any

from .llm_provider import get_llm_provider
from .logger import logger


def analyze_code_with_ai(
    code_samples: dict,
    repo_name: str,
    languages: list,
    frameworks: list,
    file_tree: dict = None,
    manifest_files: dict = None
) -> dict[str, Any] | None:
    """Analyzes codebase using configured LLM provider (Groq default, OpenAI optional)"""
    try:
        provider = get_llm_provider()
        return provider.analyze_code(code_samples, repo_name, languages, frameworks, file_tree, manifest_files)
    except Exception as e:
        logger.error(f"Error executing LLM analysis: {e}")
        return None

