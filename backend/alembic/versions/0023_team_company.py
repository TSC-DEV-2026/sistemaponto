"""equipe ligada direto na empresa e grupo Setores

Revision ID: 0023_team_company
Revises: 0022_occurrence_kinds
Create Date: 2026-11-17

O histórico de setor e de grupo é apagado. O downgrade recria a tabela
de setores, mas não devolve os grupos nem as vigências removidas.

"""

from alembic import op


revision = "0023_team_company"
down_revision = "0022_occurrence_kinds"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE teams ADD COLUMN unit_id BIGINT")
    op.execute(
        """
        UPDATE teams AS team
        SET unit_id = sector.unit_id
        FROM sectors AS sector
        WHERE team.sector_id = sector.id
        """
    )
    op.execute("DELETE FROM teams WHERE unit_id IS NULL")
    op.execute(
        """
        UPDATE teams AS team
        SET name = team.name || ' ' || team.id::text
        WHERE EXISTS (
            SELECT 1
            FROM teams AS other
            WHERE other.tenant_id = team.tenant_id
              AND other.unit_id = team.unit_id
              AND other.name = team.name
              AND other.id < team.id
        )
        """
    )
    op.execute("ALTER TABLE teams ALTER COLUMN unit_id SET NOT NULL")
    op.execute(
        "ALTER TABLE teams ADD CONSTRAINT teams_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES units (id)"
    )
    op.execute("CREATE INDEX ix_teams_unit_id ON teams (unit_id)")
    op.execute("ALTER TABLE teams DROP CONSTRAINT teams_sector_id_fkey")
    op.execute("ALTER TABLE teams DROP CONSTRAINT uq_team_sector_name")
    op.execute("DROP INDEX IF EXISTS ix_teams_sector_id")
    op.execute("ALTER TABLE teams DROP COLUMN sector_id")
    op.execute(
        "ALTER TABLE teams ADD CONSTRAINT uq_team_unit_name UNIQUE (tenant_id, unit_id, name)"
    )
    op.execute("DROP TABLE sectors")
    op.execute("DELETE FROM employee_vigencies WHERE kind IN ('sector', 'group')")
    op.execute("DELETE FROM group_values")
    op.execute("DELETE FROM groups")
    op.execute("ALTER TABLE groups ALTER COLUMN id RESTART WITH 1")
    op.execute("ALTER TABLE group_values ALTER COLUMN id RESTART WITH 1")
    op.execute(
        """
        INSERT INTO groups (tenant_id, name)
        SELECT id, 'Setores' FROM tenants
        """
    )
    op.execute(
        """
        INSERT INTO group_values (tenant_id, group_id, name)
        SELECT tenant_id, id, 'Setor padrão'
        FROM groups
        WHERE name = 'Setores'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        CREATE TABLE sectors (
            id BIGSERIAL PRIMARY KEY,
            tenant_id BIGINT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
            unit_id BIGINT NOT NULL REFERENCES units (id),
            name VARCHAR(255) NOT NULL,
            CONSTRAINT uq_sector_unit_name UNIQUE (tenant_id, unit_id, name)
        )
        """
    )
    op.execute("CREATE INDEX ix_sectors_tenant_id ON sectors (tenant_id)")
    op.execute("CREATE INDEX ix_sectors_unit_id ON sectors (unit_id)")
    op.execute(
        """
        INSERT INTO sectors (tenant_id, unit_id, name)
        SELECT tenant_id, id, 'Setor padrão' FROM units
        """
    )
    op.execute("ALTER TABLE teams ADD COLUMN sector_id BIGINT")
    op.execute(
        """
        UPDATE teams AS team
        SET sector_id = sector.id
        FROM sectors AS sector
        WHERE sector.tenant_id = team.tenant_id
          AND sector.unit_id = team.unit_id
        """
    )
    op.execute("ALTER TABLE teams ALTER COLUMN sector_id SET NOT NULL")
    op.execute(
        "ALTER TABLE teams ADD CONSTRAINT teams_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES sectors (id)"
    )
    op.execute("CREATE INDEX ix_teams_sector_id ON teams (sector_id)")
    op.execute("ALTER TABLE teams DROP CONSTRAINT uq_team_unit_name")
    op.execute("ALTER TABLE teams DROP CONSTRAINT teams_unit_id_fkey")
    op.execute("DROP INDEX IF EXISTS ix_teams_unit_id")
    op.execute("ALTER TABLE teams DROP COLUMN unit_id")
    op.execute(
        "ALTER TABLE teams ADD CONSTRAINT uq_team_sector_name UNIQUE (tenant_id, sector_id, name)"
    )
