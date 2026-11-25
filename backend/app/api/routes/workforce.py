import inspect
from datetime import date, datetime

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile

from app.api.dependencies.auth import Actor, require_tenant
from app.api.dependencies.services import get_workforce_service
from app.api.responses import json_data
from app.api.serialization import dump_one, dump_page
from app.core.exceptions import AppError
from app.core.fields import parse_fields
from app.models.workforce import (
    Category,
    CategoryValue,
    CostCenter,
    Holiday,
    Job,
    Journey,
    Norm,
    Reason,
    Team,
    Unit,
)
from app.schemas.workforce import (
    NormCreate,
    NormOut,
    NormUpdate,
    AuditOut,
    CertificatePhotoOut,
    ChargeOut,
    ChargeUpdate,
    CategoryValueCreate,
    CategoryValueOut,
    CategoryValueUpdate,
    ClosingBankCreate,
    ClosingBankSettlement,
    ClosingCreate,
    ClosingOut,
    ClosingUpdate,
    DashboardOut,
    EmployeeBulkCreate,
    EmployeeBulkOut,
    EmployeeCreate,
    FiscalFileCreate,
    FiscalFileListOut,
    FiscalFileOut,
    FiscalFileUpdate,
    FiscalImportCreate,
    FiscalImportOut,
    FiscalJobOut,
    EmployeeOut,
    EmployeeUpdate,
    HolidayCreate,
    HolidayOut,
    HolidayUpdate,
    HourBankEntryCreate,
    HourBankEntryOut,
    HourBankEntryUpdate,
    HourBankOut,
    JourneyCreate,
    JourneyOut,
    JourneyUpdate,
    NamedCreate,
    NamedOut,
    NamedUpdate,
    NoticeEmailOut,
    NoticeEmailUpdate,
    NoticeRunOut,
    NoticeOut,
    NoticePreferenceCreate,
    NoticePreferenceOut,
    NoticePreferenceUpdate,
    NoticeUpdate,
    OccurrenceCreate,
    OccurrenceOut,
    OccurrenceUpdate,
    PayrollEventCreate,
    PayrollEventOut,
    PayrollEventUpdate,
    PayrollOut,
    ReportCatalogOut,
    ReportOut,
    CalculationsOut,
    PunchCodeOut,
    QrCardOut,
    PunchCorrectionCreate,
    PunchCorrectionOut,
    PunchRestorationCreate,
    PunchCreate,
    QrPunchCreate,
    FaceEmbeddingOut,
    FacePunchCreate,
    SelfiePhotoOut,
    PunchOut,
    PunchUpdate,
    ReasonCreate,
    ReasonOut,
    ReasonUpdate,
    RequestCreate,
    RequestOut,
    RequestUpdate,
    SubscriptionCreate,
    SubscriptionOut,
    SubscriptionUpdate,
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
    "norm_id",
    "job_id",
    "journey_id",
    "cost_center_id",
    "category_id",
    "team_id",
    "manager_id",
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


def require_use(
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
) -> None:
    service.assert_usable(as_scope(actor))


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


def _filter_parameter(name: str) -> inspect.Parameter:
    if name in INT_FILTERS:
        annotation = int | None
        default = Query(default=None, ge=1)
    elif name in BOOL_FILTERS:
        annotation = bool | None
        default = Query(default=None)
    elif name in {"category_value_id", "category_ids"}:
        annotation = str | None
        default = Query(default=None, max_length=500, description="Ids separados por vírgula")
    elif name in {"name", "full_name", "q"}:
        annotation = str | None
        description = "Trecho do nome, do CPF ou da matrícula" if name == "q" else "Trecho do nome"
        default = Query(default=None, max_length=255, description=description)
    elif name == "cpf":
        annotation = str | None
        default = Query(default=None, max_length=14)
    else:
        annotation = str | None
        default = Query(default=None, max_length=64)
    return inspect.Parameter(name, inspect.Parameter.POSITIONAL_OR_KEYWORD, default=default, annotation=annotation)


def accept_filters(func, names: tuple[str, ...]):
    def wrapped(*args, **kwargs):
        for name in names:
            kwargs.pop(name, None)
        return func(*args, **kwargs)

    signature = inspect.signature(func)
    parameters = [
        item
        for item in signature.parameters.values()
        if item.kind not in {inspect.Parameter.VAR_KEYWORD, inspect.Parameter.VAR_POSITIONAL}
    ]
    extra = [_filter_parameter(name) for name in names if name not in signature.parameters]
    anchor = next(index for index, item in enumerate(parameters) if item.name in {"actor", "service"})
    parameters[anchor:anchor] = extra
    wrapped.__signature__ = signature.replace(parameters=parameters)
    wrapped.__name__ = func.__name__
    wrapped.__doc__ = func.__doc__
    wrapped.__annotations__ = dict(getattr(func, "__annotations__", {}))
    for item in extra:
        wrapped.__annotations__[item.name] = item.annotation
    return wrapped


def searchable(*names: str):
    def decorate(func):
        return accept_filters(func, names)

    return decorate


def mount_named(
    prefix: str,
    tag: str,
    model,
    create_schema,
    update_schema,
    out_schema,
    filters: tuple[str, ...],
    *,
    page_size: int = 10,
):
    router = APIRouter(prefix=prefix, tags=[tag], dependencies=[Depends(require_use)])
    slug = tag.replace("-", "_")

    def list_rows(
        request: Request,
        page: int = Query(1, ge=1),
        limit: int = Query(page_size, ge=1, le=100),
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

    list_rows = accept_filters(list_rows, filters)
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
    mount_named("/jobs", "jobs", Job, NamedCreate, NamedUpdate, NamedOut, ("name",), page_size=20),
    mount_named("/cost-centers", "cost-centers", CostCenter, NamedCreate, NamedUpdate, NamedOut, ("name",), page_size=20),
    mount_named("/categories", "categories", Category, NamedCreate, NamedUpdate, NamedOut, ("name",), page_size=20),
    mount_named(
        "/category-values",
        "category-values",
        CategoryValue,
        CategoryValueCreate,
        CategoryValueUpdate,
        CategoryValueOut,
        ("name", "category_id"),
        page_size=20,
    ),
    mount_named("/units", "units", Unit, NamedCreate, NamedUpdate, NamedOut, ("name",), page_size=20),
    mount_named("/teams", "teams", Team, TeamCreate, TeamUpdate, TeamOut, ("name", "unit_id"), page_size=20),
    mount_named("/journeys", "journeys", Journey, JourneyCreate, JourneyUpdate, JourneyOut, ("name",)),
    mount_named(
        "/norms",
        "norms",
        Norm,
        NormCreate,
        NormUpdate,
        NormOut,
        ("name", "kind", "union_name"),
        page_size=20,
    ),
    mount_named("/holidays", "holidays", Holiday, HolidayCreate, HolidayUpdate, HolidayOut, ("name",), page_size=20),
    mount_named(
        "/reasons",
        "reasons",
        Reason,
        ReasonCreate,
        ReasonUpdate,
        ReasonOut,
        ("name", "kind", "active"),
        page_size=20,
    ),
]


employees = APIRouter(prefix="/employees", tags=["employees"], dependencies=[Depends(require_use)])
vigencies = APIRouter(prefix="/employee-vigencies", tags=["employee-vigencies"], dependencies=[Depends(require_use)])
punches = APIRouter(prefix="/punches", tags=["punches"], dependencies=[Depends(require_use)])
face_embeddings = APIRouter(
    prefix="/face-embeddings", tags=["face-embeddings"], dependencies=[Depends(require_use)]
)
occurrences = APIRouter(prefix="/occurrences", tags=["occurrences"], dependencies=[Depends(require_use)])
certificate_photos = APIRouter(prefix="/certificate-photos", tags=["certificate-photos"], dependencies=[Depends(require_use)])
selfie_photos = APIRouter(prefix="/selfie-photos", tags=["selfie-photos"], dependencies=[Depends(require_use)])
requests = APIRouter(prefix="/requests", tags=["requests"], dependencies=[Depends(require_use)])
closings = APIRouter(prefix="/closings", tags=["closings"], dependencies=[Depends(require_use)])
hour_bank_entries = APIRouter(prefix="/hour-bank-entries", tags=["hour-bank-entries"], dependencies=[Depends(require_use)])
fiscal_files = APIRouter(prefix="/fiscal-files", tags=["fiscal-files"], dependencies=[Depends(require_use)])
payroll_events = APIRouter(prefix="/payroll-events", tags=["payroll-events"], dependencies=[Depends(require_use)])
notices = APIRouter(prefix="/notices", tags=["notices"])
notice_preferences = APIRouter(prefix="/notice-preferences", tags=["notice-preferences"])
notice_emails = APIRouter(prefix="/notice-emails", tags=["notice-emails"])
notice_runs = APIRouter(prefix="/notice-runs", tags=["notice-runs"], dependencies=[Depends(require_use)])
audits = APIRouter(prefix="/audits", tags=["audits"], dependencies=[Depends(require_use)])
reads = APIRouter(tags=["reads"], dependencies=[Depends(require_use)])
subscriptions = APIRouter(prefix="/subscriptions", tags=["subscriptions"])
charges = APIRouter(prefix="/charges", tags=["charges"])


@employees.get(
    "",
    summary="Listar funcionários",
    description="Filtros: q, full_name, cpf, person_id, job_id, journey_id, cost_center_id, unit_id, team_id, norm_id, manager_id, situation, category_value_id. q procura nome, CPF e matrícula. category_value_id aceita vários ids separados por vírgula.",
)
@searchable(
    "q",
    "full_name",
    "cpf",
    "person_id",
    "job_id",
    "journey_id",
    "cost_center_id",
    "unit_id",
    "team_id",
    "norm_id",
    "manager_id",
    "situation",
    "category_value_id",
)
def list_employees(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    scope = as_scope(actor)
    items, total = service.list_employees(
        scope,
        page,
        limit,
        read_filters(
            request,
            (
                "q",
                "full_name",
                "cpf",
                "person_id",
                "job_id",
                "journey_id",
                "cost_center_id",
                "unit_id",
                "team_id",
                "norm_id",
                "manager_id",
                "situation",
                "category_value_id",
            ),
        ),
    )
    requested = parse_fields(fields)
    lean = requested is not None and set(requested) <= {
        "id",
        "full_name",
        "cpf",
        "registration_number",
        "person_id",
        "clock_method",
    }
    payload = service.employees_lean(items) if lean else service.employees_out(items)
    return json_data(dump_page(payload, total, page, limit, EmployeeOut, fields))


@employees.post(
    "/changes",
    status_code=201,
    summary="Alterar funcionários em massa",
    description="Uma operação por vez: função, jornada, categoria, equipe, norma, gestor, situação ou tipo de registro. A equipe também grava a empresa. Se uma pessoa falhar, nenhuma do lote é salva.",
)
def change_employees(
    body: EmployeeBulkCreate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    result = service.change_employees(as_scope(actor), body.model_dump())
    return json_data(dump_one(result, EmployeeBulkOut, None), status_code=201)


@employees.get("/{row_id}", summary="Detalhe do funcionário")
def get_employee(
    row_id: int,
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.get_employee(as_scope(actor), row_id), EmployeeOut, fields))


@employees.post(
    "",
    status_code=201,
    summary="Criar funcionário",
    description="Grava a ficha e resolve a pessoa pelo CPF no autenticador. CPF novo exige e-mail e dispara o convite. Sem vínculo nesta organização, cria o papel member. O tipo de registro padrão é simple. O reconhecimento facial pode ser salvo sem foto de referência.",
)
def create_employee(
    body: EmployeeCreate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.create_employee(as_scope(actor), body.model_dump())
    return json_data(dump_one(row, EmployeeOut, None), status_code=201)


@employees.put(
    "/{row_id}",
    summary="Atualizar funcionário",
    description="Altera a ficha, inclusive o tipo de registro. O person_id gravado permanece. O reconhecimento facial pode ser salvo sem foto de referência.",
)
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
@searchable("employee_id", "kind")
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


@vigencies.post(
    "",
    status_code=201,
    summary="Criar vigência",
    description="Empresa e setor não são escolhidos aqui. Ao gravar a equipe, os dois acompanham o setor e a empresa dessa equipe, na mesma data.",
)
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


@punches.get(
    "",
    summary="Listar marcações",
    description="Filtros: employee_id, valid, starts_on, ends_on. starts_on e ends_on são datas (AAAA-MM-DD) do intervalo inclusivo.",
)
@searchable("employee_id", "valid", "starts_on", "ends_on")
def list_punches(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    items, total = service.list_punches(
        as_scope(actor),
        page,
        limit,
        read_filters(request, ("employee_id", "valid", "starts_on", "ends_on")),
        fields=fields,
    )
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


@punches.post("/restorations", summary="Desfazer o ajuste do dia")
def restore_punches(
    body: PunchRestorationCreate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    result = service.restore_punches(as_scope(actor), body.model_dump())
    payload = PunchCorrectionOut(
        employee_id=result["employee_id"],
        day=result["day"],
        origin="original",
        punches=[PunchOut.model_validate(item) for item in result["punches"]],
    )
    return json_data(dump_one(payload, PunchCorrectionOut, None))


@face_embeddings.get(
    "",
    summary="Baixar os rostos da organização",
    description="Página no banco. Filtro opcional updated_since (ISO) para sincronização incremental.",
)
def list_face_embeddings(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    updated_since: datetime | None = Query(default=None),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    items, total = service.list_face_embeddings(as_scope(actor), page, limit, updated_since=updated_since)
    return json_data(dump_page(items, total, page, limit, FaceEmbeddingOut, fields))


@punches.post("/qr-selfies", status_code=201, summary="Registrar marcação por QR Code e selfie")
def punch_qr(
    body: QrPunchCreate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.punch_qr(as_scope(actor), body.model_dump())
    return json_data(dump_one(row, PunchOut, None), status_code=201)


@punches.post("/faces", status_code=201, summary="Registrar marcação por reconhecimento facial")
def punch_face(
    body: FacePunchCreate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.punch_face(as_scope(actor), body.model_dump())
    return json_data(dump_one(row, PunchOut, None), status_code=201)


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


@selfie_photos.post("", status_code=201, summary="Enviar a selfie")
def upload_selfie(
    file: UploadFile = File(...),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    key = service.store_selfie(as_scope(actor), file.content_type or "", file.file.read())
    return json_data(SelfiePhotoOut(key=key).model_dump(), status_code=201)


@occurrences.get("", summary="Listar ocorrências", description="Filtros: employee_id, kind.")
@searchable("employee_id", "kind")
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
@searchable("employee_id", "kind", "status")
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


@closings.get(
    "",
    summary="Listar fechamentos",
    description="Filtros: year, month, status, employee_id. employee_id limita aos fechamentos que cobrem a pessoa (empresa inteira ou membro).",
)
@searchable("year", "month", "status", "employee_id")
def list_closings(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    items, total = service.list_closings(
        as_scope(actor), page, limit, read_filters(request, ("year", "month", "status", "employee_id"))
    )
    return json_data(dump_page(items, total, page, limit, ClosingOut, fields))


@closings.get("/candidates", summary="Pessoas que podem entrar no fechamento")
def closing_candidates(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    starts_on: date | None = None,
    ends_on: date | None = None,
    unit_id: str | None = Query(default=None, max_length=500),
    team_id: str | None = Query(default=None, max_length=500),
    job_id: str | None = Query(default=None, max_length=500),
    journey_id: str | None = Query(default=None, max_length=500),
    situation: str | None = Query(default=None, max_length=32),
    category_value_id: str | None = Query(default=None, max_length=500, description="Ids de valor de categoria separados por vírgula"),
    q: str | None = Query(default=None, max_length=120, description="Trecho do nome, do CPF ou da matrícula"),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    rows = service.closing_candidates(
        as_scope(actor),
        {
            "year": year,
            "month": month,
            "starts_on": starts_on,
            "ends_on": ends_on,
            "unit_id": unit_id,
            "team_id": team_id,
            "job_id": job_id,
            "journey_id": journey_id,
            "situation": situation,
            "category_value_id": category_value_id,
            "q": q,
        },
    )
    return json_data(rows)


@closings.get("/{row_id}", summary="Detalhe do fechamento")
def get_closing(
    row_id: int,
    fields: str | None = Query(default=None, max_length=500),
    page: int | None = Query(default=None, ge=1),
    limit: int | None = Query(default=None, ge=1, le=100),
    part: str | None = Query(default=None, pattern="^(people|banks|bank_roster|sheets)$"),
    employee_id: int | None = Query(default=None, ge=1),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(
        dump_one(
            service.get_closing(
                as_scope(actor),
                row_id,
                page=page,
                limit=limit,
                part=part,
                employee_id=employee_id,
            ),
            ClosingOut,
            fields,
        )
    )


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


@closings.post("/{row_id}/bank", summary="Lançar no banco do fechamento")
def launch_closing_bank(
    row_id: int,
    body: ClosingBankCreate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.launch_closing_bank(as_scope(actor), row_id, body.model_dump())
    return json_data(dump_one(row, ClosingOut, None))


@closings.post("/{row_id}/bank-settlement", summary="Quitar o banco de todos no fechamento")
def settle_closing_banks(
    row_id: int,
    body: ClosingBankSettlement,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.settle_closing_banks(as_scope(actor), row_id, body.model_dump())
    return json_data(dump_one(row, ClosingOut, None))


@closings.delete("/{row_id}/bank/{employee_id}", summary="Excluir lançamento do banco do fechamento")
def clear_closing_bank(
    row_id: int,
    employee_id: int,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.clear_closing_bank(as_scope(actor), row_id, employee_id)
    return json_data(dump_one(row, ClosingOut, None))


@closings.delete("/{row_id}", summary="Excluir período aberto ou cancelado")
def delete_closing(
    row_id: int,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.delete_closing(as_scope(actor), row_id)
    return json_data(None)


@notices.get("", summary="Listar notificações", description="Filtros: employee_id.")
@searchable("employee_id")
def list_notices(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    items, total = service.list_notices(as_scope(actor), page, limit, read_filters(request, ("employee_id",)))
    return json_data(dump_page(items, total, page, limit, NoticeOut, fields))


@notices.get("/unread-count", summary="Contagem de avisos não lidos da pessoa logada")
def unread_notice_count(
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data({"total": service.count_unread_notices(as_scope(actor))})


@notices.get("/{row_id}", summary="Detalhe da notificação")
def get_notice(
    row_id: int,
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.get_notice(as_scope(actor), row_id), NoticeOut, fields))


@notices.post("", status_code=201, summary="Criar notificação")
def create_notice(
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.refuse_notice_create(as_scope(actor))
    return json_data(None)


@notices.put("/{row_id}", summary="Marcar notificação")
def update_notice(
    row_id: int,
    body: NoticeUpdate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.update_notice(as_scope(actor), row_id, body.model_dump(exclude_unset=True))
    return json_data(dump_one(row, NoticeOut, None))


@notice_preferences.get("", summary="Listar preferências de aviso", description="Filtros: kind.")
@searchable("kind")
def list_notice_preferences(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    items, total = service.list_notice_preferences(
        as_scope(actor), page, limit, read_filters(request, ("kind",))
    )
    return json_data(dump_page(items, total, page, limit, NoticePreferenceOut, fields))


@notice_preferences.get("/{row_id}", summary="Detalhe da preferência de aviso")
def get_notice_preference(
    row_id: int,
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(
        dump_one(service.get_notice_preference(as_scope(actor), row_id), NoticePreferenceOut, fields)
    )


@notice_preferences.post("", status_code=201, summary="Configurar aviso")
def create_notice_preference(
    body: NoticePreferenceCreate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.create_notice_preference(as_scope(actor), body.model_dump())
    return json_data(dump_one(row, NoticePreferenceOut, None), status_code=201)


@notice_preferences.put("/{row_id}", summary="Atualizar aviso")
def update_notice_preference(
    row_id: int,
    body: NoticePreferenceUpdate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.update_notice_preference(as_scope(actor), row_id, body.model_dump(exclude_unset=True))
    return json_data(dump_one(row, NoticePreferenceOut, None))


@notice_preferences.delete("/{row_id}", summary="Restaurar aviso")
def delete_notice_preference(
    row_id: int,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.delete_notice_preference(as_scope(actor), row_id)
    return json_data(None)


@notice_emails.get("", summary="Listar e-mails de aviso", description="Filtros: kind.")
@searchable("kind")
def list_notice_emails(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    items, total = service.list_notice_emails(as_scope(actor), page, limit, read_filters(request, ("kind",)))
    return json_data(dump_page(items, total, page, limit, NoticeEmailOut, fields))


@notice_emails.get("/{row_id}", summary="Detalhe do e-mail de aviso")
def get_notice_email(
    row_id: int,
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.get_notice_email(as_scope(actor), row_id), NoticeEmailOut, fields))


@notice_emails.post("", status_code=201, summary="Criar e-mail de aviso")
def create_notice_email(
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.refuse_notice_email_write(as_scope(actor))
    return json_data(None)


@notice_emails.put("/{row_id}", summary="Atualizar e-mail de aviso")
def update_notice_email(
    row_id: int,
    body: NoticeEmailUpdate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.refuse_notice_email_write(as_scope(actor), row_id)
    return json_data(None)


@notice_emails.delete("/{row_id}", summary="Excluir e-mail de aviso")
def delete_notice_email(
    row_id: int,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.refuse_notice_email_write(as_scope(actor), row_id)
    return json_data(None)


@notice_runs.post("", status_code=201, summary="Enviar os avisos do dia")
def dispatch_notices(
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.dispatch_notices(as_scope(actor)), NoticeRunOut, None), status_code=201)


@notices.delete("/{row_id}", summary="Excluir notificação")
def delete_notice(
    row_id: int,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.delete_notice(as_scope(actor), row_id)
    return json_data(None)


@audits.get("", summary="Listar auditoria", description="Filtro: employee_id.")
@searchable("employee_id")
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


@reads.get(
    "/payroll-totals",
    summary="Totais da folha no mês",
    description="Consulta explícita. Abrir a tela de totais não chama esta rota; use só quando precisar dos números apurados.",
)
def payroll_totals(
    year: int = Query(ge=2000, le=2100),
    month: int = Query(ge=1, le=12),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.payroll(as_scope(actor), year, month), PayrollOut, None))


@payroll_events.get("", summary="Listar eventos da folha")
def list_payroll_events(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    items, total = service.list_payroll_events(
        as_scope(actor), page, limit, read_filters(request, ("system_event", "external_code", "active"))
    )
    return json_data(dump_page(items, total, page, limit, PayrollEventOut, fields))


@payroll_events.get("/{row_id}", summary="Detalhe do evento da folha")
def get_payroll_event(
    row_id: int,
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.get_payroll_event(as_scope(actor), row_id), PayrollEventOut, fields))


@payroll_events.post("", status_code=201, summary="Criar evento da folha")
def create_payroll_event(
    body: PayrollEventCreate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.create_payroll_event(as_scope(actor), body.model_dump())
    return json_data(dump_one(row, PayrollEventOut, None), status_code=201)


@payroll_events.put("/{row_id}", summary="Atualizar evento da folha")
def update_payroll_event(
    row_id: int,
    body: PayrollEventUpdate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.update_payroll_event(as_scope(actor), row_id, body.model_dump(exclude_unset=True))
    return json_data(dump_one(row, PayrollEventOut, None))


@payroll_events.delete("/{row_id}", summary="Excluir evento da folha")
def delete_payroll_event(
    row_id: int,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.delete_payroll_event(as_scope(actor), row_id)
    return json_data(None)


@reads.get("/calculations", summary="Apuração do período")
def calculations(
    employee_id: int = Query(),
    starts_on: date = Query(),
    ends_on: date = Query(),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    result = service.calculations(as_scope(actor), employee_id, starts_on, ends_on)
    return json_data(dump_one(result, CalculationsOut, None))


@reads.get("/qr-cards", summary="QR Codes para imprimir")
def list_qr_cards(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    items, total = service.list_qr_cards(as_scope(actor), page, limit)
    return json_data(dump_page(items, total, page, limit, QrCardOut, fields))


@reads.get("/punch-codes", summary="QR Code da empresa, do CPF e da matrícula")
def punch_code(
    employee_id: int = Query(),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.punch_code(as_scope(actor), employee_id), PunchCodeOut, None))


@reads.get("/report-catalog", summary="Catálogo de relatórios")
def report_catalog(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    items, total = service.report_catalog(as_scope(actor), page, limit)
    return json_data(dump_page(items, total, page, limit, ReportCatalogOut, fields))


@reads.get(
    "/reports",
    summary="Relatório analítico do período",
    description="No relatório de funcionários, starts_on é o dia e ends_on repete esse dia. Empresa, equipe, função, jornada e valor de categoria aceitam vários ids separados por vírgula. A situação aceita ativo ou desligado. Cada linha usa a vigência do dia dela. Os filtros se somam. A página escolhe pessoas antes de apurar; export=true devolve o período completo numa consulta.",
)
@searchable(
    "full_name",
    "cpf",
    "person_id",
    "cost_center_id",
    "manager_id",
    "situation",
    "category_value_id",
)
def reports(
    request: Request,
    kind: str = Query(min_length=1, max_length=32),
    starts_on: date = Query(),
    ends_on: date = Query(),
    employee_id: int | None = Query(default=None),
    unit_id: str | None = Query(default=None, max_length=500, description="Ids de empresa separados por vírgula"),
    team_id: str | None = Query(default=None, max_length=500, description="Ids de equipe separados por vírgula"),
    job_id: str | None = Query(default=None, max_length=500, description="Ids de função separados por vírgula"),
    journey_id: str | None = Query(default=None, max_length=500, description="Ids de jornada separados por vírgula"),
    norm_id: str | None = Query(default=None, max_length=500, description="Ids de norma separados por vírgula"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    export: bool = Query(default=False, description="Gera o relatório completo numa consulta"),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    filters = read_filters(
        request,
        (
            "full_name",
            "cpf",
            "person_id",
            "cost_center_id",
            "manager_id",
            "situation",
            "category_value_id",
        ),
    )
    for name, value in (
        ("unit_id", unit_id),
        ("team_id", team_id),
        ("job_id", job_id),
        ("journey_id", journey_id),
        ("norm_id", norm_id),
    ):
        if value:
            filters[name] = value
    result = service.report(
        as_scope(actor), kind, starts_on, ends_on, employee_id, page, limit, filters, export=export
    )
    return json_data(dump_one(result, ReportOut, None))


@reads.get("/hour-bank", summary="Saldo do banco de horas")
def hour_bank(
    employee_id: int = Query(),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.hour_bank(as_scope(actor), employee_id), HourBankOut, None))


@fiscal_files.get("", summary="Listar arquivos fiscais", description="Filtros: kind, valid.")
@searchable("kind", "valid")
def list_fiscal_files(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    items, total = service.list_fiscal_files(as_scope(actor), page, limit, read_filters(request, ("kind", "valid")))
    return json_data(dump_page(items, total, page, limit, FiscalFileListOut, fields))


@fiscal_files.post("/imports", status_code=201, summary="Importar marcações do AFD")
def import_afd(
    body: FiscalImportCreate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    result = service.import_afd(as_scope(actor), body.content)
    return json_data(dump_one(result, FiscalImportOut, None), status_code=201)


@fiscal_files.get("/jobs/{job_id}", summary="Status da geração fiscal")
def get_fiscal_job(
    job_id: int,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.get_fiscal_job(as_scope(actor), job_id), FiscalJobOut, None))


@fiscal_files.get("/{row_id}", summary="Detalhe do arquivo fiscal")
def get_fiscal_file(
    row_id: int,
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.get_fiscal_file(as_scope(actor), row_id), FiscalFileOut, fields))


@fiscal_files.post(
    "",
    status_code=202,
    summary="Enfileirar geração fiscal",
    description="Aceita o pedido e processa em segundo plano. Consulte GET /fiscal-files/jobs/{id} e baixe o arquivo quando status=done. Teto de dias: FISCAL_MAX_DAYS.",
)
def create_fiscal_file(
    body: FiscalFileCreate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.enqueue_fiscal_file(as_scope(actor), body.model_dump())
    return json_data(dump_one(row, FiscalJobOut, None), status_code=202)


@fiscal_files.put("/{row_id}", summary="Atualizar arquivo fiscal")
def update_fiscal_file(
    row_id: int,
    body: FiscalFileUpdate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.refuse_fiscal_file_change(as_scope(actor), row_id)
    return json_data(None)


@fiscal_files.delete("/{row_id}", summary="Excluir arquivo fiscal")
def delete_fiscal_file(
    row_id: int,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.refuse_fiscal_file_change(as_scope(actor), row_id)
    return json_data(None)


@hour_bank_entries.get("", summary="Listar lançamentos do banco", description="Filtros: employee_id, kind.")
@searchable("employee_id", "kind")
def list_hour_bank_entries(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    items, total = service.list_hour_bank_entries(
        as_scope(actor), page, limit, read_filters(request, ("employee_id", "kind"))
    )
    return json_data(dump_page(items, total, page, limit, HourBankEntryOut, fields))


@hour_bank_entries.get("/{row_id}", summary="Detalhe do lançamento do banco")
def get_hour_bank_entry(
    row_id: int,
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.get_hour_bank_entry(as_scope(actor), row_id), HourBankEntryOut, fields))


@hour_bank_entries.post("", status_code=201, summary="Lançar no banco de horas")
def create_hour_bank_entry(
    body: HourBankEntryCreate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.create_hour_bank_entry(as_scope(actor), body.model_dump())
    return json_data(dump_one(row, HourBankEntryOut, None), status_code=201)


@hour_bank_entries.put("/{row_id}", summary="Atualizar lançamento do banco")
def update_hour_bank_entry(
    row_id: int,
    body: HourBankEntryUpdate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.update_hour_bank_entry(as_scope(actor), row_id, body.model_dump())
    return json_data(dump_one(row, HourBankEntryOut, None))


@hour_bank_entries.delete("/{row_id}", summary="Excluir lançamento do banco")
def delete_hour_bank_entry(
    row_id: int,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.delete_hour_bank_entry(as_scope(actor), row_id)
    return json_data(None)


@subscriptions.get("", summary="Listar assinatura", description="Filtros: status.")
@searchable("status")
def list_subscriptions(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    items, total = service.list_subscriptions(as_scope(actor), page, limit, read_filters(request, ("status",)))
    return json_data(dump_page(items, total, page, limit, SubscriptionOut, fields))


@subscriptions.get("/{row_id}", summary="Detalhe da assinatura")
def get_subscription(
    row_id: int,
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.get_subscription(as_scope(actor), row_id), SubscriptionOut, fields))


@subscriptions.post("", status_code=201, summary="Contratar plano")
def create_subscription(
    body: SubscriptionCreate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.create_subscription(as_scope(actor), body.model_dump())
    return json_data(dump_one(row, SubscriptionOut, None), status_code=201)


@subscriptions.put("/{row_id}", summary="Alterar plano")
def update_subscription(
    row_id: int,
    body: SubscriptionUpdate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.update_subscription(as_scope(actor), row_id, body.model_dump(exclude_unset=True))
    return json_data(dump_one(row, SubscriptionOut, None))


@subscriptions.delete("/{row_id}", summary="Excluir assinatura")
def delete_subscription(
    row_id: int,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.refuse_subscription_delete(as_scope(actor), row_id)
    return json_data(None)


@charges.get("", summary="Listar cobranças", description="Filtros: status, kind.")
@searchable("status", "kind")
def list_charges(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    items, total = service.list_charges(as_scope(actor), page, limit, read_filters(request, ("status", "kind")))
    return json_data(dump_page(items, total, page, limit, ChargeOut, fields))


@charges.get("/{row_id}", summary="Detalhe da cobrança")
def get_charge(
    row_id: int,
    fields: str | None = Query(default=None, max_length=500),
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    return json_data(dump_one(service.get_charge(as_scope(actor), row_id), ChargeOut, fields))


@charges.post("", status_code=201, summary="Criar cobrança")
def create_charge(
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.refuse_charge_create(as_scope(actor))
    return json_data(None)


@charges.put("/{row_id}", summary="Pagar cobrança")
def pay_charge(
    row_id: int,
    body: ChargeUpdate,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    row = service.pay_charge(as_scope(actor), row_id, body.model_dump(exclude_unset=True))
    return json_data(dump_one(row, ChargeOut, None))


@charges.delete("/{row_id}", summary="Excluir cobrança")
def delete_charge(
    row_id: int,
    actor: Actor = Depends(require_tenant),
    service: WorkforceService = Depends(get_workforce_service),
):
    service.refuse_charge_delete(as_scope(actor), row_id)
    return json_data(None)


routers.extend(
    [
        employees,
        vigencies,
        punches,
        face_embeddings,
        occurrences,
        certificate_photos,
        selfie_photos,
        requests,
        closings,
        hour_bank_entries,
        fiscal_files,
        payroll_events,
        notices,
        notice_preferences,
        notice_emails,
        notice_runs,
        subscriptions,
        charges,
        audits,
        reads,
    ]
)
