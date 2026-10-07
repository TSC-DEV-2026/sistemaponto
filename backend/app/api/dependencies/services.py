from fastapi import Depends
from sqlalchemy.orm import Session

from app.api.dependencies.database import get_db
from app.repositories.membership_repository import MembershipRepository
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.tenant_repository import TenantRepository
from app.services.auth_service import AuthService
from app.services.authenticator_client import AuthenticatorClient
from app.services.membership_service import MembershipService
from app.repositories.workforce_repository import WorkforceRepository
from app.services.tenant_service import TenantService
from app.services.workforce_service import WorkforceService


def get_authenticator() -> AuthenticatorClient:
    return AuthenticatorClient()


def get_tenant_service(db: Session = Depends(get_db)) -> TenantService:
    return TenantService(TenantRepository(db))


def get_membership_service(
    db: Session = Depends(get_db),
    authenticator: AuthenticatorClient = Depends(get_authenticator),
) -> MembershipService:
    return MembershipService(MembershipRepository(db), authenticator)


def get_workforce_service(db: Session = Depends(get_db)) -> WorkforceService:
    return WorkforceService(WorkforceRepository(db))


def get_auth_service(
    db: Session = Depends(get_db),
    authenticator: AuthenticatorClient = Depends(get_authenticator),
) -> AuthService:
    tenants = TenantRepository(db)
    return AuthService(
        tenants,
        MembershipRepository(db),
        RefreshTokenRepository(db),
        authenticator,
        TenantService(tenants),
    )
