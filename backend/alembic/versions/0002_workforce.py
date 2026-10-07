"""cadastros de pessoas, ponto e vínculos

Revision ID: 0002_workforce
Revises: 0001_create_tenants
Create Date: 2026-10-07

"""

from alembic import op
import sqlalchemy as sa

revision = "0002_workforce"
down_revision = "0001_create_tenants"
branch_labels = None
depends_on = None


def _id():
    return sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True)


def _tenant():
    return sa.Column("tenant_id", sa.BigInteger(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)


def _index(table: str, column: str, unique: bool = False) -> None:
    op.create_index(f"ix_{table}_{column}", table, [column], unique=unique)


def upgrade() -> None:
    op.create_table(
        "jobs",
        _id(),
        _tenant(),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.UniqueConstraint("tenant_id", "name", name="uq_job_tenant_name"),
    )
    _index("jobs", "id")
    _index("jobs", "tenant_id")

    op.create_table(
        "cost_centers",
        _id(),
        _tenant(),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.UniqueConstraint("tenant_id", "name", name="uq_cost_center_tenant_name"),
    )
    _index("cost_centers", "id")
    _index("cost_centers", "tenant_id")

    op.create_table(
        "units",
        _id(),
        _tenant(),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.UniqueConstraint("tenant_id", "name", name="uq_unit_tenant_name"),
    )
    _index("units", "id")
    _index("units", "tenant_id")

    op.create_table(
        "sectors",
        _id(),
        _tenant(),
        sa.Column("unit_id", sa.BigInteger(), sa.ForeignKey("units.id"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.UniqueConstraint("tenant_id", "unit_id", "name", name="uq_sector_unit_name"),
    )
    _index("sectors", "id")
    _index("sectors", "tenant_id")
    _index("sectors", "unit_id")

    op.create_table(
        "teams",
        _id(),
        _tenant(),
        sa.Column("sector_id", sa.BigInteger(), sa.ForeignKey("sectors.id"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.UniqueConstraint("tenant_id", "sector_id", "name", name="uq_team_sector_name"),
    )
    _index("teams", "id")
    _index("teams", "tenant_id")
    _index("teams", "sector_id")

    op.create_table(
        "journeys",
        _id(),
        _tenant(),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("morning_start", sa.String(length=5), nullable=True),
        sa.Column("morning_end", sa.String(length=5), nullable=True),
        sa.Column("afternoon_start", sa.String(length=5), nullable=True),
        sa.Column("afternoon_end", sa.String(length=5), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.UniqueConstraint("tenant_id", "name", name="uq_journey_tenant_name"),
    )
    _index("journeys", "id")
    _index("journeys", "tenant_id")

    op.create_table(
        "unions",
        _id(),
        _tenant(),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.UniqueConstraint("tenant_id", "name", name="uq_union_tenant_name"),
    )
    _index("unions", "id")
    _index("unions", "tenant_id")

    op.create_table(
        "labor_agreements",
        _id(),
        _tenant(),
        sa.Column("union_id", sa.BigInteger(), sa.ForeignKey("unions.id"), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("valid_from", sa.Date(), nullable=False),
        sa.Column("valid_to", sa.Date(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.UniqueConstraint("tenant_id", "name", name="uq_agreement_tenant_name"),
    )
    _index("labor_agreements", "id")
    _index("labor_agreements", "tenant_id")
    _index("labor_agreements", "union_id")

    op.create_table(
        "holidays",
        _id(),
        _tenant(),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("holiday_date", sa.Date(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
    )
    _index("holidays", "id")
    _index("holidays", "tenant_id")

    op.create_table(
        "punch_rules",
        _id(),
        _tenant(),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.UniqueConstraint("tenant_id", "name", name="uq_punch_rule_tenant_name"),
    )
    _index("punch_rules", "id")
    _index("punch_rules", "tenant_id")

    op.create_table(
        "reasons",
        _id(),
        _tenant(),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.UniqueConstraint("tenant_id", "kind", "name", name="uq_reason_kind_name"),
    )
    _index("reasons", "id")
    _index("reasons", "tenant_id")

    op.create_table(
        "employees",
        _id(),
        _tenant(),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("cpf", sa.String(length=11), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("person_id", sa.BigInteger(), nullable=True),
        sa.Column("admission_date", sa.Date(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.UniqueConstraint("tenant_id", "cpf", name="uq_employee_tenant_cpf"),
        sa.UniqueConstraint("tenant_id", "person_id", name="uq_employee_tenant_person"),
    )
    _index("employees", "id")
    _index("employees", "tenant_id")
    _index("employees", "person_id")

    op.create_table(
        "employee_vigencies",
        _id(),
        _tenant(),
        sa.Column("employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("reference_id", sa.BigInteger(), nullable=True),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("valid_from", sa.Date(), nullable=False),
        sa.Column("valid_to", sa.Date(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
    )
    _index("employee_vigencies", "id")
    _index("employee_vigencies", "tenant_id")
    _index("employee_vigencies", "employee_id")

    op.create_table(
        "time_requests",
        _id(),
        _tenant(),
        sa.Column("employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("reason_id", sa.BigInteger(), sa.ForeignKey("reasons.id"), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("starts_on", sa.Date(), nullable=True),
        sa.Column("ends_on", sa.Date(), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decision_note", sa.Text(), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decided_by_person_id", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    _index("time_requests", "id")
    _index("time_requests", "tenant_id")
    _index("time_requests", "employee_id")

    op.create_table(
        "punches",
        _id(),
        _tenant(),
        sa.Column("employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("request_id", sa.BigInteger(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    _index("punches", "id")
    _index("punches", "tenant_id")
    _index("punches", "employee_id")

    op.create_table(
        "occurrences",
        _id(),
        _tenant(),
        sa.Column("employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=False),
        sa.Column("reason_id", sa.BigInteger(), sa.ForeignKey("reasons.id"), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("request_id", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    _index("occurrences", "id")
    _index("occurrences", "tenant_id")
    _index("occurrences", "employee_id")

    op.create_table(
        "request_events",
        _id(),
        _tenant(),
        sa.Column("request_id", sa.BigInteger(), sa.ForeignKey("time_requests.id"), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("person_id", sa.BigInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    _index("request_events", "id")
    _index("request_events", "tenant_id")
    _index("request_events", "request_id")

    op.create_table(
        "closings",
        _id(),
        _tenant(),
        sa.Column("year", sa.BigInteger(), nullable=False),
        sa.Column("month", sa.BigInteger(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_by_person_id", sa.BigInteger(), nullable=True),
        sa.UniqueConstraint("tenant_id", "year", "month", name="uq_closing_period"),
    )
    _index("closings", "id")
    _index("closings", "tenant_id")

    op.create_table(
        "closing_events",
        _id(),
        _tenant(),
        sa.Column("closing_id", sa.BigInteger(), sa.ForeignKey("closings.id"), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("person_id", sa.BigInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    _index("closing_events", "id")
    _index("closing_events", "tenant_id")
    _index("closing_events", "closing_id")

    op.create_table(
        "notifications",
        _id(),
        _tenant(),
        sa.Column("person_id", sa.BigInteger(), nullable=False),
        sa.Column("employee_id", sa.BigInteger(), nullable=True),
        sa.Column("kind", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    _index("notifications", "id")
    _index("notifications", "tenant_id")
    _index("notifications", "person_id")

    op.create_table(
        "audits",
        _id(),
        _tenant(),
        sa.Column("person_id", sa.BigInteger(), nullable=False),
        sa.Column("action", sa.String(length=255), nullable=False),
        sa.Column("employee_id", sa.BigInteger(), nullable=True),
        sa.Column("subject_kind", sa.String(length=32), nullable=False),
        sa.Column("subject_id", sa.BigInteger(), nullable=False),
        sa.Column("previous_label", sa.String(length=255), nullable=True),
        sa.Column("new_label", sa.String(length=255), nullable=True),
        sa.Column("valid_from", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    _index("audits", "id")
    _index("audits", "tenant_id")
    _index("audits", "employee_id")


def downgrade() -> None:
    for table in (
        "audits",
        "notifications",
        "closing_events",
        "closings",
        "request_events",
        "occurrences",
        "punches",
        "time_requests",
        "employee_vigencies",
        "employees",
        "reasons",
        "punch_rules",
        "holidays",
        "labor_agreements",
        "unions",
        "journeys",
        "teams",
        "sectors",
        "units",
        "cost_centers",
        "jobs",
    ):
        op.drop_table(table)
