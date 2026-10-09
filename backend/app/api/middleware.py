import secrets

from starlette.requests import Request
from starlette.responses import JSONResponse

from app.api.transport import use_cookie_transport
from app.core.config import settings
from app.core.security import CSRF_COOKIE, new_secret


def _same(left: str, right: str) -> bool:
    if len(left) != len(right):
        return False
    return secrets.compare_digest(left, right)


def _needs_csrf(request: Request) -> bool:
    if request.method not in ("POST", "PUT", "DELETE"):
        return False
    if not request.url.path.startswith("/api/v1"):
        return False
    authorization = request.headers.get("authorization", "")
    if authorization.lower().startswith("bearer "):
        return False
    return use_cookie_transport(request)


def _cookie_header() -> bytes:
    response = JSONResponse(content={})
    response.set_cookie(
        CSRF_COOKIE,
        new_secret(),
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )
    return response.headers["set-cookie"].encode("latin-1")


class CsrfMiddleware:
    def __init__(self, app) -> None:
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        request = Request(scope)
        if _needs_csrf(request):
            cookie = request.cookies.get(CSRF_COOKIE)
            header = request.headers.get("x-csrf-token")
            if not cookie or not header or not _same(cookie, header):
                response = JSONResponse(
                    status_code=403,
                    content={"data": None, "error": {"message": "CSRF inválido"}},
                )
                await response(scope, receive, send)
                return

        async def send_wrapper(message):
            if message["type"] == "http.response.start" and CSRF_COOKIE not in request.cookies:
                headers = list(message.get("headers") or [])
                already = any(
                    key.lower() == b"set-cookie" and value.startswith(b"csrf_token=")
                    for key, value in headers
                )
                if not already:
                    headers.append((b"set-cookie", _cookie_header()))
                    message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)


class SecurityHeadersMiddleware:
    def __init__(self, app) -> None:
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers") or [])
                extra = [
                    (b"x-content-type-options", b"nosniff"),
                    (b"x-frame-options", b"DENY"),
                    (b"referrer-policy", b"strict-origin-when-cross-origin"),
                ]
                if settings.COOKIE_SECURE:
                    extra.append((b"strict-transport-security", b"max-age=31536000; includeSubDomains"))
                headers.extend(extra)
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)
