"""classificação no lugar do centro de custo

Revision ID: 0016_classifications
Revises: 0015_unique_release_code
Create Date: 2026-11-12

"""

from alembic import op
import sqlalchemy as sa

revision = "0016_classifications"
down_revision = "0015_unique_release_code"
branch_labels = None
depends_on = None


def _id():
    return sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True)


def _tenant():
    return sa.Column("tenant_id", sa.BigInteger(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)


def _index(table: str, column: str) -> None:
    op.create_index(f"ix_{table}_{column}", table, [column])


def upgrade() -> None:
    op.create_table(
        "classifications",
        _id(),
        _tenant(),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.UniqueConstraint("tenant_id", "name", name="uq_classification_tenant_name"),
    )
    _index("classifications", "id")
    _index("classifications", "tenant_id")

    op.create_table(
        "classification_values",
        _id(),
        _tenant(),
        sa.Column("classification_id", sa.BigInteger(), sa.ForeignKey("classifications.id"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.UniqueConstraint("classification_id", "name", name="uq_classification_value_name"),
    )
    _index("classification_values", "id")
    _index("classification_values", "tenant_id")
    _index("classification_values", "classification_id")

    op.add_column("employee_vigencies", sa.Column("classification_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key(
        "fk_employee_vigencies_classification_id",
        "employee_vigencies",
        "classifications",
        ["classification_id"],
        ["id"],
    )
    op.create_index("ix_employee_vigencies_classification_id", "employee_vigencies", ["classification_id"])

    bind = op.get_bind()
    tenants = bind.execute(sa.text("SELECT DISTINCT tenant_id FROM cost_centers")).fetchall()
    for (tenant_id,) in tenants:
        classification_id = bind.execute(
            sa.text("INSERT INTO classifications (tenant_id, name) VALUES (:tenant_id, :name) RETURNING id"),
            {"tenant_id": tenant_id, "name": "Centro de custo"},
        ).scalar_one()
        centers = bind.execute(
            sa.text("SELECT id, name FROM cost_centers WHERE tenant_id = :tenant_id"),
            {"tenant_id": tenant_id},
        ).fetchall()
        for center_id, name in centers:
            value_id = bind.execute(
                sa.text(
                    "INSERT INTO classification_values (tenant_id, classification_id, name) "
                    "VALUES (:tenant_id, :classification_id, :name) RETURNING id"
                ),
                {"tenant_id": tenant_id, "classification_id": classification_id, "name": name},
            ).scalar_one()
            bind.execute(
                sa.text(
                    "UPDATE employee_vigencies SET kind = 'classification', classification_id = :classification_id, "
                    "reference_id = :value_id WHERE tenant_id = :tenant_id AND kind = 'cost_center' "
                    "AND reference_id = :center_id"
                ),
                {
                    "classification_id": classification_id,
                    "value_id": value_id,
                    "tenant_id": tenant_id,
                    "center_id": center_id,
                },
            )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "UPDATE employee_vigencies AS vigency SET kind = 'cost_center', reference_id = center.id, "
            "classification_id = NULL FROM classification_values AS value "
            "JOIN classifications AS classification ON classification.id = value.classification_id "
            "JOIN cost_centers AS center ON center.tenant_id = value.tenant_id AND center.name = value.name "
            "WHERE vigency.kind = 'classification' AND vigency.classification_id = classification.id "
            "AND classification.name = 'Centro de custo' AND vigency.reference_id = value.id "
            "AND vigency.tenant_id = center.tenant_id"
        )
    )
    bind.execute(sa.text("DELETE FROM employee_vigencies WHERE kind = 'classification'"))
    op.drop_index("ix_employee_vigencies_classification_id", table_name="employee_vigencies")
    op.drop_constraint("fk_employee_vigencies_classification_id", "employee_vigencies", type_="foreignkey")
    op.drop_column("employee_vigencies", "classification_id")
    op.drop_index("ix_classification_values_classification_id", table_name="classification_values")
    op.drop_index("ix_classification_values_tenant_id", table_name="classification_values")
    op.drop_index("ix_classification_values_id", table_name="classification_values")
    op.drop_table("classification_values")
    op.drop_index("ix_classifications_tenant_id", table_name="classifications")
    op.drop_index("ix_classifications_id", table_name="classifications")
    op.drop_table("classifications")
