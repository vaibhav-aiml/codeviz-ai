import hashlib
import os
import tempfile
import time
from pathlib import Path

from celery import Celery
from git import Repo

from .ai_analyzer import analyze_code_with_ai
from .config import settings
from .github_stats import get_github_stats, get_latest_commit_sha
from .logger import logger
from .models import ArchitectureResult
from .redis_client import store

celery_app = Celery(
    "codeviz_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

analyses_ref = None

def set_analyses_ref(ref):
    global analyses_ref
    analyses_ref = ref

def get_code_samples(repo_path, max_files=40, max_size=1200):
    samples = {}
    count = 0
    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', 'venv', '__pycache__', '.git']]
        for file in files:
            if file.endswith(('.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.go', '.rs', '.cpp')):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()[:max_size]
                    rel_path = filepath.replace(repo_path, '').lstrip('/\\')
                    samples[rel_path] = content
                    count += 1
                    if count >= max_files:
                        return samples
                except Exception:
                    pass
    return samples

def get_manifest_files(repo_path, max_size=1500):
    manifest_names = [
        'requirements.txt', 'package.json', 'pyproject.toml', 'setup.py',
        'go.mod', 'pom.xml', 'build.gradle', 'Cargo.toml', 'Dockerfile', 'docker-compose.yml'
    ]
    manifests = {}
    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', 'venv', '__pycache__', '.git']]
        for file in files:
            if file.lower() in [m.lower() for m in manifest_names]:
                filepath = os.path.join(root, file)
                rel_path = filepath.replace(repo_path, '').lstrip('/\\').replace('\\', '/')
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        manifests[rel_path] = f.read()[:max_size]
                except Exception:
                    pass
    return manifests

def detect_languages(repo_path):
    extensions = {}
    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', 'venv', '__pycache__']]
        for file in files:
            ext = os.path.splitext(file)[1]
            if ext:
                extensions[ext] = extensions.get(ext, 0) + 1

    lang_map = {
        '.py': 'Python', '.js': 'JavaScript', '.ts': 'TypeScript',
        '.jsx': 'React JSX', '.tsx': 'React TSX', '.java': 'Java',
        '.go': 'Go', '.rs': 'Rust', '.cpp': 'C++', '.c': 'C',
        '.html': 'HTML', '.css': 'CSS', '.json': 'JSON', '.md': 'Markdown'
    }

    languages = {}
    for ext, count in sorted(extensions.items(), key=lambda x: x[1], reverse=True):
        lang = lang_map.get(ext, ext)
        languages[lang] = languages.get(lang, 0) + count

    return list(languages.keys())[:5]

def detect_framework(repo_path):
    frameworks = []
    indicators = {
        'package.json': 'Node.js', 'next.config': 'Next.js', 'vite.config': 'Vite',
        'requirements.txt': 'Python', 'pyproject.toml': 'Python', 'setup.py': 'Python',
        'Dockerfile': 'Docker', 'docker-compose.yml': 'Docker',
        'tailwind.config': 'Tailwind CSS', 'tsconfig.json': 'TypeScript',
        'go.mod': 'Go', 'pom.xml': 'Java', 'build.gradle': 'Java'
    }

    repo_files = []
    try:
        for item in os.listdir(repo_path):
            repo_files.append(item)
            item_path = os.path.join(repo_path, item)
            if os.path.isdir(item_path) and not item.startswith('.'):
                try:
                    repo_files.extend(os.listdir(item_path)[:10])
                except Exception:
                    pass
    except Exception:
        pass

    for indicator, framework in indicators.items():
        for f in repo_files:
            if indicator.lower() in f.lower():
                if framework not in frameworks:
                    frameworks.append(framework)

    return frameworks[:5] if frameworks else ['General Application']

def get_full_file_tree(repo_path):
    tree = {}
    exclude_dirs = {'.git', 'node_modules', '__pycache__', 'venv', 'env', '.venv', 'dist', 'build', '.next', 'target'}

    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        rel_path = root.replace(repo_path, '').lstrip('/\\').replace('\\', '/')
        if not rel_path:
            rel_path = '/'
        tree[rel_path] = {'dirs': dirs[:], 'files': files[:]}
    return tree

def get_file_contents(repo_path, max_files=50, max_size=10000):
    contents = {}
    count = 0
    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', 'venv', '__pycache__', '.git']]
        for file in files:
            if count >= max_files:
                return contents
            filepath = os.path.join(root, file)
            rel_path = filepath.replace(repo_path, '').lstrip('/\\').replace('\\', '/')
            try:
                size = os.path.getsize(filepath)
                if size < max_size:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    contents[rel_path] = content
                    count += 1
            except Exception:
                pass
    return contents

def _get_sha_cache_key(repo_url: str, branch: str, sha: str) -> str:
    raw = f"{repo_url.lower()}:{branch}:{sha}"
    digest = hashlib.sha256(raw.encode('utf-8')).hexdigest()
    return f"sha_cache:{digest}"

def perform_analysis(analysis_id: str, repo_url: str, branch: str = "main") -> dict:
    start_time = time.time()
    logger.info(f"Starting analysis task [id={analysis_id}] for repo={repo_url}, branch={branch}")

    try:
        # Check commit SHA cache
        sha = get_latest_commit_sha(repo_url, branch)
        if sha:
            cache_key = _get_sha_cache_key(repo_url, branch, sha)
            cached_result = store.get_cache(cache_key)
            if cached_result:
                logger.info(f"[{analysis_id}] Serving cached result for SHA {sha[:8]}.")
                store.update_analysis_status(analysis_id, "completed", result=cached_result)
                return cached_result

        # Step 1: Clone
        store.update_analysis_status(analysis_id, "cloning")
        logger.info(f"[{analysis_id}] Cloning repository...")

        with tempfile.TemporaryDirectory() as tmpdir:
            repo_path = os.path.join(tmpdir, "repo")
            clone_success = False
            if branch and branch.strip():
                try:
                    logger.info(f"[{analysis_id}] Cloning branch '{branch}'...")
                    Repo.clone_from(repo_url, repo_path, branch=branch.strip(), depth=1)
                    clone_success = True
                except Exception as clone_err:
                    logger.warning(f"[{analysis_id}] Branch '{branch}' clone failed ({clone_err}). Attempting default remote branch...")

            if not clone_success:
                try:
                    logger.info(f"[{analysis_id}] Cloning default remote branch...")
                    Repo.clone_from(repo_url, repo_path, depth=1)
                except Exception as clone_err:
                    logger.error(f"[{analysis_id}] Default branch clone failed: {clone_err}")
                    raise clone_err

            logger.info(f"[{analysis_id}] Repository cloned successfully.")

            # Step 2: Analyze code structure
            store.update_analysis_status(analysis_id, "analyzing")
            logger.info(f"[{analysis_id}] Extracting code structure and samples...")

            code_samples = get_code_samples(repo_path, max_files=40, max_size=1200)
            languages = detect_languages(repo_path)
            frameworks = detect_framework(repo_path)
            file_tree = get_full_file_tree(repo_path)
            file_contents = get_file_contents(repo_path)
            manifest_files = get_manifest_files(repo_path)

            try:
                file_count = sum(1 for _ in Path(repo_path).rglob('*') if _.is_file() and '.git' not in str(_))
            except Exception:
                file_count = len(code_samples)

            repo_name = repo_url.rstrip('/').split('/')[-1].replace('.git', '')
            repo_stats = get_github_stats(repo_url)

            # Step 3: AI Analysis
            logger.info(f"[{analysis_id}] Running AI analysis...")
            ai_result = analyze_code_with_ai(code_samples, repo_name, languages, frameworks, file_tree, manifest_files)
            elapsed = round(time.time() - start_time, 2)

            if ai_result:
                result = ArchitectureResult(
                    mermaid_code=ai_result.get("mermaid_diagram", "graph TD\n    A[App] --> B[Core]"),
                    summary=ai_result.get("summary", f"Analysis of {repo_name}"),
                    key_components=ai_result.get("key_components", frameworks),
                    key_patterns=ai_result.get("design_patterns", ["Modular Architecture"]),
                    files_analyzed=file_count,
                    processing_time=elapsed,
                    repo_stats=repo_stats
                )
            else:
                result = ArchitectureResult(
                    mermaid_code=f"graph TD\n    A[{repo_name}] --> B[Core]\n    B --> C[Services]",
                    summary=f"This is a {', '.join(languages[:3])} project using {', '.join(frameworks[:3])}.",
                    key_components=frameworks,
                    key_patterns=["Modular Architecture"],
                    files_analyzed=file_count,
                    processing_time=elapsed,
                    repo_stats=repo_stats
                )

            result_dict = result.model_dump()
            result_dict["file_tree"] = file_tree
            result_dict["file_contents"] = file_contents

            store.update_analysis_status(analysis_id, "completed", result=result_dict)

            if sha:
                cache_key = _get_sha_cache_key(repo_url, branch, sha)
                store.set_cache(cache_key, result_dict, ttl=604800)

            logger.info(f"[{analysis_id}] Task completed in {elapsed}s.")
            return result_dict

    except Exception as exc:
        logger.error(f"[{analysis_id}] Analysis task failed: {exc}", exc_info=True)
        store.update_analysis_status(analysis_id, "failed")
        raise exc


@celery_app.task(bind=True, max_retries=1, default_retry_delay=5, soft_time_limit=300, time_limit=360)
def analyze_repository_task(self, analysis_id: str, repo_url: str, branch: str = "main"):
    try:
        return perform_analysis(analysis_id, repo_url, branch)
    except Exception as exc:
        if self.request.retries < self.max_retries:
            logger.info(f"[{analysis_id}] Retrying Celery task...")
            raise self.retry(exc=exc)
        raise exc

