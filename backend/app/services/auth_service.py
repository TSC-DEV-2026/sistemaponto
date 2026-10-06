import logging
from dataclasses import dataclass

from jose import JWTError

from app.core.config import settings
from app.core.cpf import normalize_cpf, normalize_email
from app.core.exceptions import AppError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_secret,
    new_secret,
    read_tenant_id,
    utcnow,
    validate_password,
)
from app.repositories.membership_repository import MembershipRepository
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.tenant_repository import TenantRepository
from app.schemas.auth import RegisterCreate, SessionOut
from app.schemas.tenant import TenantOut
from app.services.authenticator_client import AuthenticatorClient, RemotePerson
from app.services.tenant_service import TenantService

logger = logging.getLogger("base.auth")


@dataclass
class IssuedSession:
    access_token: str
    refresh_token: str
    csrf_token: str
    view: SessionOut


@dataclass
class RegisterResult:
    view: SessionOut
    session: IssuedSession | None


class AuthService:
    def __init__(
        self,
        tenants: TenantRepository,
        memberships: MembershipRepository,
        refreshes: RefreshTokenRepository,
        authenticator: AuthenticatorClient,
        tenant_service: TenantService,
    ) -> None:
        self.tenants = tenants
        self.memberships = memberships
        self.refreshes = refreshes
        self.authenticator = authenticator
        self.tenant_service = tenant_service

    def register(self, data: RegisterCreate) -> RegisterResult:
        validate_password(data.password)
        cpf = normalize_cpf(data.cpf)
        email = normalize_email(str(data.email))
        person_id, created = self.authenticator.upsert_person(
            cpf=cpf,
            email=email,
            full_name=data.full_name.strip(),
            password=data.password,
            redirect_url=settings.PUBLIC_APP_URL,
        )
        tenant = self.tenant_service.create_public(data.company_name)
        self.memberships.create(person_id=person_id, tenant_id=tenant.id, role="admin")
        person = self.authenticator.person_state(person_id)
        view = self._view(person, tenant.id if created else None, must_login=not created)
        if not created:
            logger.info("cadastro de cpf existente person_id=%s", person_id)
            return RegisterResult(view=view, session=None)
        logger.info("cadastro aceito person_id=%s", person_id)
        return RegisterResult(view=view, session=self._issue(person, tenant.id, view))

    def login(self, cpf: str, password: str) -> IssuedSession:
        person = self.authenticator.verify(normalize_cpf(cpf), password)
        rows = self.memberships.list_by_person(person.person_id)
        if not rows:
            logger.info("login sem vínculo person_id=%s", person.person_id)
            raise AppError(403, "Sem vínculo neste sistema")
        tenant_id = rows[0].tenant_id if len(rows) == 1 else None
        logger.info("login aceito person_id=%s", person.person_id)
        return self._issue(person, tenant_id)

    def refresh(self, raw_refresh: str) -> IssuedSession:
        try:
            payload = decode_refresh_token(raw_refresh)
            person_id = int(payload["sub"])
            token_version = int(payload["auth_version"])
            tenant_id = read_tenant_id(payload)
        except (JWTError, KeyError, TypeError, ValueError):
            raise AppError(401, "Não autenticado") from None
        row = self.refreshes.get_by_hash(hash_secret(raw_refresh))
        if (
            row is None
            or row.revoked
            or row.expires_at <= utcnow()
            or row.person_id != person_id
            or row.auth_version != token_version
        ):
            raise AppError(401, "Não autenticado")
        try:
            person = self.authenticator.person_state(person_id)
        except AppError as exc:
            self.refreshes.revoke(row)
            if exc.status_code == 404:
                raise AppError(401, "Não autenticado") from None
            raise
        if not person.is_active or person.auth_version != row.auth_version:
            self.refreshes.revoke(row)
            logger.info("refresh revogado person_id=%s", person_id)
            raise AppError(401, "Não autenticado")
        if tenant_id is not None and self.memberships.get_by_person_and_tenant(person_id, tenant_id) is None:
            tenant_id = None
        self.refreshes.revoke(row)
        return self._issue(person, tenant_id)

    def switch_tenant(self, person_id: int, tenant_id: int) -> IssuedSession:
        membership = self.memberships.get_by_person_and_tenant(person_id, tenant_id)
        if membership is None:
            raise AppError(403, "Sem vínculo neste sistema")
        person = self.authenticator.person_state(person_id)
        if not person.is_active:
            raise AppError(403, "Pessoa inativa")
        self.refreshes.revoke_all(person_id)
        return self._issue(person, tenant_id)

    def logout(self, person_id: int) -> None:
        self.refreshes.revoke_all(person_id)
        logger.info("logout person_id=%s", person_id)

    def session_view(self, person_id: int, tenant_id: int | None) -> SessionOut:
        person = self.authenticator.person_state(person_id)
        if not person.is_active:
            raise AppError(403, "Pessoa inativa")
        if tenant_id is not None and self.memberships.get_by_person_and_tenant(person_id, tenant_id) is None:
            raise AppError(403, "Sem vínculo neste sistema")
        return self._view(person, tenant_id, must_login=False)

    def forgot(self, email: str) -> None:
        self.authenticator.forgot_password(normalize_email(email), settings.PUBLIC_APP_URL)

    def reset_password(self, token: str, new_password: str) -> None:
        validate_password(new_password)
        self.authenticator.reset_password(token, new_password)

    def change_password(self, person_id: int, current_password: str, new_password: str) -> None:
        validate_password(new_password)
        self.authenticator.change_password(person_id, current_password, new_password)
        self.refreshes.revoke_all(person_id)

    def verify_email(self, token: str) -> None:
        self.authenticator.verify_email(token)

    def resend_verification(self, email: str) -> None:
        self.authenticator.resend_verification(normalize_email(email), settings.PUBLIC_APP_URL)

    def _issue(self, person: RemotePerson, tenant_id: int | None, view: SessionOut | None = None) -> IssuedSession:
        if view is None:
            view = self._view(person, tenant_id, must_login=False)
        access = create_access_token(person.person_id, person.auth_version, tenant_id)
        raw_refresh, expires_at = create_refresh_token(person.person_id, person.auth_version, tenant_id)
        self.refreshes.save(
            person_id=person.person_id,
            token_hash=hash_secret(raw_refresh),
            expires_at=expires_at,
            auth_version=person.auth_version,
        )
        return IssuedSession(
            access_token=access,
            refresh_token=raw_refresh,
            csrf_token=new_secret(),
            view=view,
        )

    def _view(self, person: RemotePerson, tenant_id: int | None, *, must_login: bool) -> SessionOut:
        rows = self.memberships.list_by_person(person.person_id)
        tenants: list[TenantOut] = []
        role: str | None = None
        active: TenantOut | None = None
        for row in rows:
            tenant = self.tenants.get_by_id(row.tenant_id)
            if tenant is None:
                continue
            item = TenantOut.model_validate(tenant)
            tenants.append(item)
            if tenant_id is not None and tenant.id == tenant_id:
                role = row.role
                active = item
        return SessionOut(
            person_id=person.person_id,
            full_name=person.full_name,
            email=person.email,
            email_verified=person.email_verified,
            role=role,
            active_tenant=active,
            tenants=tenants,
            must_login=must_login,
        )
