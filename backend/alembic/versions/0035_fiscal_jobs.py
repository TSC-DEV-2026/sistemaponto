"""jobs de geração fiscal em segundo plano (Ponto 23)

Revision ID: 0035_fiscal_jobs
Revises: 0034_face_embedding_updated_at
Create Date: 2026-11-25

"""

from alembic import op
import sqlalchemy as sa


revision = "0035_fiscal_jobs"
down_revision = "0034_face_embedding_updated_at"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "fiscal_jobs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.BigInteger(), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=False),
        sa.Column("time_format", sa.String(length=16), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("fiscal_file_id", sa.BigInteger(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_by_person_id", sa.BigInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["fiscal_file_id"], ["fiscal_files.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_fiscal_jobs_tenant_id", "fiscal_jobs", ["tenant_id"])
    op.create_index("ix_fiscal_jobs_tenant_status", "fiscal_jobs", ["tenant_id", "status"])


def downgrade() -> None:
    op.drop_index("ix_fiscal_jobs_tenant_status", table_name="fiscal_jobs")
    op.drop_index("ix_fiscal_jobs_tenant_id", table_name="fiscal_jobs")
    op.drop_table("fiscal_jobs")
