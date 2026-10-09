import logging
from dataclasses import dataclass

from app.core.config import settings
from app.core.cpf import normalize_cpf, normalize_email
from app.core.exceptions import AppError
from app.models.membership import Membership
from app.repositories.membership_repository import MembershipRepository
from app.schemas.membership import MembershipCreate, MembershipUpdate
from app.services.authenticator_client import AuthenticatorClient
from app.services.company_defaults import ensure_company_defaults

logger = logging.getLogger("base.membership")

ROLES = {"admin", "manager", "member"}


@dataclass
class MembershipView:
    id: int
    person_id: int
    full_name: str
    role: str


class MembershipService:
    def __init__(self, memberships: MembershipRepository, authenticator: AuthenticatorClient) -> None:
        self.memberships = memberships
        self.authenticator = authenticator

    def list(
        self,
        tenant_id: int,
        *,
        role: str | None,
        person_id: int | None,
        page: int,
        limit: int,
    ) -> tuple[list[MembershipView], int]:
        normalized_role = self._role(role) if role else None
        items, total = self.memberships.list_by_tenant(
            tenant_id,
            role=normalized_role,
            person_id=person_id,
            page=page,
            limit=limit,
        )
        return [self.view(row) for row in items], total

    def view(self, row: Membership) -> MembershipView:
        person = self.authenticator.person_state(row.person_id)
        return MembershipView(
            id=row.id,
            person_id=row.person_id,
            full_name=person.full_name,
            role=row.role,
        )

    def create(self, tenant_id: int, data: MembershipCreate) -> MembershipView:
        role = self._role(data.role)
        person_id, _created = self.authenticator.upsert_person(
            cpf=normalize_cpf(data.cpf),
            email=normalize_email(str(data.email)),
            full_name=data.full_name.strip(),
            password=None,
            redirect_url=settings.PUBLIC_APP_URL,
        )
        if self.memberships.get_by_person_and_tenant(person_id, tenant_id) is not None:
            raise AppError(400, "Pessoa já vinculada")
        row = self.memberships.create(person_id=person_id, tenant_id=tenant_id, role=role)
        if role == "admin":
            self._defaults(tenant_id)
        logger.info("vínculo criado person_id=%s tenant_id=%s", person_id, tenant_id)
        return self.view(row)

    def update(self, row: Membership, data: MembershipUpdate) -> MembershipView:
        if data.role is not None:
            role = self._role(data.role)
            became_admin = row.role != "admin" and role == "admin"
            self._keep_admin(row, deleting=False, new_role=role)
            row.role = role
            row = self.memberships.save(row)
            if became_admin:
                self._defaults(row.tenant_id)
        return self.view(row)

    def delete(self, row: Membership) -> None:
        self._keep_admin(row, deleting=True, new_role=None)
        self.memberships.delete(row)

    def _keep_admin(self, row: Membership, *, deleting: bool, new_role: str | None) -> None:
        if row.role != "admin":
            return
        if not deleting and new_role == "admin":
            return
        if self.memberships.count_admins(row.tenant_id) <= 1:
            raise AppError(400, "A empresa precisa de um administrador")

    def _defaults(self, tenant_id: int) -> None:
        db = getattr(self.memberships, "db", None)
        if db is not None:
            ensure_company_defaults(db, tenant_id)

    @staticmethod
    def _role(value: str) -> str:
        role = value.strip().lower()
        if role not in ROLES:
            raise AppError(400, "Papel inválido")
        return role
