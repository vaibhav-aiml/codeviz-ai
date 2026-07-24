import json
from abc import ABC, abstractmethod
from typing import Any

import openai
from groq import Groq
from pydantic import BaseModel, ValidationError

from .config import settings
from .logger import logger


class ArchitectureLLMResponse(BaseModel):
    architecture_style: str
    summary: str
    key_components: list[str]
    design_patterns: list[str]
    mermaid_diagram: str
    recommendations: str

def _clean_mermaid_diagram(code: str) -> str:
    if not code or not isinstance(code, str):
        return "graph TD\n    A[App] --> B[Core]"

    lines = []
    for line in code.splitlines():
        trimmed = line.strip()
        if trimmed.startswith("```"):
            continue
        lines.append(line)
    text = "\n".join(lines).strip()

    text = text.replace("→", "-->").replace("⇒", "==>")

    import re
    text = re.sub(r'--\|([^|]+)\|>', r'-->|\1|', text)
    text = re.sub(r'--\|([^|]+)\|->', r'-->|\1|', text)
    text = re.sub(r'---\|([^|]+)\|>', r'-->|\1|', text)
    text = re.sub(r'-->\|([^|]+)\|>', r'-->|\1|', text)
    text = re.sub(r'(?<=\s)->(?=\s)', r'-->', text)

    # Automatically quote node labels containing special characters like ( ) / : .
    def replace_bracket(match):
        label = match.group(1).strip()
        if label.startswith('"') and label.endswith('"'):
            inner = label[1:-1].replace('"', "'")
            return f'["{inner}"]'
        safe_label = label.replace('"', "'")
        return f'["{safe_label}"]'

    text = re.sub(r'(?<=[a-zA-Z0-9_\-\$])\[([^\]\n]+)\]', replace_bracket, text)

    header_keywords = ["graph", "flowchart", "sequenceDiagram", "classDiagram", "stateDiagram", "erDiagram"]
    if not any(text.lstrip().startswith(kw) for kw in header_keywords):
        text = "graph TD\n" + text

    return text

def _clean_json_text(text: str) -> str:
    text = text.strip()
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            part_str = part.strip()
            if part_str.startswith("json"):
                part_str = part_str[4:].strip()
            if part_str.startswith("{") and part_str.endswith("}"):
                return part_str
    start_idx = text.find("{")
    end_idx = text.rfind("}")
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        return text[start_idx:end_idx + 1]
    return text

class BaseLLMProvider(ABC):
    @abstractmethod
    def analyze_code(
        self,
        code_samples: dict[str, str],
        repo_name: str,
        languages: list[str],
        frameworks: list[str],
        file_tree: dict = None,
        manifest_files: dict = None
    ) -> dict[str, Any] | None:
        pass

