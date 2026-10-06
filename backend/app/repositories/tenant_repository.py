from datetime import datetime

from sqlalchemy.orm import Session

from app.models.membership import Membership
from app.models.tenant import Tenant


class TenantRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, tenant_id: int) -> Tenant | None:
        return self.db.query(Tenant).filter(Tenant.id == tenant_id).one_or_none()

    def get_by_slug(self, slug: str) -> Tenant | None:
        return self.db.query(Tenant).filter(Tenant.slug == slug).one_or_none()

    def get_by_document(self, document: str) -> Tenant | None:
        return self.db.query(Tenant).filter(Tenant.document == document).one_or_none()

    def get_for_person(self, tenant_id: int, person_id: int) -> Tenant | None:
        return (
            self.db.query(Tenant)
            .join(Membership, Membership.tenant_id == Tenant.id)
            .filter(Tenant.id == tenant_id, Membership.person_id == person_id)
            .one_or_none()
        )

    def list_for_person(
        self,
        person_id: int,
        *,
        name: str | None,
        slug: str | None,
        document: str | None,
        page: int,
        limit: int,
    ) -> tuple[list[Tenant], int]:
        query = (
            self.db.query(Tenant)
            .join(Membership, Membership.tenant_id == Tenant.id)
            .filter(Membership.person_id == person_id)
        )
        if name:
            query = query.filter(Tenant.name == name)
        if slug:
            query = query.filter(Tenant.slug == slug)
        if document:
            query = query.filter(Tenant.document == document)
        total = query.count()
        items = query.order_by(Tenant.id).offset((page - 1) * limit).limit(limit).all()
        return items, total

    def create(
        self,
        *,
        name: str,
        slug: str,
        document: str | None,
        trial_started_at: datetime,
        trial_ends_at: datetime,
        employee_capacity: int,
    ) -> Tenant:
        row = Tenant(
            name=name,
            slug=slug,
            document=document,
            trial_started_at=trial_started_at,
            trial_ends_at=trial_ends_at,
            employee_capacity=employee_capacity,
        )
        self.db.add(row)
        self.db.flush()
        return row

    def save(self, row: Tenant) -> Tenant:
        self.db.add(row)
        self.db.flush()
        return row

    def delete(self, row: Tenant) -> None:
        self.db.delete(row)
        self.db.flush()
