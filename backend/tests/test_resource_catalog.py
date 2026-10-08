from pydantic import BaseModel
from sqlalchemy.orm import DeclarativeBase

from app.core.resource_catalog import RESOURCES, catalog_item, catalog_items
from app.schemas.membership import MembershipOut
from app.schemas.tenant import TenantOut


def test_memberships_nao_expoe_senha():
    item = catalog_item("memberships")
    assert item is not None
    assert item["fields"] == list(MembershipOut.model_fields.keys())
    assert "password" not in item["fields"]
    assert "password_hash" not in item["fields"]
    assert "cpf" not in item["fields"]


def test_tenants_reflete_o_schema():
    item = catalog_item("tenants")
    assert item is not None
    assert item["fields"] == list(TenantOut.model_fields.keys())
    assert item["list_fields"] == item["fields"]


def test_nome_inexistente_retorna_none():
    assert catalog_item("products") is None


def test_registry_so_tem_pydantic():
    for pair in RESOURCES.values():
        for schema in pair:
            assert issubclass(schema, BaseModel)
            assert not issubclass(schema, DeclarativeBase)


def test_lista_e_filtro_sem_sql():
    items = catalog_items()
    assert [item["name"] for item in items] == [
        "tenants",
        "memberships",
        "jobs",
        "cost-centers",
        "units",
        "sectors",
        "teams",
        "journeys",
        "unions",
        "labor-agreements",
        "holidays",
        "punch-rules",
        "reasons",
        "employees",
        "employee-vigencies",
        "punches",
        "occurrences",
        "requests",
        "closings",
        "hour-bank-entries",
        "fiscal-files",
        "notifications",
        "notification-preferences",
        "notice-emails",
        "audits",
    ]
    found = [item for item in items if item["name"] == "tenants"]
    assert len(found) == 1
    missing = [item for item in items if item["name"] == "products"]
    assert missing == []
