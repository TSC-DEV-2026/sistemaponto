"""matrícula, QR com selfie e reconhecimento facial

Revision ID: 0010_registration
Revises: 0009_billing
Create Date: 2026-10-08

"""

from alembic import op
import sqlalchemy as sa

revision = "0010_registration"
down_revision = "0009_billing"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("registration_number", sa.String(length=32), nullable=True))
    op.create_unique_constraint(
        "uq_employee_tenant_registration",
        "employees",
        ["tenant_id", "registration_number"],
    )
    op.add_column("punches", sa.Column("channel", sa.String(length=16), nullable=True))


def downgrade() -> None:
    op.drop_column("punches", "channel")
    op.drop_constraint("uq_employee_tenant_registration", "employees", type_="unique")
    op.drop_column("employees", "registration_number")
