from sqlalchemy import BigInteger, Boolean, Column, Date, DateTime, ForeignKey, String, Text, UniqueConstraint

from app.db.base import Base


def _tenant():
    return Column(BigInteger, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (UniqueConstraint("tenant_id", "name", name="uq_job_tenant_name"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = _tenant()
    name = Column(String(255), nullable=False)


class CostCenter(Base):
    __tablename__ = "cost_centers"
    __table_args__ = (UniqueConstraint("tenant_id", "name", name="uq_cost_center_tenant_name"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = _tenant()
    name = Column(String(255), nullable=False)


class Unit(Base):
    __tablename__ = "units"
    __table_args__ = (UniqueConstraint("tenant_id", "name", name="uq_unit_tenant_name"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = _tenant()
    name = Column(String(255), nullable=False)


class Sector(Base):
    __tablename__ = "sectors"
    __table_args__ = (UniqueConstraint("tenant_id", "unit_id", "name", name="uq_sector_unit_name"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = _tenant()
    unit_id = Column(BigInteger, ForeignKey("units.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)


class Team(Base):
    __tablename__ = "teams"
    __table_args__ = (UniqueConstraint("tenant_id", "sector_id", "name", name="uq_team_sector_name"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = _tenant()
    sector_id = Column(BigInteger, ForeignKey("sectors.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)


class Journey(Base):
    __tablename__ = "journeys"
    __table_args__ = (UniqueConstraint("tenant_id", "name", name="uq_journey_tenant_name"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = _tenant()
    name = Column(String(255), nullable=False)
    morning_start = Column(String(5), nullable=True)
    morning_end = Column(String(5), nullable=True)
    afternoon_start = Column(String(5), nullable=True)
    afternoon_end = Column(String(5), nullable=True)
    note = Column(Text, nullable=True)


class LaborUnion(Base):
    __tablename__ = "unions"
    __table_args__ = (UniqueConstraint("tenant_id", "name", name="uq_union_tenant_name"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = _tenant()
    name = Column(String(255), nullable=False)


class LaborAgreement(Base):
    __tablename__ = "labor_agreements"
    __table_args__ = (UniqueConstraint("tenant_id", "name", name="uq_agreement_tenant_name"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = _tenant()
    union_id = Column(BigInteger, ForeignKey("unions.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date, nullable=True)
    note = Column(Text, nullable=True)


class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = _tenant()
    name = Column(String(255), nullable=False)
    holiday_date = Column(Date, nullable=False)
    note = Column(Text, nullable=True)


class PunchRule(Base):
    __tablename__ = "punch_rules"
    __table_args__ = (UniqueConstraint("tenant_id", "name", name="uq_punch_rule_tenant_name"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = _tenant()
    name = Column(String(255), nullable=False)
    note = Column(Text, nullable=True)


class Reason(Base):
    __tablename__ = "reasons"
    __table_args__ = (UniqueConstraint("tenant_id", "kind", "name", name="uq_reason_kind_name"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = _tenant()
    kind = Column(String(32), nullable=False)
    name = Column(String(255), nullable=False)
    active = Column(Boolean, nullable=False, default=True)


class Employee(Base):
    __tablename__ = "employees"
    __table_args__ = (
        UniqueConstraint("tenant_id", "cpf", name="uq_employee_tenant_cpf"),
        UniqueConstraint("tenant_id", "person_id", name="uq_employee_tenant_person"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = _tenant()
    full_name = Column(String(255), nullable=False)
    cpf = Column(String(11), nullable=False)
    email = Column(String(255), nullable=True)
    person_id = Column(BigInteger, nullable=True, index=True)
    admission_date = Column(Date, nullable=False)
    note = Column(Text, nullable=True)


class EmployeeVigency(Base):
    __tablename__ = "employee_vigencies"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = _tenant()
    employee_id = Column(BigInteger, ForeignKey("employees.id"), nullable=False, index=True)
    kind = Column(String(32), nullable=False)
    reference_id = Column(BigInteger, nullable=True)
    label = Column(String(255), nullable=False)
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date, nullable=True)
    note = Column(Text, nullable=True)


class Punch(Base):
    __tablename__ = "punches"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = _tenant()
    employee_id = Column(BigInteger, ForeignKey("employees.id"), nullable=False, index=True)
    occurred_at = Column(DateTime(timezone=True), nullable=False)
    source = Column(String(32), nullable=False)
    request_id = Column(BigInteger, nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)


class Occurrence(Base):
    __tablename__ = "occurrences"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = _tenant()
    employee_id = Column(BigInteger, ForeignKey("employees.id"), nullable=False, index=True)
    kind = Column(String(32), nullable=False)
    starts_on = Column(Date, nullable=False)
    ends_on = Column(Date, nullable=False)
    reason_id = Column(BigInteger, ForeignKey("reasons.id"), nullable=True)
    note = Column(Text, nullable=True)
    source = Column(String(32), nullable=False)
    request_id = Column(BigInteger, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)


class TimeRequest(Base):
    __tablename__ = "time_requests"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = _tenant()
    employee_id = Column(BigInteger, ForeignKey("employees.id"), nullable=False, index=True)
    kind = Column(String(32), nullable=False)
    status = Column(String(32), nullable=False)
    reason_id = Column(BigInteger, ForeignKey("reasons.id"), nullable=True)
    note = Column(Text, nullable=True)
    starts_on = Column(Date, nullable=True)
    ends_on = Column(Date, nullable=True)
    occurred_at = Column(DateTime(timezone=True), nullable=True)
    decision_note = Column(Text, nullable=True)
    decided_at = Column(DateTime(timezone=True), nullable=True)
    decided_by_person_id = Column(BigInteger, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)


class RequestEvent(Base):
    __tablename__ = "request_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = _tenant()
    request_id = Column(BigInteger, ForeignKey("time_requests.id"), nullable=False, index=True)
    status = Column(String(32), nullable=False)
    note = Column(Text, nullable=True)
    person_id = Column(BigInteger, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)


class Closing(Base):
    __tablename__ = "closings"
    __table_args__ = (UniqueConstraint("tenant_id", "year", "month", name="uq_closing_period"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = _tenant()
    year = Column(BigInteger, nullable=False)
    month = Column(BigInteger, nullable=False)
    status = Column(String(32), nullable=False)
    note = Column(Text, nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    closed_by_person_id = Column(BigInteger, nullable=True)


class ClosingEvent(Base):
    __tablename__ = "closing_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = _tenant()
    closing_id = Column(BigInteger, ForeignKey("closings.id"), nullable=False, index=True)
    kind = Column(String(32), nullable=False)
    note = Column(Text, nullable=True)
    person_id = Column(BigInteger, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = _tenant()
    person_id = Column(BigInteger, nullable=False, index=True)
    employee_id = Column(BigInteger, nullable=True)
    kind = Column(String(64), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)


class Audit(Base):
    __tablename__ = "audits"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = _tenant()
    person_id = Column(BigInteger, nullable=False)
    action = Column(String(255), nullable=False)
    employee_id = Column(BigInteger, nullable=True, index=True)
    subject_kind = Column(String(32), nullable=False)
    subject_id = Column(BigInteger, nullable=False)
    previous_label = Column(String(255), nullable=True)
    new_label = Column(String(255), nullable=True)
    valid_from = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
