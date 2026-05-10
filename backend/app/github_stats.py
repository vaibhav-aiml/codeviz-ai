import requests
import re
import os
from dotenv import load_dotenv

load_dotenv()

def extract_repo_info(repo_url):
    """Extract owner and repo name from GitHub URL"""
    pattern = r'github\.com/([^/]+)/([^/]+?)(?:\.git|/|$)'
    match = re.search(pattern, repo_url)
    
    if match:
        return match.group(1), match.group(2)
    return None, None

def get_github_stats(repo_url):
    """Fetch GitHub repository stats using public API"""
    owner, repo = extract_repo_info(repo_url)
    
    if not owner or not repo:
        return None
    
    try:
        api_url = f"https://api.github.com/repos/{owner}/{repo}"
        
        # Use token for higher rate limit if available
        headers = {}
        github_token = os.getenv("GITHUB_TOKEN")
        if github_token:
            headers["Authorization"] = f"token {github_token}"
            print(f"   Using GitHub token for authentication")
        
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
            return {"error": "Repository not found"}
        elif response.status_code == 403:
            return {"error": "API rate limit exceeded. Add a GitHub token for higher limits."}
        else:
            return {"error": f"GitHub API error: {response.status_code}"}
            
    except requests.RequestException as e:
        return {"error": f"Failed to fetch stats: {str(e)}"}