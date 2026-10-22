"""tipo de registro e fotos da marcação

Revision ID: 0011_clock_method
Revises: 0010_registration
Create Date: 2026-10-22

"""

from alembic import op
import sqlalchemy as sa

revision = "0011_clock_method"
down_revision = "0010_registration"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "employees",
        sa.Column("clock_method", sa.String(length=16), nullable=False, server_default="simple"),
    )
    op.add_column("punches", sa.Column("qr_image", sa.LargeBinary(), nullable=True))
    op.add_column("punches", sa.Column("selfie_image", sa.LargeBinary(), nullable=True))
    op.add_column("punches", sa.Column("face_image", sa.LargeBinary(), nullable=True))
    op.add_column("punches", sa.Column("client_event_id", sa.String(length=64), nullable=True))
    op.create_unique_constraint("uq_punch_tenant_event", "punches", ["tenant_id", "client_event_id"])
    op.create_table(
        "face_embeddings",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.BigInteger(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_id", sa.BigInteger(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("model_name", sa.String(length=64), nullable=False),
        sa.Column("model_version", sa.String(length=64), nullable=False),
        sa.Column("embedding", sa.JSON(), nullable=False),
        sa.UniqueConstraint("tenant_id", "employee_id", name="uq_face_embedding_employee"),
    )
    op.create_index("ix_face_embeddings_tenant_id", "face_embeddings", ["tenant_id"])
    op.create_index("ix_face_embeddings_employee_id", "face_embeddings", ["employee_id"])


def downgrade() -> None:
    op.drop_index("ix_face_embeddings_employee_id", table_name="face_embeddings")
    op.drop_index("ix_face_embeddings_tenant_id", table_name="face_embeddings")
    op.drop_table("face_embeddings")
    op.drop_constraint("uq_punch_tenant_event", "punches", type_="unique")
    op.drop_column("punches", "client_event_id")
    op.drop_column("punches", "face_image")
    op.drop_column("punches", "selfie_image")
    op.drop_column("punches", "qr_image")
    op.drop_column("employees", "clock_method")
