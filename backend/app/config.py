from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    GROQ_API_KEY: str = ""
    GITHUB_TOKEN: str = ""
    REDIS_URL: str = "redis://localhost:6379/0"
    ALLOWED_ORIGINS: str = "*"
    MAX_REPO_SIZE_MB: int = 200
    RATE_LIMIT_PER_MINUTE: int = 5
    SENTRY_DSN: str = ""
    GITHUB_WEBHOOK_SECRET: str = ""
    LLM_PROVIDER: str = "groq"
    OPENAI_API_KEY: str = ""

    @property
    def cors_origins(self) -> list[str]:
        if not self.ALLOWED_ORIGINS or self.ALLOWED_ORIGINS.strip() == "*":
            return ["*"]
        origins = []
        for raw_origin in self.ALLOWED_ORIGINS.split(","):
            cleaned = raw_origin.strip().rstrip("/")
            if cleaned:
                origins.append(cleaned)
        return origins if origins else ["*"]

settings = Settings()
