"""categoria no lugar de grupo

Revision ID: 0024_categories
Revises: 0023_team_company
Create Date: 2026-11-17

"""

from alembic import op


revision = "0024_categories"
down_revision = "0023_team_company"
branch_labels = None
depends_on = None


def _rename_index(old: str, new: str) -> None:
    op.execute(f'ALTER INDEX IF EXISTS "{old}" RENAME TO "{new}"')


def _rename_constraint(table: str, old: str, new: str) -> None:
    op.execute(f'ALTER TABLE "{table}" RENAME CONSTRAINT "{old}" TO "{new}"')


def upgrade() -> None:
    op.rename_table("groups", "categories")
    op.rename_table("group_values", "category_values")
    op.alter_column("category_values", "group_id", new_column_name="category_id")
    op.alter_column("employee_vigencies", "group_id", new_column_name="category_id")
    _rename_index("ix_groups_id", "ix_categories_id")
    _rename_index("ix_groups_tenant_id", "ix_categories_tenant_id")
    _rename_index("ix_group_values_id", "ix_category_values_id")
    _rename_index("ix_group_values_tenant_id", "ix_category_values_tenant_id")
    _rename_index("ix_group_values_group_id", "ix_category_values_category_id")
    _rename_index("ix_employee_vigencies_group_id", "ix_employee_vigencies_category_id")
    _rename_constraint("categories", "uq_group_tenant_name", "uq_category_tenant_name")
    _rename_constraint("categories", "classifications_pkey", "categories_pkey")
    _rename_constraint("categories", "classifications_tenant_id_fkey", "categories_tenant_id_fkey")
    _rename_constraint("category_values", "uq_group_value_name", "uq_category_value_name")
    _rename_constraint("category_values", "classification_values_pkey", "category_values_pkey")
    _rename_constraint("category_values", "classification_values_tenant_id_fkey", "category_values_tenant_id_fkey")
    _rename_constraint("category_values", "classification_values_classification_id_fkey", "category_values_category_id_fkey")
    _rename_constraint("employee_vigencies", "fk_employee_vigencies_group_id", "fk_employee_vigencies_category_id")
    op.execute("ALTER SEQUENCE classifications_id_seq RENAME TO categories_id_seq")
    op.execute("ALTER SEQUENCE classification_values_id_seq RENAME TO category_values_id_seq")
    op.execute("UPDATE employee_vigencies SET kind = 'category' WHERE kind = 'group'")


def downgrade() -> None:
    op.execute("UPDATE employee_vigencies SET kind = 'group' WHERE kind = 'category'")
    op.execute("ALTER SEQUENCE category_values_id_seq RENAME TO classification_values_id_seq")
    op.execute("ALTER SEQUENCE categories_id_seq RENAME TO classifications_id_seq")
    _rename_constraint("employee_vigencies", "fk_employee_vigencies_category_id", "fk_employee_vigencies_group_id")
    _rename_constraint("category_values", "category_values_category_id_fkey", "classification_values_classification_id_fkey")
    _rename_constraint("category_values", "category_values_tenant_id_fkey", "classification_values_tenant_id_fkey")
    _rename_constraint("category_values", "category_values_pkey", "classification_values_pkey")
    _rename_constraint("category_values", "uq_category_value_name", "uq_group_value_name")
    _rename_constraint("categories", "categories_tenant_id_fkey", "classifications_tenant_id_fkey")
    _rename_constraint("categories", "categories_pkey", "classifications_pkey")
    _rename_constraint("categories", "uq_category_tenant_name", "uq_group_tenant_name")
    _rename_index("ix_employee_vigencies_category_id", "ix_employee_vigencies_group_id")
    _rename_index("ix_category_values_category_id", "ix_group_values_group_id")
    _rename_index("ix_category_values_tenant_id", "ix_group_values_tenant_id")
    _rename_index("ix_category_values_id", "ix_group_values_id")
    _rename_index("ix_categories_tenant_id", "ix_groups_tenant_id")
    _rename_index("ix_categories_id", "ix_groups_id")
    op.alter_column("employee_vigencies", "category_id", new_column_name="group_id")
    op.alter_column("category_values", "category_id", new_column_name="group_id")
    op.rename_table("category_values", "group_values")
    op.rename_table("categories", "groups")
