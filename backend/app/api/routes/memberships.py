from fastapi import APIRouter, Depends, Query

from app.api.dependencies.auth import Actor, require_admin, require_tenant
from app.api.dependencies.services import get_membership_service
from app.api.responses import json_data
from app.api.serialization import dump_one, dump_page
from app.core.exceptions import AppError
from app.schemas.common import Envelope, Page
from app.schemas.membership import MembershipCreate, MembershipOut, MembershipUpdate
from app.services.membership_service import MembershipService

router = APIRouter(prefix="/memberships", tags=["memberships"])


def _blank(value: str | None) -> str | None:
    if value is None or not value.strip():
        return None
    return value.strip()


@router.get(
    "",
    response_model=Envelope[Page[MembershipOut]],
    summary="Listar vínculos",
    description="Vínculos da empresa ativa. Paginada. Filtros nomeados: role, person_id.",
)
def list_memberships(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    role: str | None = Query(default=None, max_length=32),
    person_id: int | None = Query(default=None, ge=1),
    actor: Actor = Depends(require_tenant),
    service: MembershipService = Depends(get_membership_service),
):
    items, total = service.list(
        actor.tenant_id,
        role=_blank(role),
        person_id=person_id,
        page=page,
        limit=limit,
    )
    return json_data(dump_page(items, total, page, limit, MembershipOut, fields))


@router.get(
    "/{membership_id}",
    response_model=Envelope[MembershipOut],
    summary="Detalhe do vínculo",
    description="Um vínculo da empresa ativa.",
)
def get_membership(
    membership_id: int,
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: MembershipService = Depends(get_membership_service),
):
    row = service.memberships.get_in_tenant(membership_id, actor.tenant_id)
    if row is None:
        raise AppError(404, "Vínculo não encontrado")
    return json_data(dump_one(service.view(row), MembershipOut, fields))


@router.post(
    "",
    response_model=Envelope[MembershipOut],
    summary="Vincular pessoa",
    description="Acha ou cria a pessoa no autenticador, sem senha, e grava o vínculo nesta empresa.",
    status_code=201,
)
def create_membership(
    body: MembershipCreate,
    actor: Actor = Depends(require_admin),
    service: MembershipService = Depends(get_membership_service),
):
    row = service.create(actor.tenant_id, body)
    return json_data(dump_one(row, MembershipOut, None), status_code=201)


@router.put(
    "/{membership_id}",
    response_model=Envelope[MembershipOut],
    summary="Atualizar vínculo",
    description="Altera o papel na empresa ativa.",
)
def update_membership(
    membership_id: int,
    body: MembershipUpdate,
    actor: Actor = Depends(require_admin),
    service: MembershipService = Depends(get_membership_service),
):
    row = service.memberships.get_in_tenant(membership_id, actor.tenant_id)
    if row is None:
        raise AppError(404, "Vínculo não encontrado")
    saved = service.update(row, body)
    return json_data(dump_one(saved, MembershipOut, None))


@router.delete(
    "/{membership_id}",
    response_model=Envelope[None],
    summary="Excluir vínculo",
    description="Remove a pessoa desta empresa. A empresa precisa continuar com um administrador.",
)
def delete_membership(
    membership_id: int,
    actor: Actor = Depends(require_admin),
    service: MembershipService = Depends(get_membership_service),
):
    row = service.memberships.get_in_tenant(membership_id, actor.tenant_id)
    if row is None:
        raise AppError(404, "Vínculo não encontrado")
    service.delete(row)
    return json_data(None)
