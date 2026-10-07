import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.middleware import CsrfMiddleware, SecurityHeadersMiddleware
from app.api.routes import auth, memberships, meta, tenants, workforce
from app.core.config import settings
from app.core.exceptions import AppError
from app.core.limiter import limiter
from app.db.session import SessionLocal
from app.services.seed_service import seed_operator

logger = logging.getLogger("sistemaponto")


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    db = SessionLocal()
    try:
        seed_operator(db)
    finally:
        db.close()
    yield


def create_app() -> FastAPI:
    docs = None if settings.is_production else "/docs"
    redoc = None if settings.is_production else "/redoc"
    openapi = None if settings.is_production else "/openapi.json"
    app = FastAPI(
        title="sistemaponto",
        lifespan=lifespan,
        docs_url=docs,
        redoc_url=redoc,
        openapi_url=openapi,
    )
    app.state.limiter = limiter
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_handler)
    app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
    app.add_exception_handler(StarletteHTTPException, http_handler)
    app.add_exception_handler(Exception, unexpected_handler)
    app.add_middleware(CsrfMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "X-CSRF-Token", "X-Client", "Authorization"],
    )
    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(tenants.router, prefix="/api/v1")
    app.include_router(memberships.router, prefix="/api/v1")
    app.include_router(meta.router, prefix="/api/v1")
    for router in workforce.routers:
        app.include_router(router, prefix="/api/v1")
    return app


def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"data": None, "error": {"message": exc.message}},
    )


def validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"data": None, "error": {"message": "Dados inválidos"}},
    )


def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"data": None, "error": {"message": "Muitas tentativas. Tente novamente em instantes."}},
    )


def http_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    message = exc.detail if isinstance(exc.detail, str) else "Erro"
    return JSONResponse(
        status_code=exc.status_code,
        content={"data": None, "error": {"message": message}},
    )


def unexpected_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("erro interno")
    message = "Erro interno" if settings.is_production else "Erro interno"
    return JSONResponse(
        status_code=500,
        content={"data": None, "error": {"message": message}},
    )


app = create_app()
