from fastapi import APIRouter, Depends, Query

from app.api.dependencies.auth import require_tenant
from app.api.responses import json_data
from app.api.serialization import dump_one, dump_page
from app.core.exceptions import AppError
from app.core.resource_catalog import catalog_item, catalog_items
from app.schemas.common import Envelope, Page
from app.schemas.meta import ResourceOut

router = APIRouter(prefix="/meta", tags=["meta"])


@router.get(
    "/resources",
    response_model=Envelope[Page[ResourceOut]],
    summary="Catálogo de recursos",
    description="Chaves aceitas em fields, a partir dos schemas de resposta. Não lê o banco.",
)
def list_resources(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    name: str | None = Query(default=None, max_length=64),
    _actor=Depends(require_tenant),
):
    if name and name.strip():
        item = catalog_item(name.strip())
        rows = [item] if item else []
    else:
        rows = catalog_items()
    total = len(rows)
    start = (page - 1) * limit
    page_rows = rows[start : start + limit]
    return json_data(dump_page(page_rows, total, page, limit, ResourceOut, fields))


@router.get(
    "/resources/{name}",
    response_model=Envelope[ResourceOut],
    summary="Recurso do catálogo",
    description="Um recurso pelo nome da coleção.",
)
def get_resource(
    name: str,
    fields: str | None = Query(default=None, max_length=500),
    _actor=Depends(require_tenant),
):
    item = catalog_item(name)
    if item is None:
        raise AppError(404, "Recurso não encontrado")
    return json_data(dump_one(item, ResourceOut, fields))
