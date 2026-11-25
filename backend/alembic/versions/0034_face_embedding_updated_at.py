"""updated_at nos embeddings faciais (Ponto 19)

Revision ID: 0034_face_embedding_updated_at
Revises: 0033_hot_query_indexes
Create Date: 2026-11-25

"""

from alembic import op
import sqlalchemy as sa


revision = "0034_face_embedding_updated_at"
down_revision = "0033_hot_query_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "face_embeddings",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute("UPDATE face_embeddings SET updated_at = NOW() WHERE updated_at IS NULL")
    op.alter_column("face_embeddings", "updated_at", nullable=False)
    op.create_index(
        "ix_face_embeddings_tenant_updated",
        "face_embeddings",
        ["tenant_id", "updated_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_face_embeddings_tenant_updated", table_name="face_embeddings")
    op.drop_column("face_embeddings", "updated_at")
