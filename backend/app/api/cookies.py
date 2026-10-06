from starlette.responses import Response

from app.core.config import settings
from app.core.security import ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE
from app.services.auth_service import IssuedSession


def set_auth_cookies(response: Response, session: IssuedSession) -> None:
    secure = settings.COOKIE_SECURE
    samesite = settings.COOKIE_SAMESITE
    response.set_cookie(
        ACCESS_COOKIE,
        session.access_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
    )
    response.set_cookie(
        REFRESH_COOKIE,
        session.refresh_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/api/v1/auth",
    )
    response.set_cookie(
        CSRF_COOKIE,
        session.csrf_token,
        httponly=False,
        secure=secure,
        samesite=samesite,
        path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path="/api/v1/auth")
    response.delete_cookie(CSRF_COOKIE, path="/")
