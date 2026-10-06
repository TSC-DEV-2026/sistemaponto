import re
from typing import Any

from pydantic import BaseModel

_FIELD_NAME = re.compile(r"^[a-z][a-z0-9_]*$")
_MAX_NAMES = 40


def parse_fields(raw: str | None) -> list[str] | None:
    """None = sem recorte. Não lança; nomes inválidos são descartados."""
    if raw is None or not str(raw).strip():
        return None
    names: list[str] = []
    seen: set[str] = set()
    for part in str(raw).split(","):
        name = part.strip().lower()
        if not name or name in seen or not _FIELD_NAME.fullmatch(name):
            continue
        seen.add(name)
        names.append(name)
        if len(names) >= _MAX_NAMES:
            break
    return names or None


def apply_fields(
    payload: dict[str, Any],
    raw_fields: str | None,
    schema: type[BaseModel],
) -> dict[str, Any]:
    requested = parse_fields(raw_fields)
    allowed = set(schema.model_fields.keys())
    if requested is None:
        return {k: v for k, v in payload.items() if k in allowed}
    return {k: payload[k] for k in requested if k in allowed and k in payload}
