"""período do fechamento, cancelamento e reabertura

Revision ID: 0006_period_closing
Revises: 0005_hour_bank
Create Date: 2026-10-08

"""

from alembic import op
import sqlalchemy as sa

revision = "0006_period_closing"
down_revision = "0005_hour_bank"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("closings", sa.Column("starts_on", sa.Date(), nullable=True))
    op.add_column("closings", sa.Column("ends_on", sa.Date(), nullable=True))
    op.execute(
        """
        UPDATE closings
        SET starts_on = make_date(year::int, month::int, 1),
            ends_on = (make_date(year::int, month::int, 1) + interval '1 month' - interval '1 day')::date
        """
    )
    op.alter_column("closings", "starts_on", nullable=False)
    op.alter_column("closings", "ends_on", nullable=False)
    op.drop_constraint("uq_closing_period", "closings", type_="unique")


def downgrade() -> None:
    op.create_unique_constraint("uq_closing_period", "closings", ["tenant_id", "year", "month"])
    op.drop_column("closings", "ends_on")
    op.drop_column("closings", "starts_on")
