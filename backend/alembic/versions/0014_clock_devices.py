"""aparelho compartilhado

Revision ID: 0014_clock_devices
Revises: 0013_journey_kinds
Create Date: 2026-11-11

"""

from alembic import op
import sqlalchemy as sa

revision = "0014_clock_devices"
down_revision = "0013_journey_kinds"
branch_labels = None
depends_on = None


def _id():
    return sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True)


def _tenant():
    return sa.Column("tenant_id", sa.BigInteger(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)


def upgrade() -> None:
    op.create_table(
        "clock_devices",
        _id(),
        sa.Column("public_id", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("public_id", name="uq_clock_device_public_id"),
    )
    op.create_table(
        "clock_release_codes",
        _id(),
        _tenant(),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_person_id", sa.BigInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_clock_release_codes_tenant_id", "clock_release_codes", ["tenant_id"])
    op.create_index("ix_clock_release_codes_code_hash", "clock_release_codes", ["code_hash"])
    op.create_table(
        "clock_device_grants",
        _id(),
        sa.Column("device_id", sa.BigInteger(), sa.ForeignKey("clock_devices.id"), nullable=False),
        _tenant(),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_clock_device_grants_device_id", "clock_device_grants", ["device_id"])
    op.create_index("ix_clock_device_grants_tenant_id", "clock_device_grants", ["tenant_id"])
    op.create_index(
        "uq_clock_device_grant_active",
        "clock_device_grants",
        ["device_id", "tenant_id"],
        unique=True,
        postgresql_where=sa.text("revoked_at IS NULL"),
    )
    op.create_table(
        "clock_enroll_attempts",
        _id(),
        sa.Column("public_id", sa.String(length=80), nullable=False),
        sa.Column("failed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_clock_enroll_attempts_public_id", "clock_enroll_attempts", ["public_id"])


def downgrade() -> None:
    op.drop_index("ix_clock_enroll_attempts_public_id", table_name="clock_enroll_attempts")
    op.drop_table("clock_enroll_attempts")
    op.drop_index("uq_clock_device_grant_active", table_name="clock_device_grants")
    op.drop_index("ix_clock_device_grants_tenant_id", table_name="clock_device_grants")
    op.drop_index("ix_clock_device_grants_device_id", table_name="clock_device_grants")
    op.drop_table("clock_device_grants")
    op.drop_index("ix_clock_release_codes_code_hash", table_name="clock_release_codes")
    op.drop_index("ix_clock_release_codes_tenant_id", table_name="clock_release_codes")
    op.drop_table("clock_release_codes")
    op.drop_table("clock_devices")
