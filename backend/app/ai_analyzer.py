import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

def get_groq_client():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not found")
    return Groq(api_key=api_key)

def analyze_code_with_ai(code_samples, repo_name, languages, frameworks):
    client = get_groq_client()
    
    code_text = ""
    for file_path, content in list(code_samples.items())[:20]:
        code_text += f"\n--- {file_path} ---\n{content[:500]}\n"
    
    prompt = f"""You are a software architecture expert. Analyze this codebase:

Repository: {repo_name}
Languages: {', '.join(languages) if languages else 'unknown'}
Frameworks: {', '.join(frameworks) if frameworks else 'unknown'}

Code samples:
{code_text[:8000]}

Return ONLY valid JSON (no markdown, no code blocks):
{{
    "architecture_style": "Microservices / Monolith / MVC etc",
    "summary": "3-4 sentence architecture summary",
    "key_components": ["Component1", "Component2", "Component3"],
    "design_patterns": ["Pattern1", "Pattern2"],
    "mermaid_diagram": "graph TD\\n    A[Frontend] --> B[API]\\n    B --> C[Database]",
    "recommendations": "Architecture improvement suggestions"
}}"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a software architecture expert. Return ONLY valid JSON, no markdown."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=2000
        )
        
        result_text = response.choices[0].message.content.strip()
        
        if "```" in result_text:
            result_text = result_text.split("```")[1]
            if result_text.startswith("json"):
                result_text = result_text[4:]
        result_text = result_text.strip()
        
        return json.loads(result_text)
        
    except Exception as e:
        print(f"AI analysis error: {e}")
        return None