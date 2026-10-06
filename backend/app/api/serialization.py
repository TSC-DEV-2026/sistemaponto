from typing import Any

from pydantic import BaseModel

from app.core.fields import apply_fields


def dump_one(entity: Any, schema: type[BaseModel], fields: str | None) -> dict:
    body = schema.model_validate(entity).model_dump(mode="json")
    return apply_fields(body, fields, schema)


def dump_page(
    items: list[Any],
    total: int,
    page: int,
    limit: int,
    schema: type[BaseModel],
    fields: str | None,
) -> dict:
    return {
        "items": [dump_one(item, schema, fields) for item in items],
        "total": total,
        "page": page,
        "limit": limit,
    }
