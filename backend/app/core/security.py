import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.core.config import settings
from app.core.exceptions import AppError

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"
CSRF_COOKIE = "csrf_token"
PASSWORD_MIN = 8
PASSWORD_MAX = 72


def validate_password(password: str) -> None:
    if len(password) < PASSWORD_MIN or len(password) > PASSWORD_MAX:
        raise AppError(400, "A senha deve ter entre 8 e 72 caracteres")


def new_secret() -> str:
    return secrets.token_urlsafe(48)


def hash_secret(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _encode(payload: dict) -> str:
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def _decode(token: str) -> dict:
    # sub fica numérico, como no contrato. python-jose recusa isso com verify_sub ligado.
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
        options={"verify_sub": False},
    )


def _stamp(person_id: int, auth_version: int, tenant_id: int | None, typ: str, exp: int, iat: int) -> dict:
    payload: dict = {
        "sub": person_id,
        "auth_version": auth_version,
        "typ": typ,
        "iat": iat,
        "exp": exp,
    }
    if tenant_id is not None:
        payload["tenant_id"] = tenant_id
    return payload


def create_access_token(person_id: int, auth_version: int, tenant_id: int | None) -> str:
    now = utcnow()
    exp = int((now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)).timestamp())
    return _encode(_stamp(person_id, auth_version, tenant_id, "access", exp, int(now.timestamp())))


def decode_access_token(token: str) -> dict:
    payload = _decode(token)
    if payload.get("typ") != "access":
        raise JWTError("typ inválido")
    return payload


def create_refresh_token(person_id: int, auth_version: int, tenant_id: int | None) -> tuple[str, datetime]:
    now = utcnow()
    expires = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = _stamp(person_id, auth_version, tenant_id, "refresh", int(expires.timestamp()), int(now.timestamp()))
    payload["jti"] = new_secret()
    return _encode(payload), expires


def decode_refresh_token(token: str) -> dict:
    payload = _decode(token)
    if payload.get("typ") != "refresh" or not payload.get("jti"):
        raise JWTError("typ inválido")
    return payload


def read_tenant_id(payload: dict) -> int | None:
    raw = payload.get("tenant_id")
    if raw is None:
        return None
    return int(raw)


__all__ = ["JWTError"]
