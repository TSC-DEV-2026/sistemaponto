from fastapi import APIRouter, Depends, Query, Request

from app.api.dependencies.auth import Actor, require_admin
from app.api.dependencies.services import get_clock_device_service
from app.api.responses import json_data
from app.api.serialization import dump_one, dump_page
from app.core.exceptions import AppError
from app.schemas.clock_device import (
    ClockDeviceEnroll,
    ClockDeviceEnrolledOut,
    ClockDeviceOut,
    ClockDeviceUpdate,
    ClockReleaseCodeOut,
    DeviceFaceEmbeddingOut,
    DeviceFacePunchCreate,
    DeviceMethodsOut,
    DevicePunchOut,
    DeviceQrPunchCreate,
)
from app.services.clock_device_service import ClockDeviceService
from app.services.workforce_service import Scope

devices = APIRouter(prefix="/clock-devices", tags=["clock-devices"])
codes = APIRouter(prefix="/clock-release-codes", tags=["clock-release-codes"])


def as_scope(actor: Actor) -> Scope:
    if actor.tenant_id is None or actor.role is None:
        raise AppError(403, "Sem permissão")
    return Scope(person_id=actor.person_id, tenant_id=actor.tenant_id, role=actor.role)


def device_keys(request: Request) -> tuple[str, list[str]]:
    public_id = request.headers.get("x-device-id", "")
    raw = request.headers.get("x-device-keys", "")
    keys = [part.strip() for part in raw.split(",") if part.strip()]
    return public_id, keys


@devices.get("", summary="Listar aparelhos", description="Aparelhos liberados nesta empresa. Filtro: public_id.")
def list_devices(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    public_id: str | None = Query(default=None, max_length=80),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_admin),
    service: ClockDeviceService = Depends(get_clock_device_service),
):
    items, total = service.list_devices(as_scope(actor), page, limit, public_id)
    return json_data(dump_page(items, total, page, limit, ClockDeviceOut, fields))


@devices.get("/methods", summary="Métodos liberados no aparelho", description="O aparelho envia X-Device-Id e X-Device-Keys. X-Client é mobile.")
def device_methods(
    request: Request,
    fields: str | None = Query(default=None, max_length=500),
    service: ClockDeviceService = Depends(get_clock_device_service),
):
    public_id, keys = device_keys(request)
    return json_data(dump_one(service.methods(public_id, keys), DeviceMethodsOut, fields))


@devices.get(
    "/face-embeddings",
    summary="Baixar os rostos das empresas liberadas",
    description="Somente quem usa reconhecimento facial. Cada item traz a empresa. X-Device-Id e X-Device-Keys.",
)
def device_embeddings(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    service: ClockDeviceService = Depends(get_clock_device_service),
):
    public_id, keys = device_keys(request)
    items, total = service.embeddings(public_id, keys, page, limit)
    return json_data(dump_page(items, total, page, limit, DeviceFaceEmbeddingOut, fields))


@devices.post("", status_code=201, summary="Liberar o aparelho com o código", description="O código vale uma vez. A resposta traz a chave desta empresa.")
def enroll_device(
    body: ClockDeviceEnroll,
    service: ClockDeviceService = Depends(get_clock_device_service),
):
    row = service.enroll(body.public_id, body.code)
    return json_data(dump_one(row, ClockDeviceEnrolledOut, None), status_code=201)


@devices.post("/face-punches", status_code=201, summary="Registrar ponto facial no aparelho", description="Compara cada empresa separada. Entra se uma só reconhecer.")
def punch_face(
    request: Request,
    body: DeviceFacePunchCreate,
    service: ClockDeviceService = Depends(get_clock_device_service),
):
    public_id, keys = device_keys(request)
    row = service.punch_face(public_id, keys, body.model_dump())
    return json_data(dump_one(row, DevicePunchOut, None), status_code=201)


@devices.post("/qr-punches", status_code=201, summary="Registrar ponto por QR Code no aparelho", description="Entra se o código apontar para uma única pessoa entre as empresas liberadas.")
def punch_qr(
    request: Request,
    body: DeviceQrPunchCreate,
    service: ClockDeviceService = Depends(get_clock_device_service),
):
    public_id, keys = device_keys(request)
    row = service.punch_qr(public_id, keys, body.model_dump())
    return json_data(dump_one(row, DevicePunchOut, None), status_code=201)


@devices.get("/{row_id}", summary="Detalhe do aparelho")
def get_device(
    row_id: int,
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_admin),
    service: ClockDeviceService = Depends(get_clock_device_service),
):
    return json_data(dump_one(service.get_device(as_scope(actor), row_id), ClockDeviceOut, fields))


@devices.put("/{row_id}", summary="Atualizar aparelho")
def update_device(
    row_id: int,
    body: ClockDeviceUpdate,
    actor: Actor = Depends(require_admin),
    service: ClockDeviceService = Depends(get_clock_device_service),
):
    body.model_dump()
    service.refuse_change(as_scope(actor), row_id)
    return json_data(None)


@devices.delete("/{row_id}", summary="Revogar aparelho", description="Derruba a chave desta empresa. As outras empresas do aparelho permanecem.")
def revoke_device(
    row_id: int,
    actor: Actor = Depends(require_admin),
    service: ClockDeviceService = Depends(get_clock_device_service),
):
    service.revoke(as_scope(actor), row_id)
    return json_data(None)


@codes.post("", status_code=201, summary="Gerar código de liberação", description="Código curto, válido por 10 minutos e de uso único.")
def issue_code(
    actor: Actor = Depends(require_admin),
    service: ClockDeviceService = Depends(get_clock_device_service),
):
    return json_data(dump_one(service.issue_code(as_scope(actor)), ClockReleaseCodeOut, None), status_code=201)
