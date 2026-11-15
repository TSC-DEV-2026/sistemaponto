"""pessoas do fechamento

Revision ID: 0020_closing_members
Revises: 0019_closing_bank
Create Date: 2026-11-15

"""

from alembic import op
import sqlalchemy as sa


revision = "0020_closing_members"
down_revision = "0019_closing_bank"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "closing_members",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.BigInteger(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("closing_id", sa.BigInteger(), sa.ForeignKey("closings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=False),
        sa.UniqueConstraint("closing_id", "employee_id", name="uq_closing_member"),
    )
    op.create_index("ix_closing_members_tenant_id", "closing_members", ["tenant_id"])
    op.create_index("ix_closing_members_closing_id", "closing_members", ["closing_id"])
    op.create_index("ix_closing_members_employee_id", "closing_members", ["employee_id"])


def downgrade() -> None:
    op.drop_index("ix_closing_members_employee_id", table_name="closing_members")
    op.drop_index("ix_closing_members_closing_id", table_name="closing_members")
    op.drop_index("ix_closing_members_tenant_id", table_name="closing_members")
    op.drop_table("closing_members")
