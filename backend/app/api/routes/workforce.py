from datetime import date

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile

from app.api.dependencies.auth import Actor, require_tenant
from app.api.dependencies.services import get_workforce_service
from app.api.responses import json_data
from app.api.serialization import dump_one, dump_page
from app.core.exceptions import AppError
from app.models.workforce import (
    CostCenter,
    Holiday,
    Job,
    Journey,
    LaborAgreement,
    LaborUnion,
    PunchRule,
    Reason,
    Sector,
    Team,
    Unit,
)
from app.schemas.workforce import (
    AgreementCreate,
    AgreementOut,
    AgreementUpdate,
    AuditOut,
    CertificatePhotoOut,
    ClosingCreate,
    ClosingOut,
    ClosingUpdate,
    DashboardOut,
    EmployeeCreate,
    EmployeeOut,
    EmployeeUpdate,
    HolidayCreate,
    HolidayOut,
    HolidayUpdate,
    JourneyCreate,
    JourneyOut,
    JourneyUpdate,
    NamedCreate,
    NamedOut,
    NamedUpdate,
    NotificationOut,
    NotificationUpdate,
    OccurrenceCreate,
    OccurrenceOut,
    OccurrenceUpdate,
    PayrollOut,
    TimeResultsOut,
    PunchCorrectionCreate,
    PunchCorrectionOut,
    PunchCreate,
    PunchOut,
    PunchRuleCreate,
    PunchRuleOut,
    PunchRuleUpdate,
    PunchUpdate,
    ReasonCreate,
    ReasonOut,
    ReasonUpdate,
    RequestCreate,
    RequestOut,
    RequestUpdate,
    SectorCreate,
    SectorOut,
    SectorUpdate,
    TeamCreate,
    TeamOut,
    TeamUpdate,
    VigencyCreate,
    VigencyOut,
    VigencyUpdate,
)
from app.services.workforce_service import Scope, WorkforceService

INT_FILTERS = {
    "unit_id",
    "sector_id",
    "union_id",
    "employee_id",
    "person_id",
    "year",
    "month",
    "reason_id",
}
BOOL_FILTERS = {"active", "valid"}


def as_scope(actor: Actor) -> Scope:
    if actor.tenant_id is None or actor.role is None:
        raise AppError(403, "Sem permissão")
    return Scope(person_id=actor.person_id, tenant_id=actor.tenant_id, role=actor.role)


def read_filters(request: Request, names: tuple[str, ...]) -> dict:
    found = {}
    for name in names:
        raw = request.query_params.get(name)
        if raw is None or raw == "":
            continue
        if name in INT_FILTERS:
            if not raw.isdigit():
                raise AppError(400, "Filtro inválido")
            found[name] = int(raw)
        elif name in BOOL_FILTERS:
            if raw not in {"true", "false"}:
                raise AppError(400, "Filtro inválido")
            found[name] = raw == "true"
        else:
            found[name] = raw.strip()
    return found


def mount_named(prefix: str, tag: str, model, create_schema, update_schema, out_schema, filters: tuple[str, ...]):
    router = APIRouter(prefix=prefix, tags=[tag])
    slug = tag.replace("-", "_")

    def list_rows(
        request: Request,
        page: int = Query(1, ge=1),
        limit: int = Query(10, ge=1, le=100),
        fields: str | None = Query(default=None, max_length=500),
        actor: Actor = Depends(require_tenant),
        service: WorkforceService = Depends(get_workforce_service),
    ):
        items, total = service.list_named(model, as_scope(actor), page, limit, read_filters(request, filters))
        return json_data(dump_page(items, total, page, limit, out_schema, fields))

    def get_row(
        row_id: int,
        fields: str | None = Query(default=None, max_length=500),
        actor: Actor = Depends(require_tenant),
        service: WorkforceService = Depends(get_workforce_service),
    ):
        row = service.get_named(model, as_scope(actor), row_id)
        return json_data(dump_one(row, out_schema, fields))

    def create_row(
        body: create_schema,
        actor: Actor = Depends(require_tenant),
        service: WorkforceService = Depends(get_workforce_service),
    ):
        row = service.create_named(model, as_scope(actor), body.model_dump())
        return json_data(dump_one(row, out_schema, None), status_code=201)

    def update_row(
        row_id: int,
        body: update_schema,
        actor: Actor = Depends(require_tenant),
        service: WorkforceService = Depends(get_workforce_service),
    ):
        row = service.update_named(model, as_scope(actor), row_id, body.model_dump(exclude_unset=True))
        return json_data(dump_one(row, out_schema, None))

    def delete_row(
        row_id: int,
        actor: Actor = Depends(require_tenant),
        service: WorkforceService = Depends(get_workforce_service),
    ):
        service.delete_named(model, as_scope(actor), row_id)
        return json_data(None)

    list_rows.__name__ = f"list_{slug}"
    get_row.__name__ = f"get_{slug}"
    create_row.__name__ = f"create_{slug}"
    update_row.__name__ = f"update_{slug}"
    delete_row.__name__ = f"delete_{slug}"
    router.get("", summary=f"Listar {tag}", description="Lista paginada. Filtros: " + ", ".join(filters))(list_rows)
    router.get("/{row_id}", summary=f"Detalhe de {tag}")(get_row)
    router.post("", status_code=201, summary=f"Criar {tag}")(create_row)
    router.put("/{row_id}", summary=f"Atualizar {tag}")(update_row)
    router.delete("/{row_id}", summary=f"Excluir {tag}")(delete_row)
    return router


