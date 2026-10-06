from pydantic import BaseModel

from app.schemas.membership import MembershipOut
from app.schemas.tenant import TenantOut

# nome da coleção → (*Out do detalhe, *Out/*ListOut da lista)
RESOURCES: dict[str, tuple[type[BaseModel], type[BaseModel]]] = {
    "tenants": (TenantOut, TenantOut),
    "memberships": (MembershipOut, MembershipOut),
}


def catalog_item(name: str) -> dict | None:
    pair = RESOURCES.get(name)
    if pair is None:
        return None
    out_schema, list_schema = pair
    return {
        "name": name,
        "fields": list(out_schema.model_fields.keys()),
        "list_fields": list(list_schema.model_fields.keys()),
    }


def catalog_items() -> list[dict]:
    return [catalog_item(name) for name in RESOURCES]
