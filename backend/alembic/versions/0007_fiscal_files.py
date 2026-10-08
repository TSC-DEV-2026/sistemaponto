"""arquivos fiscais e totais da folha

Revision ID: 0007_fiscal_files
Revises: 0006_period_closing
Create Date: 2026-10-08

"""

from alembic import op
import sqlalchemy as sa

revision = "0007_fiscal_files"
down_revision = "0006_period_closing"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "fiscal_files",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.BigInteger(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("valid", sa.Boolean(), nullable=False),
        sa.Column("invalidated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_person_id", sa.BigInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_fiscal_files_tenant_id", "fiscal_files", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("ix_fiscal_files_tenant_id", table_name="fiscal_files")
    op.drop_table("fiscal_files")
