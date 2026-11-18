"""intervalo mínimo da norma em horas

Revision ID: 0029_norm_interval_hours
Revises: 0028_norm_measures
Create Date: 2026-11-18

O intervalo mínimo é uma quantidade de horas, não de minutos.

"""

import sqlalchemy as sa

from alembic import op


revision = "0029_norm_interval_hours"
down_revision = "0028_norm_measures"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("norms", sa.Column("minimum_interval_hours", sa.Integer(), nullable=True))
    op.execute("UPDATE norms SET minimum_interval_hours = minimum_interval_minutes / 60")
    op.alter_column("norms", "minimum_interval_hours", nullable=False)
    op.drop_column("norms", "minimum_interval_minutes")


def downgrade() -> None:
    op.add_column("norms", sa.Column("minimum_interval_minutes", sa.Integer(), nullable=True))
    op.execute("UPDATE norms SET minimum_interval_minutes = minimum_interval_hours * 60")
    op.alter_column("norms", "minimum_interval_minutes", nullable=False)
    op.drop_column("norms", "minimum_interval_hours")
