"""tolerância sai da jornada

Revision ID: 0031_journey_tolerance
Revises: 0030_norm_interval_clock
Create Date: 2026-11-18

A apuração lê a tolerância na norma. A jornada não guarda mais esse valor.

"""

import sqlalchemy as sa

from alembic import op


revision = "0031_journey_tolerance"
down_revision = "0030_norm_interval_clock"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("journey_versions", "tolerance_minutes")
    op.drop_column("journeys", "tolerance_minutes")


def downgrade() -> None:
    op.add_column("journeys", sa.Column("tolerance_minutes", sa.Integer(), nullable=False, server_default="10"))
    op.add_column("journey_versions", sa.Column("tolerance_minutes", sa.Integer(), nullable=False, server_default="10"))
    op.alter_column("journeys", "tolerance_minutes", server_default=None)
    op.alter_column("journey_versions", "tolerance_minutes", server_default=None)
