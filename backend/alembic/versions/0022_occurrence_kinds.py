"""ocorrências no plural

Revision ID: 0022_occurrence_kinds
Revises: 0021_resource_names
Create Date: 2026-11-16

"""

from alembic import op


revision = "0022_occurrence_kinds"
down_revision = "0021_resource_names"
branch_labels = None
depends_on = None

_KINDS = (
    ("absence", "absences"),
    ("allowance", "allowances"),
    ("certificate", "certificates"),
    ("leave", "leaves"),
    ("vacation", "vacations"),
)


def upgrade() -> None:
    for old, new in _KINDS:
        op.execute(f"UPDATE occurrences SET kind = '{new}' WHERE kind = '{old}'")


def downgrade() -> None:
    for old, new in _KINDS:
        op.execute(f"UPDATE occurrences SET kind = '{old}' WHERE kind = '{new}'")
