from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "ProjectHub"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str = "change-me-in-production"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost"]

    DATABASE_URL: str = "postgresql+asyncpg://projecthub:secret@localhost:5432/projecthub"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_RECYCLE: int = 3600

    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 300

    OIDC_ISSUER_URL: str = "https://keycloak.example.com/realms/projecthub"
    OIDC_CLIENT_ID: str = "projecthub-backend"
    OIDC_CLIENT_SECRET: str = "change-me"
    OIDC_AUDIENCE: str | None = None
    OIDC_JWKS_CACHE_TTL: int = 3600

    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_ACCESS_KEY_ID: str = "minioadmin"
    S3_SECRET_ACCESS_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "projecthub-attachments"
    S3_PRESIGN_EXPIRY: int = 3600

    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    WS_HEARTBEAT_INTERVAL: int = 30

    # Phase 6: Auth configuration
    AUTH_MODE: str = ""
    INITIAL_ADMIN_EMAIL: str = ""
    LOCAL_REGISTRATION_ENABLED: str = ""
    OIDC_AUTO_PROVISION: str = ""
    OIDC_ALLOWED_DOMAINS: str = ""
    OIDC_DEFAULT_ORG_ID: str = ""
    OIDC_ADMIN_CLAIM: str = ""
    LOCAL_JWT_EXPIRE_MINUTES: int = 60

    # Phase 8: AI / LLM configuration
    LLM_PROVIDER: str = ""
    LLM_MODEL: str = ""
    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = ""
    LLM_MAX_TOKENS: int = 16384
    LLM_CONTEXT_WINDOW: int = 131072
    LLM_TEMPERATURE: float = 0.7

    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_API_VERSION: str = "2024-06-01"
    AZURE_OPENAI_DEPLOYMENT: str = ""

    # Phase 11: Email / SMTP
    SMTP_ENABLED: bool = False
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@projecthub.local"
    SMTP_FROM_NAME: str = "ProjectHub"
    SMTP_USE_TLS: bool = True
    APP_BASE_URL: str = "http://localhost"

    EMBEDDING_PROVIDER: str = ""
    EMBEDDING_MODEL: str = ""
    EMBEDDING_API_KEY: str = ""
    EMBEDDING_BASE_URL: str = ""
    EMBEDDING_DIMENSIONS: int = 1536

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