class GroqLLMProvider(BaseLLMProvider):
    def analyze_code(
        self,
        code_samples: dict[str, str],
        repo_name: str,
        languages: list[str],
        frameworks: list[str],
        file_tree: dict = None,
        manifest_files: dict = None
    ) -> dict[str, Any] | None:
        api_key = settings.GROQ_API_KEY
        if not api_key:
            logger.error("GROQ_API_KEY is missing.")
            return None

        client = Groq(api_key=api_key)

        code_text = ""
        for file_path, content in list(code_samples.items())[:40]:
            code_text += f"\n--- {file_path} ---\n{content[:1200]}\n"

        tree_summary = ""
        if file_tree:
            for path, info in list(file_tree.items())[:60]:
                files = ", ".join(info.get("files", [])[:10])
                tree_summary += f"{path}/: {files}\n"

        manifest_text = ""
        if manifest_files:
            for name, content in manifest_files.items():
                manifest_text += f"\n--- {name} ---\n{content[:1500]}\n"

        prompt = f"""You are a senior staff software architect conducting a technical architecture review
for a code review board. You will be graded on ACCURACY, not on how "impressive" the diagram looks.

Repository: {repo_name}
Detected languages: {', '.join(languages) if languages else 'unknown'}
Detected framework indicators: {', '.join(frameworks) if frameworks else 'unknown'}

## Folder structure
{tree_summary or 'Not provided'}

## Dependency manifests
{manifest_text or 'Not provided'}

## Source code samples
{code_text[:20000]}

## HARD RULES — read before answering
1. Only describe components, services, and patterns that you can point to evidence for in the code above.
   Do NOT invent generic components (e.g. "API Gateway", "Service Registry", "Load Balancer") unless a
   specific file, import, or config actually implements one.
2. Name real modules/files/classes/functions where relevant (e.g. "the Celery task in tasks.py",
   "the Redis-backed RedisStateStore in redis_client.py") instead of generic labels.
3. If the architecture is a monolith, single API service, or CLI tool — say so plainly. Do not force-fit
   it into a microservices template.
4. The mermaid diagram's nodes must correspond 1:1 to real modules/services/external systems you found
   evidence for (e.g. actual queue technology, actual cache, actual external APIs called, actual DB — or
   "no persistent database" if none exists). Include external dependencies (third-party APIs, LLM providers,
   webhooks) as separate nodes with the real service name.
5. In "recommendations", give 2-3 SPECIFIC, actionable engineering critiques tied to code you actually
   saw (e.g. blocking calls in async context, missing input validation, N+1 patterns) — not generic advice
   like "add more tests" or "improve documentation" unless nothing more specific applies.
6. MERMAID SYNTAX CONSTRAINTS:
   - Use standard flowchart syntax: "graph TD"
   - Link syntax with text: A -->|label| B or A -- label --> B (NEVER use invalid arrows like --|label|> or --->|label|>)
   - Arrow syntax: A --> B (NEVER use single dash A -> B)
   - Node labels containing special characters (slashes, parentheses, colons) MUST be enclosed in quotes: A["Module (app/main.py)"]

Return ONLY valid JSON matching this exact schema:
{{
    "architecture_style": "Precise style based on evidence (e.g. 'Task-queue-backed API service' not 'Microservices')",
    "summary": "4-6 sentence technical summary covering: request lifecycle, background processing model, state/caching strategy, and external integrations — grounded in specific files/modules",
    "key_components": ["Real component 1 (file/module)", "Real component 2 (file/module)", "..."],
    "design_patterns": ["Pattern actually observed, e.g. 'Repository pattern (RedisStateStore)'", "..."],
    "mermaid_diagram": "graph TD\\n    ... (nodes = real modules/services only, labeled specifically)",
    "recommendations": "2-3 specific, evidence-based engineering recommendations"
}}"""

        system_msg = ("You are a senior staff software architect. You never invent generic architecture "
                      "patterns not supported by the code shown. Precision and specificity over "
                      "impressiveness. Return ONLY valid JSON matching the exact schema.")

        for attempt in range(1, 3):
            try:
                logger.info(f"[GroqLLMProvider] Sending request (attempt {attempt}) for {repo_name}...")
                messages = [
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": prompt}
                ]
                if attempt == 2:
                    messages.append({
                        "role": "system",
                        "content": "CRITICAL: Previous response failed JSON validation. Return STRICT raw JSON ONLY without markdown wrapper."
                    })

                response = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=messages,
                    temperature=0.2 if attempt == 2 else 0.3,
                    max_tokens=2500
                )

                raw_text = response.choices[0].message.content or ""
                cleaned = _clean_json_text(raw_text)
                parsed = json.loads(cleaned)
                if "mermaid_diagram" in parsed:
                    parsed["mermaid_diagram"] = _clean_mermaid_diagram(parsed["mermaid_diagram"])
                validated = ArchitectureLLMResponse(**parsed)
                logger.info("[GroqLLMProvider] Successfully parsed and validated LLM response.")
                return validated.model_dump()
            except (json.JSONDecodeError, ValidationError) as err:
                logger.warning(f"[GroqLLMProvider] Parse/validation error attempt {attempt}: {err}")
            except Exception as err:
                logger.error(f"[GroqLLMProvider] API error attempt {attempt}: {err}")
                if attempt == 2:
                    break

        return None

