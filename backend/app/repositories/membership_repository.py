from sqlalchemy.orm import Session

from app.models.membership import Membership


class MembershipRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, membership_id: int) -> Membership | None:
        return self.db.query(Membership).filter(Membership.id == membership_id).one_or_none()

    def get_in_tenant(self, membership_id: int, tenant_id: int) -> Membership | None:
        return (
            self.db.query(Membership)
            .filter(Membership.id == membership_id, Membership.tenant_id == tenant_id)
            .one_or_none()
        )

    def get_by_person_and_tenant(self, person_id: int, tenant_id: int) -> Membership | None:
        return (
            self.db.query(Membership)
            .filter(Membership.person_id == person_id, Membership.tenant_id == tenant_id)
            .one_or_none()
        )

    def list_by_person(self, person_id: int) -> list[Membership]:
        return (
            self.db.query(Membership)
            .filter(Membership.person_id == person_id)
            .order_by(Membership.id)
            .all()
        )

    def list_by_tenant(
        self,
        tenant_id: int,
        *,
        role: str | None,
        person_id: int | None,
        page: int,
        limit: int,
    ) -> tuple[list[Membership], int]:
        query = self.db.query(Membership).filter(Membership.tenant_id == tenant_id)
        if role:
            query = query.filter(Membership.role == role)
        if person_id is not None:
            query = query.filter(Membership.person_id == person_id)
        total = query.count()
        items = query.order_by(Membership.id).offset((page - 1) * limit).limit(limit).all()
        return items, total

    def count_admins(self, tenant_id: int) -> int:
        return (
            self.db.query(Membership)
            .filter(Membership.tenant_id == tenant_id, Membership.role == "admin")
            .count()
        )

    def create(self, *, person_id: int, tenant_id: int, role: str) -> Membership:
        row = Membership(person_id=person_id, tenant_id=tenant_id, role=role)
        self.db.add(row)
        self.db.flush()
        return row

    def save(self, row: Membership) -> Membership:
        self.db.add(row)
        self.db.flush()
        return row

    def delete(self, row: Membership) -> None:
        self.db.delete(row)
        self.db.flush()
