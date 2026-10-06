"""create tenants, memberships and refresh tokens

Revision ID: 0001_create_tenants
Revises:
Create Date: 2026-10-01

"""

from alembic import op
import sqlalchemy as sa

revision = "0001_create_tenants"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("document", sa.String(length=14), nullable=True),
        sa.Column("trial_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("employee_capacity", sa.Integer(), nullable=False),
    )
    op.create_index("ix_tenants_id", "tenants", ["id"])
    op.create_index("ix_tenants_slug", "tenants", ["slug"], unique=True)
    op.create_index("ix_tenants_document", "tenants", ["document"], unique=True)

    op.create_table(
        "memberships",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("person_id", sa.BigInteger(), nullable=False),
        sa.Column("tenant_id", sa.BigInteger(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.UniqueConstraint("person_id", "tenant_id", name="uq_membership_person_tenant"),
    )
    op.create_index("ix_memberships_id", "memberships", ["id"])
    op.create_index("ix_memberships_person_id", "memberships", ["person_id"])
    op.create_index("ix_memberships_tenant_id", "memberships", ["tenant_id"])

    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("person_id", sa.BigInteger(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("auth_version", sa.Integer(), nullable=False),
    )
    op.create_index("ix_refresh_tokens_id", "refresh_tokens", ["id"])
    op.create_index("ix_refresh_tokens_person_id", "refresh_tokens", ["person_id"])
    op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=True)


def downgrade() -> None:
    op.drop_table("refresh_tokens")
    op.drop_table("memberships")
    op.drop_table("tenants")
