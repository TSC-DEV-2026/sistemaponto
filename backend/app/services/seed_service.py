import logging

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.cpf import normalize_cpf
from app.repositories.membership_repository import MembershipRepository
from app.repositories.tenant_repository import TenantRepository
from app.services.authenticator_client import AuthenticatorClient
from app.services.tenant_service import TenantService

logger = logging.getLogger("sistemaponto.seed")


def seed_operator(db: Session) -> None:
    if not all(
        (
            settings.SEED_COMPANY_NAME.strip(),
            settings.SEED_ADMIN_CPF.strip(),
            settings.SEED_ADMIN_EMAIL.strip(),
            settings.SEED_ADMIN_FULL_NAME.strip(),
        )
    ):
        return
    try:
        client = AuthenticatorClient()
        person_id, _created = client.upsert_person(
            cpf=normalize_cpf(settings.SEED_ADMIN_CPF),
            email=settings.SEED_ADMIN_EMAIL,
            full_name=settings.SEED_ADMIN_FULL_NAME,
            password=None,
            redirect_url=settings.PUBLIC_APP_URL,
        )
        memberships = MembershipRepository(db)
        if memberships.list_by_person(person_id):
            return
        tenant = TenantService(TenantRepository(db)).create_public(settings.SEED_COMPANY_NAME)
        memberships.create(person_id=person_id, tenant_id=tenant.id, role="admin")
        db.commit()
        logger.info("empresa inicial criada person_id=%s", person_id)
    except Exception:
        db.rollback()
        logger.exception("seed da empresa inicial não aplicado")
