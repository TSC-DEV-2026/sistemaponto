"""índices das consultas quentes (Ponto 16)

Revision ID: 0033_hot_query_indexes
Revises: 0032_payroll_events
Create Date: 2026-11-25

Migração só de índice. Contrato de API e telas não mudam.

"""

from alembic import op


revision = "0033_hot_query_indexes"
down_revision = "0032_payroll_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # punches: apuração, fechamento, fiscal e espelho por pessoa e intervalo
    op.create_index(
        "ix_punches_tenant_employee_occurred",
        "punches",
        ["tenant_id", "employee_id", "occurred_at"],
    )
    op.create_index(
        "ix_punches_tenant_occurred_valid",
        "punches",
        ["tenant_id", "occurred_at"],
        postgresql_where="valid IS TRUE",
    )

    # employee_vigencies: vigência aberta e filtro por vínculo
    op.create_index(
        "ix_employee_vigencies_employee_kind_dates",
        "employee_vigencies",
        ["employee_id", "kind", "valid_from", "valid_to"],
    )
    op.create_index(
        "ix_employee_vigencies_tenant_kind_reference",
        "employee_vigencies",
        ["tenant_id", "kind", "reference_id"],
    )

    # occurrences: sobreposição de período por pessoa
    op.create_index(
        "ix_occurrences_tenant_employee_period",
        "occurrences",
        ["tenant_id", "employee_id", "starts_on", "ends_on"],
    )

    # hour_bank_entries: saldo e extrato por data
    op.create_index(
        "ix_hour_bank_entries_tenant_employee_on",
        "hour_bank_entries",
        ["tenant_id", "employee_id", "entry_on"],
    )

    # closings: bloqueio de dia e lista por status/período
    op.create_index(
        "ix_closings_tenant_status_period",
        "closings",
        ["tenant_id", "status", "starts_on", "ends_on"],
    )

    # notices: contar não lidas por pessoa sem varrer a lista
    op.create_index(
        "ix_notices_tenant_person_unread",
        "notices",
        ["tenant_id", "person_id"],
        postgresql_where="read_at IS NULL",
    )


def downgrade() -> None:
    op.drop_index("ix_notices_tenant_person_unread", table_name="notices")
    op.drop_index("ix_closings_tenant_status_period", table_name="closings")
    op.drop_index("ix_hour_bank_entries_tenant_employee_on", table_name="hour_bank_entries")
    op.drop_index("ix_occurrences_tenant_employee_period", table_name="occurrences")
    op.drop_index("ix_employee_vigencies_tenant_kind_reference", table_name="employee_vigencies")
    op.drop_index("ix_employee_vigencies_employee_kind_dates", table_name="employee_vigencies")
    op.drop_index("ix_punches_tenant_occurred_valid", table_name="punches")
    op.drop_index("ix_punches_tenant_employee_occurred", table_name="punches")