routers = [
    mount_named("/jobs", "jobs", Job, NamedCreate, NamedUpdate, NamedOut, ("name",)),
    mount_named("/cost-centers", "cost-centers", CostCenter, NamedCreate, NamedUpdate, NamedOut, ("name",)),
    mount_named("/units", "units", Unit, NamedCreate, NamedUpdate, NamedOut, ("name",)),
    mount_named("/sectors", "sectors", Sector, SectorCreate, SectorUpdate, SectorOut, ("name", "unit_id")),
    mount_named("/teams", "teams", Team, TeamCreate, TeamUpdate, TeamOut, ("name", "sector_id")),
    mount_named("/journeys", "journeys", Journey, JourneyCreate, JourneyUpdate, JourneyOut, ("name",)),
    mount_named("/unions", "unions", LaborUnion, NamedCreate, NamedUpdate, NamedOut, ("name",)),
    mount_named(
        "/labor-agreements",
        "labor-agreements",
        LaborAgreement,
        AgreementCreate,
        AgreementUpdate,
        AgreementOut,
        ("name", "union_id"),
    ),
    mount_named("/holidays", "holidays", Holiday, HolidayCreate, HolidayUpdate, HolidayOut, ("name",)),
    mount_named("/punch-rules", "punch-rules", PunchRule, PunchRuleCreate, PunchRuleUpdate, PunchRuleOut, ("name",)),
    mount_named("/reasons", "reasons", Reason, ReasonCreate, ReasonUpdate, ReasonOut, ("name", "kind", "active")),
]


employees = APIRouter(prefix="/employees", tags=["employees"])
vigencies = APIRouter(prefix="/employee-vigencies", tags=["employee-vigencies"])
punches = APIRouter(prefix="/punches", tags=["punches"])
occurrences = APIRouter(prefix="/occurrences", tags=["occurrences"])
certificate_photos = APIRouter(prefix="/certificate-photos", tags=["certificate-photos"])
requests = APIRouter(prefix="/requests", tags=["requests"])
closings = APIRouter(prefix="/closings", tags=["closings"])
notifications = APIRouter(prefix="/notifications", tags=["notifications"])
audits = APIRouter(prefix="/audits", tags=["audits"])
reads = APIRouter(tags=["reads"])


@employees.get("", summary="Listar funcionários", description="Filtros: cpf, person_id.")
def list_employees(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    scope = as_scope(actor)
    items, total = service.list_employees(scope, page, limit, read_filters(request, ("cpf", "person_id")))
    return json_data(dump_page(service.employees_out(items), total, page, limit, EmployeeOut, fields))


@employees.get("/{row_id}", summary="Detalhe do funcionário")
def get_employee(
    row_id: int,
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.get_employee(as_scope(actor), row_id), EmployeeOut, fields))


