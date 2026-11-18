"""intervalo mínimo da norma no formato de duração

Revision ID: 0030_norm_interval_clock
Revises: 0029_norm_interval_hours
Create Date: 2026-11-18

O intervalo mínimo é informado como 01:00, 02:00 ou 01:30.

"""

import sqlalchemy as sa

from alembic import op


revision = "0030_norm_interval_clock"
down_revision = "0029_norm_interval_hours"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("norms", sa.Column("minimum_interval", sa.String(length=5), nullable=True))
    op.execute("UPDATE norms SET minimum_interval = lpad(minimum_interval_hours::text, 2, '0') || chr(58) || '00'")
    op.alter_column("norms", "minimum_interval", nullable=False)
    op.drop_column("norms", "minimum_interval_hours")


def downgrade() -> None:
    op.add_column("norms", sa.Column("minimum_interval_hours", sa.Integer(), nullable=True))
    op.execute("UPDATE norms SET minimum_interval_hours = split_part(minimum_interval, ':', 1)::int")
    op.alter_column("norms", "minimum_interval_hours", nullable=False)
    op.drop_column("norms", "minimum_interval")
