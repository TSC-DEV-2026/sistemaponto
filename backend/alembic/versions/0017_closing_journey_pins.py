"""grava a jornada no fechamento

Revision ID: 0017_closing_journey_pins
Revises: 0016_classifications
Create Date: 2026-11-13

"""

from alembic import op
import sqlalchemy as sa


revision = "0017_closing_journey_pins"
down_revision = "0016_classifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "closing_journey_pins",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("tenant_id", sa.BigInteger(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("closing_id", sa.BigInteger(), sa.ForeignKey("closings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("journey_id", sa.BigInteger(), sa.ForeignKey("journeys.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "version_id",
            sa.BigInteger(),
            sa.ForeignKey("journey_versions.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("covers_from", sa.Date(), nullable=False),
        sa.UniqueConstraint("closing_id", "journey_id", "covers_from", name="uq_closing_journey_pin"),
    )
    op.create_index("ix_closing_journey_pins_id", "closing_journey_pins", ["id"])
    op.create_index("ix_closing_journey_pins_tenant_id", "closing_journey_pins", ["tenant_id"])
    op.create_index("ix_closing_journey_pins_closing_id", "closing_journey_pins", ["closing_id"])
    op.create_index("ix_closing_journey_pins_journey_id", "closing_journey_pins", ["journey_id"])
    op.create_index("ix_closing_journey_pins_version_id", "closing_journey_pins", ["version_id"])


def downgrade() -> None:
    op.drop_index("ix_closing_journey_pins_version_id", table_name="closing_journey_pins")
    op.drop_index("ix_closing_journey_pins_journey_id", table_name="closing_journey_pins")
    op.drop_index("ix_closing_journey_pins_closing_id", table_name="closing_journey_pins")
    op.drop_index("ix_closing_journey_pins_tenant_id", table_name="closing_journey_pins")
    op.drop_index("ix_closing_journey_pins_id", table_name="closing_journey_pins")
    op.drop_table("closing_journey_pins")
