import asyncio
import tempfile
import os
from git import Repo
from pathlib import Path
from .models import ArchitectureResult
from .ai_analyzer import analyze_code_with_ai
from .github_stats import get_github_stats

analyses_ref = None

def set_analyses_ref(ref):
    global analyses_ref
    analyses_ref = ref

def get_code_samples(repo_path, max_files=30, max_size=500):
    """Get code samples from repository"""
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
                except:
                    pass
    return samples

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
                except:
                    pass
    except:
        pass
    
    for indicator, framework in indicators.items():
        for f in repo_files:
            if indicator in f.lower():
                if framework not in frameworks:
                    frameworks.append(framework)
    
    return frameworks[:5] if frameworks else ['General Application']

async def analyze_repository_task(analysis_id: str, repo_url: str, branch: str):
    """AI-powered analysis pipeline"""
    try:
        if analyses_ref is None:
            print("ERROR: analyses_ref not set!")
            return
            
        print(f"\n🚀 Analyzing: {repo_url}")
        
        # Step 1: Clone
        analyses_ref[analysis_id]["status"] = "cloning"
        print("📦 Cloning repository...")
        
        with tempfile.TemporaryDirectory() as tmpdir:
            repo_path = os.path.join(tmpdir, "repo")
            Repo.clone_from(repo_url, repo_path, branch=branch, depth=1)
            print("✅ Cloned!")
            
            # Step 2: Analyze code
            analyses_ref[analysis_id]["status"] = "analyzing"
            print("🔍 Extracting code samples...")
            
            code_samples = get_code_samples(repo_path)
            languages = detect_languages(repo_path)
            frameworks = detect_framework(repo_path)
            
            try:
                file_count = sum(1 for _ in Path(repo_path).rglob('*') if _.is_file() and '.git' not in str(_))
            except:
                file_count = len(code_samples)
            
            repo_name = repo_url.split('/')[-1].replace('.git', '')
            
            print(f"   Languages: {languages}")
            print(f"   Frameworks: {frameworks}")
            print(f"   Files: {file_count}")
            
            # Fetch GitHub stats
            print("📊 Fetching GitHub stats...")
            repo_stats = get_github_stats(repo_url)
            if repo_stats and "error" not in repo_stats:
                print(f"   ⭐ Stars: {repo_stats.get('stars')}, Forks: {repo_stats.get('forks')}")
            else:
                print(f"   Stats unavailable: {repo_stats.get('error', 'unknown') if repo_stats else 'no response'}")
            
            # Step 3: AI Analysis
            analyses_ref[analysis_id]["status"] = "analyzing"
            print("🤖 Running AI analysis...")
            
            ai_result = analyze_code_with_ai(code_samples, repo_name, languages, frameworks)
            
            if ai_result:
                print("✅ AI analysis complete!")
                
                result = ArchitectureResult(
                    mermaid_code=ai_result.get("mermaid_diagram", "graph TD\n    A[App] --> B[Core]"),
                    summary=ai_result.get("summary", f"Analysis of {repo_name}"),
                    key_components=ai_result.get("key_components", frameworks),
                    key_patterns=ai_result.get("design_patterns", ["Modular Architecture"]),
                    files_analyzed=file_count,
                    processing_time=0.0,
                    repo_stats=repo_stats
                )
            else:
                print("⚠️ AI failed, using fallback")
                result = ArchitectureResult(
                    mermaid_code=f"graph TD\n    A[{repo_name}] --> B[Core]\n    B --> C[Services]",
                    summary=f"This is a {', '.join(languages[:3])} project using {', '.join(frameworks[:3])}.",
                    key_components=frameworks,
                    key_patterns=["Modular Architecture"],
                    files_analyzed=file_count,
                    processing_time=0.0,
                    repo_stats=repo_stats
                )
            
            analyses_ref[analysis_id]["status"] = "completed"
            analyses_ref[analysis_id]["result"] = result.model_dump()
            print("✅ DONE!")
            
    except Exception as e:
        print(f"❌ FAILED: {type(e).__name__}: {e}")
        if analyses_ref and analysis_id in analyses_ref:
            analyses_ref[analysis_id]["status"] = "failed"