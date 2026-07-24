import re
from typing import Any

import requests

from .config import settings
from .logger import logger


def extract_repo_info(repo_url: str) -> tuple[str | None, str | None]:
    """Extract owner and repo name from GitHub URL"""
    pattern = r'github\.com/([^/]+)/([^/]+?)(?:\.git|/|$)'
    match = re.search(pattern, repo_url)

    if match:
        return match.group(1), match.group(2)
    return None, None

def get_github_stats(repo_url: str) -> dict[str, Any] | None:
    """Fetch GitHub repository stats using public REST API"""
    owner, repo = extract_repo_info(repo_url)

    if not owner or not repo:
        logger.warning(f"Could not extract owner/repo from URL: {repo_url}")
        return None

    try:
        api_url = f"https://api.github.com/repos/{owner}/{repo}"
        headers = {}
        github_token = settings.GITHUB_TOKEN
        if github_token:
            headers["Authorization"] = f"token {github_token}"
            logger.info("Using GitHub token for authentication")

        response = requests.get(api_url, headers=headers, timeout=10)

        if response.status_code == 200:
            data = response.json()
            return {
                "name": data.get("full_name"),
                "description": data.get("description", "No description"),
                "stars": data.get("stargazers_count", 0),
                "forks": data.get("forks_count", 0),
                "open_issues": data.get("open_issues_count", 0),
                "watchers": data.get("watchers_count", 0),
                "language": data.get("language", "Unknown"),
                "topics": data.get("topics", []),
                "license": data.get("license", {}).get("spdx_id", "No license") if data.get("license") else "No license",
                "created_at": data.get("created_at"),
                "updated_at": data.get("updated_at"),
                "default_branch": data.get("default_branch"),
                "size_kb": data.get("size", 0),
                "subscribers_count": data.get("subscribers_count", 0),
            }
        elif response.status_code == 404:
            logger.warning(f"GitHub repo not found: {owner}/{repo}")
            return {"error": "Repository not found"}
        elif response.status_code == 403:
            logger.warning(f"GitHub API rate limit exceeded for {owner}/{repo}")
            return {"error": "API rate limit exceeded. Add a GitHub token for higher limits."}
        else:
            logger.warning(f"GitHub API returned HTTP {response.status_code} for {owner}/{repo}")
            return {"error": f"GitHub API error: {response.status_code}"}

    except requests.RequestException as e:
        logger.error(f"Failed to fetch GitHub stats for {repo_url}: {e}")
        return {"error": f"Failed to fetch stats: {e!s}"}

def get_latest_commit_sha(repo_url: str, branch: str = "main") -> str | None:
    """Fetch latest commit SHA for a given repository branch"""
    owner, repo = extract_repo_info(repo_url)
    if not owner or not repo:
        return None
    try:
        api_url = f"https://api.github.com/repos/{owner}/{repo}/commits/{branch}"
        headers = {}
        if settings.GITHUB_TOKEN:
            headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"
        resp = requests.get(api_url, headers=headers, timeout=5)
        if resp.status_code == 200:
            return resp.json().get("sha")
    except Exception as e:
        logger.warning(f"Failed to fetch latest commit SHA for {owner}/{repo}:{branch}: {e}")
    return None
