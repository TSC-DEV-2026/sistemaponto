"""canal do aviso

Revision ID: 0018_notice_channels
Revises: 0017_closing_journey_pins
Create Date: 2026-11-15

"""

from alembic import op
import sqlalchemy as sa


revision = "0018_notice_channels"
down_revision = "0017_closing_journey_pins"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "notification_preferences",
        sa.Column("channel", sa.String(length=16), nullable=False, server_default="both"),
    )


def downgrade() -> None:
    op.drop_column("notification_preferences", "channel")
