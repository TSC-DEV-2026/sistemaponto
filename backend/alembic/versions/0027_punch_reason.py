"""motivo do ajuste na marcação

Revision ID: 0027_punch_reason
Revises: 0026_reasons_active
Create Date: 2026-11-18

A correção do dia guarda o motivo do tipo ajuste.

"""

import sqlalchemy as sa

from alembic import op


revision = "0027_punch_reason"
down_revision = "0026_reasons_active"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("punches", sa.Column("reason_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key("fk_punch_reason", "punches", "reasons", ["reason_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_punch_reason", "punches", type_="foreignkey")
    op.drop_column("punches", "reason_id")
