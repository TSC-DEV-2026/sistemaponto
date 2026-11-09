"""jornada programada, carga e livre

Revision ID: 0013_journey_kinds
Revises: 0012_photo_keys
Create Date: 2026-11-09

"""

from alembic import op
import sqlalchemy as sa

revision = "0013_journey_kinds"
down_revision = "0012_photo_keys"
branch_labels = None
depends_on = None


def _id():
    return sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True)


def _tenant():
    return sa.Column("tenant_id", sa.BigInteger(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)


def upgrade() -> None:
    op.add_column("journeys", sa.Column("kind", sa.String(length=16), nullable=False, server_default="programada"))
    op.add_column("journeys", sa.Column("flexible", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("journeys", sa.Column("tolerance_minutes", sa.Integer(), nullable=False, server_default="10"))
    op.add_column("journeys", sa.Column("weekly_minutes", sa.Integer(), nullable=True))
    op.add_column("employee_vigencies", sa.Column("cycle_day", sa.Integer(), nullable=True))
    op.create_table(
        "journey_versions",
        _id(),
        _tenant(),
        sa.Column("journey_id", sa.BigInteger(), sa.ForeignKey("journeys.id", ondelete="CASCADE"), nullable=False),
        sa.Column("valid_from", sa.Date(), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("flexible", sa.Boolean(), nullable=False),
        sa.Column("tolerance_minutes", sa.Integer(), nullable=False),
        sa.Column("weekly_minutes", sa.Integer(), nullable=True),
    )
    op.create_index("ix_journey_versions_tenant_id", "journey_versions", ["tenant_id"])
    op.create_index("ix_journey_versions_journey_id", "journey_versions", ["journey_id"])
    op.create_table(
        "journey_days",
        _id(),
        _tenant(),
        sa.Column("version_id", sa.BigInteger(), sa.ForeignKey("journey_versions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("off", sa.Boolean(), nullable=False),
    )
    op.create_index("ix_journey_days_tenant_id", "journey_days", ["tenant_id"])
    op.create_index("ix_journey_days_version_id", "journey_days", ["version_id"])
    op.create_table(
        "journey_spans",
        _id(),
        _tenant(),
        sa.Column("day_id", sa.BigInteger(), sa.ForeignKey("journey_days.id", ondelete="CASCADE"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("starts_at", sa.String(length=5), nullable=False),
        sa.Column("ends_at", sa.String(length=5), nullable=False),
    )
    op.create_index("ix_journey_spans_tenant_id", "journey_spans", ["tenant_id"])
    op.create_index("ix_journey_spans_day_id", "journey_spans", ["day_id"])

    bind = op.get_bind()
    journeys = bind.execute(
        sa.text("SELECT id, tenant_id, morning_start, morning_end, afternoon_start, afternoon_end FROM journeys")
    ).mappings()
    for journey in journeys:
        version_id = bind.execute(
            sa.text(
                """
                INSERT INTO journey_versions
                    (tenant_id, journey_id, valid_from, kind, flexible, tolerance_minutes, weekly_minutes)
                VALUES
                    (:tenant_id, :journey_id, DATE '1900-01-01', 'programada', false, 10, NULL)
                RETURNING id
                """
            ),
            {"tenant_id": journey["tenant_id"], "journey_id": journey["id"]},
        ).scalar()
        for position in range(1, 8):
            off = position >= 6
            day_id = bind.execute(
                sa.text(
                    """
                    INSERT INTO journey_days (tenant_id, version_id, position, off)
                    VALUES (:tenant_id, :version_id, :position, :off)
                    RETURNING id
                    """
                ),
                {"tenant_id": journey["tenant_id"], "version_id": version_id, "position": position, "off": off},
            ).scalar()
            if off:
                continue
            span_position = 1
            pairs = (
                (journey["morning_start"], journey["morning_end"]),
                (journey["afternoon_start"], journey["afternoon_end"]),
            )
            for start, end in pairs:
                if not start or not end:
                    continue
                bind.execute(
                    sa.text(
                        """
                        INSERT INTO journey_spans (tenant_id, day_id, position, starts_at, ends_at)
                        VALUES (:tenant_id, :day_id, :position, :starts_at, :ends_at)
                        """
                    ),
                    {
                        "tenant_id": journey["tenant_id"],
                        "day_id": day_id,
                        "position": span_position,
                        "starts_at": start,
                        "ends_at": end,
                    },
                )
                span_position += 1
    bind.execute(
        sa.text(
            """
            UPDATE employee_vigencies
            SET cycle_day = EXTRACT(ISODOW FROM valid_from)::integer
            WHERE kind = 'journey' AND cycle_day IS NULL
            """
        )
    )
    op.alter_column("journeys", "kind", server_default=None)
    op.alter_column("journeys", "flexible", server_default=None)
    op.alter_column("journeys", "tolerance_minutes", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_journey_spans_day_id", table_name="journey_spans")
    op.drop_index("ix_journey_spans_tenant_id", table_name="journey_spans")
    op.drop_table("journey_spans")
    op.drop_index("ix_journey_days_version_id", table_name="journey_days")
    op.drop_index("ix_journey_days_tenant_id", table_name="journey_days")
    op.drop_table("journey_days")
    op.drop_index("ix_journey_versions_journey_id", table_name="journey_versions")
    op.drop_index("ix_journey_versions_tenant_id", table_name="journey_versions")
    op.drop_table("journey_versions")
    op.drop_column("employee_vigencies", "cycle_day")
    op.drop_column("journeys", "weekly_minutes")
    op.drop_column("journeys", "tolerance_minutes")
    op.drop_column("journeys", "flexible")
    op.drop_column("journeys", "kind")
