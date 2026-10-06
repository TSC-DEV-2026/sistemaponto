import os

os.environ["DATABASE_URL"] = "postgresql+psycopg://user:pass@localhost:5432/sistemaponto"
os.environ["JWT_SECRET_KEY"] = "test-secret"
os.environ["AUTHENTICATOR_API_KEY"] = "test-key"
os.environ["AUTHENTICATOR_BASE_URL"] = "http://localhost:8001"
os.environ["PUBLIC_APP_URL"] = "http://localhost:5175"
os.environ["ENVIRONMENT"] = "development"
os.environ["CORS_ORIGINS"] = "http://localhost:5175"
