"""motivos ficam ativos

Revision ID: 0026_reasons_active
Revises: 0025_norms
Create Date: 2026-11-18

A tela não oferece mais ativo e inativo. A coluna permanece
para o dia em que a opção voltar.

"""

from alembic import op


revision = "0026_reasons_active"
down_revision = "0025_norms"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("UPDATE reasons SET active = true WHERE active IS DISTINCT FROM true")


def downgrade() -> None:
    pass
