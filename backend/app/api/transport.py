from fastapi import Request
from fastapi.responses import JSONResponse

from app.api.cookies import set_auth_cookies
from app.api.responses import json_data
from app.core.config import settings
from app.core.security import REFRESH_COOKIE
from app.services.auth_service import IssuedSession


def use_cookie_transport(request: Request) -> bool:
    origin = request.headers.get("origin", "").rstrip("/")
    if origin and origin in settings.cors_origins:
        return True
    client = request.headers.get("x-client", "web").strip().lower()
    return client != "mobile"


def read_refresh(request: Request, body_token: str | None) -> str | None:
    if use_cookie_transport(request):
        return request.cookies.get(REFRESH_COOKIE)
    return body_token


def respond_session(request: Request, issued: IssuedSession, status_code: int = 200) -> JSONResponse:
    if use_cookie_transport(request):
        response = json_data(issued.view.model_dump(mode="json"), status_code=status_code)
        set_auth_cookies(response, issued)
        return response
    payload = issued.view.model_dump(mode="json")
    payload["access_token"] = issued.access_token
    payload["refresh_token"] = issued.refresh_token
    return json_data(payload, status_code=status_code)
