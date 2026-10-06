from sqlalchemy import BigInteger, Column, DateTime, Integer, String

from app.db.base import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    document = Column(String(14), unique=True, nullable=True)
    trial_started_at = Column(DateTime(timezone=True), nullable=False)
    trial_ends_at = Column(DateTime(timezone=True), nullable=False)
    employee_capacity = Column(Integer, nullable=False)
