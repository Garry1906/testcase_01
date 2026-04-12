"""
Environment variable validation — fails fast if required vars are missing.
Import settings at the top of your Python entry point.

Install: pip install pydantic pydantic-settings
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # Required — app raises ValidationError on startup if missing
    database_url: str
    openai_api_key: str

    # Optional with defaults
    python_host: str = "0.0.0.0"
    python_port: int = 8000
    python_log_level: str = "DEBUG"
    debug: bool = False

    model_config = {"env_file": ".env", "extra": "ignore"}

    @field_validator("database_url")
    @classmethod
    def database_url_must_not_be_placeholder(cls, v: str) -> str:
        if "your-" in v or "password@localhost" in v and "user:" in v:
            import warnings

            warnings.warn(
                "DATABASE_URL appears to be a placeholder value", stacklevel=2
            )
        return v


settings = Settings()  # Raises ValidationError immediately if required vars missing
