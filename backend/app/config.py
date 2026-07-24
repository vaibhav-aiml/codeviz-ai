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
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    MAX_REPO_SIZE_MB: int = 200
    RATE_LIMIT_PER_MINUTE: int = 5
    SENTRY_DSN: str = ""
    GITHUB_WEBHOOK_SECRET: str = ""
    LLM_PROVIDER: str = "groq"
    OPENAI_API_KEY: str = ""

    @property
    def cors_origins(self) -> list[str]:
        if not self.ALLOWED_ORIGINS:
            return ["http://localhost:3000"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

settings = Settings()
