"""eventos configuráveis da folha

Revision ID: 0032_payroll_events
Revises: 0031_journey_tolerance
Create Date: 2026-11-24

"""

from alembic import op
import sqlalchemy as sa

revision = "0032_payroll_events"
down_revision = "0031_journey_tolerance"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "payroll_events",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.BigInteger(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("system_event", sa.String(length=64), nullable=False),
        sa.Column("external_code", sa.String(length=32), nullable=False),
        sa.Column("time_format", sa.String(length=16), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.UniqueConstraint("tenant_id", "system_event", name="uq_payroll_event_system"),
        sa.UniqueConstraint("tenant_id", "external_code", name="uq_payroll_event_code"),
    )
    op.create_index("ix_payroll_events_tenant_id", "payroll_events", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("ix_payroll_events_tenant_id", table_name="payroll_events")
    op.drop_table("payroll_events")
