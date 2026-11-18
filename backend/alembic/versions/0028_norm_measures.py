"""medidas da norma

Revision ID: 0028_norm_measures
Revises: 0027_punch_reason
Create Date: 2026-11-18

A norma passa a guardar tolerância, intervalo mínimo, período noturno
e o percentual do adicional. O cálculo ainda não lê esses campos.

"""

import sqlalchemy as sa

from alembic import op


revision = "0028_norm_measures"
down_revision = "0027_punch_reason"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("norms", sa.Column("tolerance_minutes", sa.Integer(), nullable=False, server_default="10"))
    op.add_column("norms", sa.Column("minimum_interval_minutes", sa.Integer(), nullable=False, server_default="60"))
    op.add_column("norms", sa.Column("night_start", sa.String(length=5), nullable=False, server_default=sa.text("'22:00'")))
    op.add_column("norms", sa.Column("night_end", sa.String(length=5), nullable=False, server_default=sa.text("'05:00'")))
    op.add_column("norms", sa.Column("night_additional_percent", sa.Integer(), nullable=False, server_default="20"))
    op.alter_column("norms", "tolerance_minutes", server_default=None)
    op.alter_column("norms", "minimum_interval_minutes", server_default=None)
    op.alter_column("norms", "night_start", server_default=None)
    op.alter_column("norms", "night_end", server_default=None)
    op.alter_column("norms", "night_additional_percent", server_default=None)


def downgrade() -> None:
    op.drop_column("norms", "night_additional_percent")
    op.drop_column("norms", "night_end")
    op.drop_column("norms", "night_start")
    op.drop_column("norms", "minimum_interval_minutes")
    op.drop_column("norms", "tolerance_minutes")
