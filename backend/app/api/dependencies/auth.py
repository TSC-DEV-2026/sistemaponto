from dataclasses import dataclass

from fastapi import Depends, Request
from jose import JWTError
from sqlalchemy.orm import Session

from app.api.dependencies.database import get_db
from app.core.exceptions import AppError
from app.core.security import ACCESS_COOKIE, decode_access_token, read_tenant_id
from app.repositories.membership_repository import MembershipRepository


@dataclass
class Actor:
    person_id: int
    auth_version: int
    tenant_id: int | None
    role: str | None = None


def read_access_token(request: Request) -> str | None:
    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        token = header[7:].strip()
        return token or None
    return request.cookies.get(ACCESS_COOKIE)


def get_actor(request: Request) -> Actor:
    token = read_access_token(request)
    if not token:
        raise AppError(401, "Não autenticado")
    try:
        payload = decode_access_token(token)
        return Actor(
            person_id=int(payload["sub"]),
            auth_version=int(payload["auth_version"]),
            tenant_id=read_tenant_id(payload),
        )
    except (JWTError, KeyError, TypeError, ValueError):
        raise AppError(401, "Não autenticado") from None


def optional_actor(request: Request) -> Actor | None:
    if read_access_token(request) is None:
        return None
    try:
        return get_actor(request)
    except AppError:
        return None


def require_tenant(request: Request, db: Session = Depends(get_db)) -> Actor:
    actor = get_actor(request)
    if actor.tenant_id is None:
        raise AppError(403, "Escolha uma empresa")
    membership = MembershipRepository(db).get_by_person_and_tenant(actor.person_id, actor.tenant_id)
    if membership is None:
        raise AppError(403, "Sem vínculo neste sistema")
    actor.role = membership.role
    return actor


def require_admin(actor: Actor = Depends(require_tenant)) -> Actor:
    if actor.role != "admin":
        raise AppError(403, "Sem permissão")
    return actor
