"""abono, atestado, afastamento e férias

Revision ID: 0004_time_off
Revises: 0003_punch_day
Create Date: 2026-10-08

"""

from alembic import op
import sqlalchemy as sa

revision = "0004_time_off"
down_revision = "0003_punch_day"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ("time_requests", "occurrences"):
        op.add_column(table, sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True))
        op.add_column(table, sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True))
        op.add_column(table, sa.Column("cid", sa.String(length=16), nullable=True))
        op.add_column(table, sa.Column("crm", sa.String(length=32), nullable=True))
        op.add_column(table, sa.Column("doctor_name", sa.String(length=255), nullable=True))
        op.add_column(table, sa.Column("photo_key", sa.String(length=512), nullable=True))
    op.add_column("occurrences", sa.Column("warning", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("occurrences", "warning")
    for name in ("photo_key", "doctor_name", "crm", "cid", "ends_at", "starts_at"):
        op.drop_column("occurrences", name)
        op.drop_column("time_requests", name)
