"""caminho das fotos no bucket

Revision ID: 0012_photo_keys
Revises: 0011_clock_method
Create Date: 2026-10-23

"""

from alembic import op
import sqlalchemy as sa

revision = "0012_photo_keys"
down_revision = "0011_clock_method"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("face_key", sa.String(length=255), nullable=True))
    op.add_column("punches", sa.Column("qr_key", sa.String(length=255), nullable=True))
    op.add_column("punches", sa.Column("selfie_key", sa.String(length=255), nullable=True))
    op.add_column("punches", sa.Column("face_key", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("punches", "face_key")
    op.drop_column("punches", "selfie_key")
    op.drop_column("punches", "qr_key")
    op.drop_column("employees", "face_key")
