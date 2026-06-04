import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./robonexus.db"

    # JWT
    JWT_SECRET_KEY: str = "your-secret-key-change-this-in-production-use-openssl-rand-hex-32"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "https://zhouyubo868-bot.github.io"
    ]

    # Verification Code
    VERIFICATION_CODE_EXPIRE_MINUTES: int = 5

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