class OpenAILLMProvider(BaseLLMProvider):
    def analyze_code(
        self,
        code_samples: dict[str, str],
        repo_name: str,
        languages: list[str],
        frameworks: list[str],
        file_tree: dict = None,
        manifest_files: dict = None
    ) -> dict[str, Any] | None:
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            logger.error("OPENAI_API_KEY is missing.")
            return None

        client = openai.OpenAI(api_key=api_key)

        code_text = ""
        for file_path, content in list(code_samples.items())[:40]:
            code_text += f"\n--- {file_path} ---\n{content[:1200]}\n"

        tree_summary = ""
        if file_tree:
            for path, info in list(file_tree.items())[:60]:
                files = ", ".join(info.get("files", [])[:10])
                tree_summary += f"{path}/: {files}\n"

        manifest_text = ""
        if manifest_files:
            for name, content in manifest_files.items():
                manifest_text += f"\n--- {name} ---\n{content[:1500]}\n"

        prompt = f"""You are a senior staff software architect conducting a technical architecture review
for a code review board. You will be graded on ACCURACY, not on how "impressive" the diagram looks.

Repository: {repo_name}
Detected languages: {', '.join(languages) if languages else 'unknown'}
Detected framework indicators: {', '.join(frameworks) if frameworks else 'unknown'}

## Folder structure
{tree_summary or 'Not provided'}

## Dependency manifests
{manifest_text or 'Not provided'}

## Source code samples
{code_text[:20000]}

## HARD RULES — read before answering
1. Only describe components, services, and patterns that you can point to evidence for in the code above.
   Do NOT invent generic components (e.g. "API Gateway", "Service Registry", "Load Balancer") unless a
   specific file, import, or config actually implements one.
2. Name real modules/files/classes/functions where relevant (e.g. "the Celery task in tasks.py",
   "the Redis-backed RedisStateStore in redis_client.py") instead of generic labels.
3. If the architecture is a monolith, single API service, or CLI tool — say so plainly. Do not force-fit
   it into a microservices template.
4. The mermaid diagram's nodes must correspond 1:1 to real modules/services/external systems you found
   evidence for (e.g. actual queue technology, actual cache, actual external APIs called, actual DB — or
   "no persistent database" if none exists). Include external dependencies (third-party APIs, LLM providers,
   webhooks) as separate nodes with the real service name.
5. In "recommendations", give 2-3 SPECIFIC, actionable engineering critiques tied to code you actually
   saw (e.g. blocking calls in async context, missing input validation, N+1 patterns) — not generic advice
   like "add more tests" or "improve documentation" unless nothing more specific applies.

Return ONLY valid JSON matching this exact schema:
{{
    "architecture_style": "Precise style based on evidence (e.g. 'Task-queue-backed API service' not 'Microservices')",
    "summary": "4-6 sentence technical summary covering: request lifecycle, background processing model, state/caching strategy, and external integrations — grounded in specific files/modules",
    "key_components": ["Real component 1 (file/module)", "Real component 2 (file/module)", "..."],
    "design_patterns": ["Pattern actually observed, e.g. 'Repository pattern (RedisStateStore)'", "..."],
    "mermaid_diagram": "graph TD\\n    ... (nodes = real modules/services only, labeled specifically)",
    "recommendations": "2-3 specific, evidence-based engineering recommendations"
}}"""

        system_msg = ("You are a senior staff software architect. You never invent generic architecture "
                      "patterns not supported by the code shown. Precision and specificity over "
                      "impressiveness. Return ONLY valid JSON matching the exact schema.")

        try:
            logger.info(f"[OpenAILLMProvider] Sending OpenAI request for {repo_name}...")
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=2500
            )

            raw_text = response.choices[0].message.content or ""
            parsed = json.loads(raw_text)
            if "mermaid_diagram" in parsed:
                parsed["mermaid_diagram"] = _clean_mermaid_diagram(parsed["mermaid_diagram"])
            validated = ArchitectureLLMResponse(**parsed)
            return validated.model_dump()
        except Exception as e:
            logger.error(f"[OpenAILLMProvider] Analysis failed: {e}")
            return None

def get_llm_provider() -> BaseLLMProvider:
    provider_name = (settings.LLM_PROVIDER or "groq").lower().strip()
    if provider_name == "openai":
        return OpenAILLMProvider()
    return GroqLLMProvider()
