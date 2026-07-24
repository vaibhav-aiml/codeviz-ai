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
    def analyze_code(self, code_samples: dict[str, str], repo_name: str, languages: list[str], frameworks: list[str]) -> dict[str, Any] | None:
        pass

class GroqLLMProvider(BaseLLMProvider):
    def analyze_code(self, code_samples: dict[str, str], repo_name: str, languages: list[str], frameworks: list[str]) -> dict[str, Any] | None:
        api_key = settings.GROQ_API_KEY
        if not api_key:
            logger.error("GROQ_API_KEY is missing.")
            return None

        client = Groq(api_key=api_key)
        code_text = ""
        for file_path, content in list(code_samples.items())[:20]:
            code_text += f"\n--- {file_path} ---\n{content[:500]}\n"

        prompt = f"""You are a software architecture expert. Analyze this codebase:

Repository: {repo_name}
Languages: {', '.join(languages) if languages else 'unknown'}
Frameworks: {', '.join(frameworks) if frameworks else 'unknown'}

Code samples:
{code_text[:8000]}

Return ONLY valid JSON matching exact fields:
{{
    "architecture_style": "Microservices / Monolith / MVC etc",
    "summary": "3-4 sentence architecture summary",
    "key_components": ["Component1", "Component2"],
    "design_patterns": ["Pattern1", "Pattern2"],
    "mermaid_diagram": "graph TD\\n    A[Frontend] --> B[API]",
    "recommendations": "Architecture improvement suggestions"
}}"""

        system_msg = "You are a software architecture expert. Return ONLY valid JSON matching the exact schema."

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
                    max_tokens=2000
                )

                raw_text = response.choices[0].message.content or ""
                cleaned = _clean_json_text(raw_text)
                parsed = json.loads(cleaned)
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
    def analyze_code(self, code_samples: dict[str, str], repo_name: str, languages: list[str], frameworks: list[str]) -> dict[str, Any] | None:
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            logger.error("OPENAI_API_KEY is missing.")
            return None

        client = openai.OpenAI(api_key=api_key)
        code_text = ""
        for file_path, content in list(code_samples.items())[:20]:
            code_text += f"\n--- {file_path} ---\n{content[:500]}\n"

        prompt = f"""You are a software architecture expert. Analyze this codebase:

Repository: {repo_name}
Languages: {', '.join(languages) if languages else 'unknown'}
Frameworks: {', '.join(frameworks) if frameworks else 'unknown'}

Code samples:
{code_text[:8000]}

Return JSON:
{{
    "architecture_style": "Microservices / Monolith / MVC etc",
    "summary": "3-4 sentence architecture summary",
    "key_components": ["Component1", "Component2"],
    "design_patterns": ["Pattern1", "Pattern2"],
    "mermaid_diagram": "graph TD\\n    A[Frontend] --> B[API]",
    "recommendations": "Architecture improvement suggestions"
}}"""

        try:
            logger.info(f"[OpenAILLMProvider] Sending OpenAI request for {repo_name}...")
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a software architecture expert. Return ONLY valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=2000
            )

            raw_text = response.choices[0].message.content or ""
            parsed = json.loads(raw_text)
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
