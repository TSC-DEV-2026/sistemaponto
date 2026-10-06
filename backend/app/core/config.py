from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:5175"
    PUBLIC_APP_URL: str = "http://localhost:5175"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    AUTHENTICATOR_BASE_URL: str = "http://localhost:8001"
    AUTHENTICATOR_API_KEY: str

    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET: str = ""
    R2_ENDPOINT: str = ""

    SEED_COMPANY_NAME: str = ""
    SEED_ADMIN_CPF: str = ""
    SEED_ADMIN_EMAIL: str = ""
    SEED_ADMIN_FULL_NAME: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip().rstrip("/") for item in self.CORS_ORIGINS.split(",") if item.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


settings = Settings()
