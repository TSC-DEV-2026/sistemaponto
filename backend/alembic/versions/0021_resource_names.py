"""nomes únicos das funcionalidades

Revision ID: 0021_resource_names
Revises: 0020_closing_members
Create Date: 2026-11-16

"""

from alembic import op


revision = "0021_resource_names"
down_revision = "0020_closing_members"
branch_labels = None
depends_on = None


def _rename_index(old: str, new: str) -> None:
    op.execute(f'ALTER INDEX IF EXISTS "{old}" RENAME TO "{new}"')


def _rename_constraint(table: str, old: str, new: str) -> None:
    op.execute(f'ALTER TABLE "{table}" RENAME CONSTRAINT "{old}" TO "{new}"')


def upgrade() -> None:
    op.rename_table("classifications", "groups")
    op.rename_table("classification_values", "group_values")
    op.alter_column("group_values", "classification_id", new_column_name="group_id")
    op.alter_column("employee_vigencies", "classification_id", new_column_name="group_id")
    _rename_index("ix_classifications_id", "ix_groups_id")
    _rename_index("ix_classifications_tenant_id", "ix_groups_tenant_id")
    _rename_index("ix_classification_values_id", "ix_group_values_id")
    _rename_index("ix_classification_values_tenant_id", "ix_group_values_tenant_id")
    _rename_index("ix_classification_values_classification_id", "ix_group_values_group_id")
    _rename_index("ix_employee_vigencies_classification_id", "ix_employee_vigencies_group_id")
    _rename_constraint("groups", "uq_classification_tenant_name", "uq_group_tenant_name")
    _rename_constraint("group_values", "uq_classification_value_name", "uq_group_value_name")
    _rename_constraint("employee_vigencies", "fk_employee_vigencies_classification_id", "fk_employee_vigencies_group_id")
    op.execute("UPDATE employee_vigencies SET kind = 'group' WHERE kind = 'classification'")

    op.rename_table("labor_agreements", "agreements")
    op.rename_table("time_requests", "requests")
    op.rename_table("notifications", "notices")
    op.rename_table("notification_preferences", "notice_preferences")
    _rename_index("ix_notification_preferences_tenant_id", "ix_notice_preferences_tenant_id")
    _rename_index("ix_notification_preferences_person_id", "ix_notice_preferences_person_id")
    _rename_constraint("notice_preferences", "uq_notification_preference", "uq_notice_preference")


def downgrade() -> None:
    _rename_constraint("notice_preferences", "uq_notice_preference", "uq_notification_preference")
    _rename_index("ix_notice_preferences_person_id", "ix_notification_preferences_person_id")
    _rename_index("ix_notice_preferences_tenant_id", "ix_notification_preferences_tenant_id")
    op.rename_table("notice_preferences", "notification_preferences")
    op.rename_table("notices", "notifications")
    op.rename_table("requests", "time_requests")
    op.rename_table("agreements", "labor_agreements")

    op.execute("UPDATE employee_vigencies SET kind = 'classification' WHERE kind = 'group'")
    _rename_constraint("employee_vigencies", "fk_employee_vigencies_group_id", "fk_employee_vigencies_classification_id")
    _rename_constraint("group_values", "uq_group_value_name", "uq_classification_value_name")
    _rename_constraint("groups", "uq_group_tenant_name", "uq_classification_tenant_name")
    _rename_index("ix_employee_vigencies_group_id", "ix_employee_vigencies_classification_id")
    _rename_index("ix_group_values_group_id", "ix_classification_values_classification_id")
    _rename_index("ix_group_values_tenant_id", "ix_classification_values_tenant_id")
    _rename_index("ix_group_values_id", "ix_classification_values_id")
    _rename_index("ix_groups_tenant_id", "ix_classifications_tenant_id")
    _rename_index("ix_groups_id", "ix_classifications_id")
    op.alter_column("employee_vigencies", "group_id", new_column_name="classification_id")
    op.alter_column("group_values", "group_id", new_column_name="classification_id")
    op.rename_table("group_values", "classification_values")
    op.rename_table("groups", "classifications")