@employees.post("", status_code=201, summary="Criar funcionário")
def create_employee(
    body: EmployeeCreate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.create_employee(as_scope(actor), body.model_dump())
    return json_data(dump_one(row, EmployeeOut, None), status_code=201)


@employees.put("/{row_id}", summary="Atualizar funcionário")
def update_employee(
    row_id: int,
    body: EmployeeUpdate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.update_employee(as_scope(actor), row_id, body.model_dump(exclude_unset=True))
    return json_data(dump_one(row, EmployeeOut, None))


@employees.delete("/{row_id}", summary="Excluir funcionário")
def delete_employee(
    row_id: int,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.delete_employee(as_scope(actor), row_id)
    return json_data(None)


@vigencies.get("", summary="Listar vigências", description="Filtros: employee_id, kind.")
def list_vigencies(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    items, total = service.list_vigencies(
        as_scope(actor), page, limit, read_filters(request, ("employee_id", "kind"))
    )
    return json_data(dump_page(items, total, page, limit, VigencyOut, fields))


@vigencies.get("/{row_id}", summary="Detalhe da vigência")
def get_vigency(
    row_id: int,
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.get_vigency(as_scope(actor), row_id), VigencyOut, fields))


@vigencies.post("", status_code=201, summary="Criar vigência")
def create_vigency(
    body: VigencyCreate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.create_vigency(as_scope(actor), body.model_dump())
    return json_data(dump_one(row, VigencyOut, None), status_code=201)


@vigencies.put("/{row_id}", summary="Atualizar observação da vigência")
def update_vigency(
    row_id: int,
    body: VigencyUpdate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.update_vigency(as_scope(actor), row_id, body.model_dump(exclude_unset=True))
    return json_data(dump_one(row, VigencyOut, None))


@vigencies.delete("/{row_id}", summary="Excluir vigência")
def delete_vigency(
    row_id: int,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.delete_vigency(as_scope(actor), row_id)
    return json_data(None)


@punches.get("", summary="Listar marcações", description="Filtros: employee_id, valid.")
def list_punches(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    items, total = service.list_punches(as_scope(actor), page, limit, read_filters(request, ("employee_id", "valid")))
    return json_data(dump_page(items, total, page, limit, PunchOut, fields))


@punches.get("/{row_id}", summary="Detalhe da marcação")
def get_punch(
    row_id: int,
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.get_punch(as_scope(actor), row_id), PunchOut, fields))


@punches.post("", status_code=201, summary="Registrar marcação")
def create_punch(
    body: PunchCreate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.create_punch(as_scope(actor), body.model_dump())
    return json_data(dump_one(row, PunchOut, None), status_code=201)


@punches.post("/corrections", status_code=201, summary="Corrigir as marcações do dia")
def correct_punches(
    body: PunchCorrectionCreate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    result = service.correct_punches(as_scope(actor), body.model_dump())
    payload = PunchCorrectionOut(
        employee_id=result["employee_id"],
        day=result["day"],
        origin=result["origin"],
        punches=[PunchOut.model_validate(item) for item in result["punches"]],
    )
    return json_data(dump_one(payload, PunchCorrectionOut, None), status_code=201)


@punches.put("/{row_id}", summary="Atualizar marcação")
def update_punch(
    row_id: int,
    body: PunchUpdate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.refuse_punch_change(as_scope(actor), row_id)
    return json_data(None)


@punches.delete("/{row_id}", summary="Excluir marcação")
def delete_punch(
    row_id: int,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.refuse_punch_change(as_scope(actor), row_id)
    return json_data(None)


@certificate_photos.post("", status_code=201, summary="Enviar a foto do atestado")
def upload_certificate_photo(
    file: UploadFile = File(...),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    key = service.store_certificate_photo(as_scope(actor), file.content_type or "", file.file.read())
    return json_data(CertificatePhotoOut(key=key).model_dump(), status_code=201)


@occurrences.get("", summary="Listar ocorrências", description="Filtros: employee_id, kind.")
def list_occurrences(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    items, total = service.list_occurrences(
        as_scope(actor), page, limit, read_filters(request, ("employee_id", "kind"))
    )
    return json_data(dump_page(items, total, page, limit, OccurrenceOut, fields))


@occurrences.get("/{row_id}", summary="Detalhe da ocorrência")
def get_occurrence(
    row_id: int,
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.get_occurrence(as_scope(actor), row_id), OccurrenceOut, fields))


@occurrences.post("", status_code=201, summary="Criar ocorrência")
def create_occurrence(
    body: OccurrenceCreate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.create_occurrence(as_scope(actor), body.model_dump())
    return json_data(dump_one(row, OccurrenceOut, None), status_code=201)


@occurrences.put("/{row_id}", summary="Atualizar observação da ocorrência")
def update_occurrence(
    row_id: int,
    body: OccurrenceUpdate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.update_occurrence(as_scope(actor), row_id, body.model_dump(exclude_unset=True))
    return json_data(dump_one(row, OccurrenceOut, None))


@occurrences.delete("/{row_id}", summary="Excluir ocorrência")
def delete_occurrence(
    row_id: int,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.delete_occurrence(as_scope(actor), row_id)
    return json_data(None)


@requests.get("", summary="Listar solicitações", description="Filtros: employee_id, kind, status.")
def list_requests(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    items, total = service.list_requests(
        as_scope(actor), page, limit, read_filters(request, ("employee_id", "kind", "status"))
    )
    return json_data(dump_page(items, total, page, limit, RequestOut, fields))


@requests.get("/{row_id}", summary="Detalhe da solicitação")
def get_request(
    row_id: int,
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.get_request(as_scope(actor), row_id), RequestOut, fields))


@requests.post("", status_code=201, summary="Criar solicitação")
def create_request(
    body: RequestCreate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.create_request(as_scope(actor), body.model_dump())
    return json_data(dump_one(row, RequestOut, None), status_code=201)


@requests.put("/{row_id}", summary="Decidir ou cancelar solicitação")
def decide_request(
    row_id: int,
    body: RequestUpdate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.decide_request(as_scope(actor), row_id, body.model_dump())
    return json_data(dump_one(row, RequestOut, None))


@requests.delete("/{row_id}", summary="Excluir solicitação")
def delete_request(
    row_id: int,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.get_request(as_scope(actor), row_id)
    raise AppError(409, "A solicitação permanece no histórico.")


@closings.get("", summary="Listar fechamentos", description="Filtros: year, month, status.")
def list_closings(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    items, total = service.list_closings(
        as_scope(actor), page, limit, read_filters(request, ("year", "month", "status"))
    )
    return json_data(dump_page(items, total, page, limit, ClosingOut, fields))


@closings.get("/{row_id}", summary="Detalhe do fechamento")
def get_closing(
    row_id: int,
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.get_closing(as_scope(actor), row_id), ClosingOut, fields))


@closings.post("", status_code=201, summary="Abrir período")
def create_closing(
    body: ClosingCreate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.create_closing(as_scope(actor), body.model_dump())
    return json_data(dump_one(row, ClosingOut, None), status_code=201)


@closings.put("/{row_id}", summary="Fechar período")
def update_closing(
    row_id: int,
    body: ClosingUpdate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.update_closing(as_scope(actor), row_id, body.model_dump(exclude_unset=True))
    return json_data(dump_one(row, ClosingOut, None))


@closings.delete("/{row_id}", summary="Excluir período em aberto")
def delete_closing(
    row_id: int,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.delete_closing(as_scope(actor), row_id)
    return json_data(None)


@notifications.get("", summary="Listar notificações")
def list_notifications(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    items, total = service.list_notifications(as_scope(actor), page, limit, read_filters(request, ("employee_id",)))
    return json_data(dump_page(items, total, page, limit, NotificationOut, fields))


@notifications.get("/{row_id}", summary="Detalhe da notificação")
def get_notification(
    row_id: int,
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.get_notification(as_scope(actor), row_id), NotificationOut, fields))


@notifications.post("", status_code=201, summary="Criar notificação")
def create_notification(
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.refuse_notification_create(as_scope(actor))
    return json_data(None)


@notifications.put("/{row_id}", summary="Marcar notificação")
def update_notification(
    row_id: int,
    body: NotificationUpdate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.update_notification(as_scope(actor), row_id, body.model_dump(exclude_unset=True))
    return json_data(dump_one(row, NotificationOut, None))


@notifications.delete("/{row_id}", summary="Excluir notificação")
def delete_notification(
    row_id: int,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.delete_notification(as_scope(actor), row_id)
    return json_data(None)


@audits.get("", summary="Listar auditoria", description="Filtro: employee_id.")
def list_audits(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    items, total = service.list_audits(as_scope(actor), page, limit, read_filters(request, ("employee_id",)))
    return json_data(dump_page(items, total, page, limit, AuditOut, fields))


@audits.get("/{row_id}", summary="Detalhe da auditoria")
def get_audit(
    row_id: int,
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.get_audit(as_scope(actor), row_id), AuditOut, fields))


@audits.post("", summary="Criar auditoria")
def create_audit(
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.refuse_audit_write(as_scope(actor))
    return json_data(None)


@audits.put("/{row_id}", summary="Atualizar auditoria")
def update_audit(
    row_id: int,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.get_audit(as_scope(actor), row_id)
    service.refuse_audit_write(as_scope(actor))
    return json_data(None)


@audits.delete("/{row_id}", summary="Excluir auditoria")
def delete_audit(
    row_id: int,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.get_audit(as_scope(actor), row_id)
    service.refuse_audit_write(as_scope(actor))
    return json_data(None)


@reads.get("/dashboard", summary="Painel operacional")
def dashboard(
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.dashboard(as_scope(actor)), DashboardOut, None))


@reads.get("/payroll-totals", summary="Totais de marcações do período")
def payroll_totals(
    year: int = Query(ge=2000, le=2100),
    month: int = Query(ge=1, le=12),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.payroll(as_scope(actor), year, month), PayrollOut, None))


@reads.get("/time-results", summary="Apuração do período")
def time_results(
    employee_id: int = Query(),
    starts_on: date = Query(),
    ends_on: date = Query(),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    result = service.time_results(as_scope(actor), employee_id, starts_on, ends_on)
    return json_data(dump_one(result, TimeResultsOut, None))


routers.extend(
    [employees, vigencies, punches, occurrences, certificate_photos, requests, closings, notifications, audits, reads]
)
