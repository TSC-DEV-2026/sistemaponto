"""avisos no sistema e no e-mail

Revision ID: 0008_notices
Revises: 0007_fiscal_files
Create Date: 2026-10-08

"""

from alembic import op
import sqlalchemy as sa

revision = "0008_notices"
down_revision = "0007_fiscal_files"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notification_preferences",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.BigInteger(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("person_id", sa.BigInteger(), nullable=False),
        sa.Column("kind", sa.String(length=64), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("tenant_id", "person_id", "kind", name="uq_notification_preference"),
    )
    op.create_index("ix_notification_preferences_tenant_id", "notification_preferences", ["tenant_id"])
    op.create_index("ix_notification_preferences_person_id", "notification_preferences", ["person_id"])
    op.create_table(
        "notice_emails",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.BigInteger(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("person_id", sa.BigInteger(), nullable=False),
        sa.Column("employee_id", sa.BigInteger(), nullable=True),
        sa.Column("kind", sa.String(length=64), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_notice_emails_tenant_id", "notice_emails", ["tenant_id"])
    op.create_index("ix_notice_emails_person_id", "notice_emails", ["person_id"])


def downgrade() -> None:
    op.drop_index("ix_notice_emails_person_id", table_name="notice_emails")
    op.drop_index("ix_notice_emails_tenant_id", table_name="notice_emails")
    op.drop_table("notice_emails")
    op.drop_index("ix_notification_preferences_person_id", table_name="notification_preferences")
    op.drop_index("ix_notification_preferences_tenant_id", table_name="notification_preferences")
    op.drop_table("notification_preferences")
