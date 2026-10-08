"""banco de horas

Revision ID: 0005_hour_bank
Revises: 0004_time_off
Create Date: 2026-10-08

"""

from alembic import op
import sqlalchemy as sa

revision = "0005_hour_bank"
down_revision = "0004_time_off"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "employees",
        sa.Column("hour_bank", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_table(
        "hour_bank_entries",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("tenant_id", sa.BigInteger(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("minutes", sa.Integer(), nullable=False),
        sa.Column("effect", sa.String(length=32), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("entry_on", sa.Date(), nullable=False),
        sa.Column("created_by_person_id", sa.BigInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_hour_bank_entries_tenant_id", "hour_bank_entries", ["tenant_id"])
    op.create_index("ix_hour_bank_entries_employee_id", "hour_bank_entries", ["employee_id"])


def downgrade() -> None:
    op.drop_index("ix_hour_bank_entries_employee_id", table_name="hour_bank_entries")
    op.drop_index("ix_hour_bank_entries_tenant_id", table_name="hour_bank_entries")
    op.drop_table("hour_bank_entries")
    op.drop_column("employees", "hour_bank")
