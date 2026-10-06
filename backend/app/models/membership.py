from sqlalchemy import BigInteger, Column, ForeignKey, String, UniqueConstraint

from app.db.base import Base


class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("person_id", "tenant_id", name="uq_membership_person_tenant"),)

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    person_id = Column(BigInteger, nullable=False, index=True)
    tenant_id = Column(BigInteger, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(32), nullable=False)
