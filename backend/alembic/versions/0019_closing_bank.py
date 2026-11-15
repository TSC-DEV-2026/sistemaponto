"""operação de banco no fechamento

Revision ID: 0019_closing_bank
Revises: 0018_notice_channels
Create Date: 2026-11-15

"""

from alembic import op
import sqlalchemy as sa


revision = "0019_closing_bank"
down_revision = "0018_notice_channels"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("hour_bank_entries", sa.Column("closing_id", sa.BigInteger(), nullable=True))
    op.create_index("ix_hour_bank_entries_closing_id", "hour_bank_entries", ["closing_id"])
    op.create_foreign_key(
        "fk_hour_bank_entries_closing_id",
        "hour_bank_entries",
        "closings",
        ["closing_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_hour_bank_entries_closing_id", "hour_bank_entries", type_="foreignkey")
    op.drop_index("ix_hour_bank_entries_closing_id", table_name="hour_bank_entries")
    op.drop_column("hour_bank_entries", "closing_id")
