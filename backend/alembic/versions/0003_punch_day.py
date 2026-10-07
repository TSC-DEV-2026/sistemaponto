"""marcações do dia no ajuste e validade da marcação

Revision ID: 0003_punch_day
Revises: 0002_workforce
Create Date: 2026-10-07

"""

from alembic import op
import sqlalchemy as sa

revision = "0003_punch_day"
down_revision = "0002_workforce"
branch_labels = None
depends_on = None


def _id():
    return sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True)


def _tenant():
    return sa.Column("tenant_id", sa.BigInteger(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)


def _index(table: str, column: str) -> None:
    op.create_index(f"ix_{table}_{column}", table, [column])


def upgrade() -> None:
    op.add_column("punches", sa.Column("valid", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("punches", sa.Column("voided_at", sa.DateTime(timezone=True), nullable=True))
    op.alter_column("punches", "valid", server_default=None)
    op.create_table(
        "request_punches",
        _id(),
        _tenant(),
        sa.Column("request_id", sa.BigInteger(), sa.ForeignKey("time_requests.id"), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("position", sa.BigInteger(), nullable=False),
        sa.UniqueConstraint("request_id", "position", name="uq_request_punch_position"),
    )
    _index("request_punches", "id")
    _index("request_punches", "tenant_id")
    _index("request_punches", "request_id")


def downgrade() -> None:
    op.drop_table("request_punches")
    op.drop_column("punches", "voided_at")
    op.drop_column("punches", "valid")
