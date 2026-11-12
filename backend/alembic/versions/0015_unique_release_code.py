"""código de liberação único

Revision ID: 0015_unique_release_code
Revises: 0014_clock_devices
Create Date: 2026-11-12

"""

from alembic import op

revision = "0015_unique_release_code"
down_revision = "0014_clock_devices"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "uq_clock_release_codes_code_hash",
        "clock_release_codes",
        ["code_hash"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_clock_release_codes_code_hash", table_name="clock_release_codes")
