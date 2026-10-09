from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.api.dependencies.auth import Actor, get_actor, require_admin
from app.api.dependencies.database import get_db
from app.api.dependencies.services import get_tenant_service
from app.api.responses import json_data
from app.api.serialization import dump_one, dump_page
from app.core.documents import normalize_document
from app.core.exceptions import AppError
from app.repositories.membership_repository import MembershipRepository
from app.schemas.common import Envelope, Page
from app.schemas.tenant import TenantCreate, TenantOut, TenantUpdate
from app.services.company_defaults import ensure_company_defaults
from app.services.tenant_service import TenantService

router = APIRouter(prefix="/tenants", tags=["tenants"])


def _blank(value: str | None) -> str | None:
    if value is None or not value.strip():
        return None
    return value.strip()


@router.get(
    "",
    response_model=Envelope[Page[TenantOut]],
    summary="Listar empresas",
    description="Empresas em que a pessoa tem vínculo. Paginada. Filtros nomeados: name, slug, document.",
)
def list_tenants(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    name: str | None = Query(default=None, max_length=255),
    slug: str | None = Query(default=None, max_length=100),
    document: str | None = Query(default=None, max_length=18),
    service: TenantService = Depends(get_tenant_service),
):
    actor = get_actor(request)
    document_filter = normalize_document(document) if _blank(document) else None
    items, total = service.tenants.list_for_person(
        actor.person_id,
        name=_blank(name),
        slug=_blank(slug),
        document=document_filter,
        page=page,
        limit=limit,
    )
    return json_data(dump_page(items, total, page, limit, TenantOut, fields))


@router.get(
    "/{tenant_id}",
    response_model=Envelope[TenantOut],
    summary="Detalhe da empresa",
    description="Uma empresa em que a pessoa tem vínculo.",
)
def get_tenant(
    tenant_id: int,
    request: Request,
    fields: str | None = Query(default=None, max_length=500),
    service: TenantService = Depends(get_tenant_service),
):
    actor = get_actor(request)
    row = service.tenants.get_for_person(tenant_id, actor.person_id)
    if row is None:
        raise AppError(404, "Empresa não encontrada")
    return json_data(dump_one(row, TenantOut, fields))


@router.post(
    "",
    response_model=Envelope[TenantOut],
    summary="Criar empresa",
    description="Quem já é admin de alguma empresa deste sistema cria outra e passa a ser admin dela.",
    status_code=201,
)
def create_tenant(
    body: TenantCreate,
    actor: Actor = Depends(require_admin),
    db: Session = Depends(get_db),
    service: TenantService = Depends(get_tenant_service),
):
    row = service.create(body)
    MembershipRepository(db).create(person_id=actor.person_id, tenant_id=row.id, role="admin")
    ensure_company_defaults(db, row.id)
    return json_data(dump_one(row, TenantOut, None), status_code=201)


@router.put(
    "/{tenant_id}",
    response_model=Envelope[TenantOut],
    summary="Atualizar empresa",
    description="Altera a empresa ativa. O id tem de ser o tenant do JWT.",
)
def update_tenant(
    tenant_id: int,
    body: TenantUpdate,
    actor: Actor = Depends(require_admin),
    service: TenantService = Depends(get_tenant_service),
):
    if tenant_id != actor.tenant_id:
        raise AppError(404, "Empresa não encontrada")
    row = service.tenants.get_by_id(tenant_id)
    if row is None:
        raise AppError(404, "Empresa não encontrada")
    saved = service.update(row, body)
    return json_data(dump_one(saved, TenantOut, None))


@router.delete(
    "/{tenant_id}",
    response_model=Envelope[None],
    summary="Excluir empresa",
    description="Apaga a empresa ativa e os vínculos dela.",
)
def delete_tenant(
    tenant_id: int,
    actor: Actor = Depends(require_admin),
    service: TenantService = Depends(get_tenant_service),
):
    if tenant_id != actor.tenant_id:
        raise AppError(404, "Empresa não encontrada")
    row = service.tenants.get_by_id(tenant_id)
    if row is None:
        raise AppError(404, "Empresa não encontrada")
    service.tenants.delete(row)
    return json_data(None)
