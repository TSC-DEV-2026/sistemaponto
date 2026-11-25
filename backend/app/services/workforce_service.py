import logging
import threading
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from time import monotonic
from types import SimpleNamespace

from app.core.billing import MAX_CAPACITY, MIN_CAPACITY, PRICE_CENTS, monthly_amount, prorate
from app.core.config import settings
from app.core.cpf import normalize_cpf
from app.core.duration import show_duration
from app.core.fiscal_file import (
    AejAbsence,
    AejEmployee,
    AejPunch,
    AfdPunch,
    employer_from,
    parse_afd,
    payroll_lines,
    pending,
    render_aej,
    render_afd,
    render_payroll,
)
from app.core.payroll_events import PAYROLL_SYSTEM_EVENTS
from app.core.hour_bank import add_months, balance_minutes_by_day, project_balance
from app.core.journey_plan import (
    ORIGIN,
    DaySpec,
    JourneySpec,
    SpanSpec,
    clocks_of,
    day_view,
    legacy_days,
    legacy_spec,
    nearest_minute,
    parse_days,
    parse_duration,
    same_content,
    schedule_of,
    week_monday,
)
from app.core.time_result import settle_day
from app.core.exceptions import AppError
from app.core.face_match import COSINE_THRESHOLD, MODEL_NAME, MODEL_VERSION, best_match, match_one, unit
from app.core.fields import parse_fields
from app.core.images import decode_image
from app.core.notices import CHANNELS, PHRASES, notice_channels
from app.core.punch_code import read_code, render_code
from app.core.reports import (
    CLOSING_STATUS,
    ENTRY_TITLES,
    OCCURRENCE_TITLES,
    REPORT_NAMES,
    REPORTS,
    REQUEST_STATUS,
    REQUEST_TITLES,
)
from app.core.workforce import (
    ADJUSTMENT_SOURCES,
    AUDIT_ACTION,
    BR,
    CERTIFICATE_CONFLICT,
    COST_CENTER_CLASSIFICATION,
    MANUAL_OCCURRENCE_KINDS,
    OCCURRENCE_FOR_REQUEST,
    NORM_KINDS,
    REASON_FOR_OCCURRENCE,
    REASON_FOR_REQUEST,
    REASON_KINDS,
    occurrence_kind,
    STATUS_LABELS,
    assert_aware,
    assert_clock,
    assert_not_future,
    assert_period,
    day_bounds,
    now_utc,
    previous_end,
    today_in_brazil,
)
from app.models.membership import Membership
from app.models.workforce import (
    Audit,
    Charge,
    Category,
    CategoryValue,
    Closing,
    ClosingEvent,
    ClosingMember,
    ClosingJourneyPin,
    CostCenter,
    Employee,
    EmployeeVigency,
    FaceEmbedding,
    FiscalFile,
    FiscalJob,
    Holiday,
    PayrollEvent,
    HourBankEntry,
    NoticeEmail,
    NoticePreference,
    Job,
    Journey,
    JourneyDay,
    JourneySpan,
    JourneyVersion,
    Norm,
    Notice,
    Occurrence,
    Punch,
    Reason,
    RequestEvent,
    RequestPunch,
    Subscription,
    Team,
    TimeRequest,
    Unit,
)
from app.repositories.workforce_repository import WorkforceRepository, employee_search_matches
from app.services.authenticator_client import AuthenticatorClient
from app.services.face_embedder import embed_image
from app.services.storage_service import StorageService

logger = logging.getLogger("sistemaponto.workforce")

_FACE_REGISTRY_SECONDS = 60.0
_face_registries: dict[int, tuple[float, list[tuple[int, list[float]]]]] = {}


def clear_face_registry_cache() -> None:
    _face_registries.clear()


UNIQUE_MODELS = {
    Job,
    CostCenter,
    Category,
    CategoryValue,
    Unit,
    Team,
    Journey,
    Norm,
    Reason,
}
_KEEP_VIGENCY = {
    "job": "Mantenha ao menos uma função.",
    "journey": "Mantenha ao menos uma jornada.",
    "team": "Mantenha ao menos uma equipe.",
    "norm": "Mantenha ao menos uma norma.",
    "status": "Mantenha ao menos uma situação.",
    "manager": "Mantenha ao menos um gestor.",
    "category": "Mantenha ao menos um valor nesta categoria.",
}
REF_MODELS = {
    "job": Job,
    "journey": Journey,
    "cost_center": CostCenter,
    "unit": Unit,
    "team": Team,
    "norm": Norm,
    "manager": Employee,
}
BULK_KINDS = (
    "job",
    "journey",
    "cost_center",
    "category",
    "team",
    "norm",
    "manager",
    "status",
    "clock_method",
)
VIGENCY_QUERY = {
    "job_id": "job",
    "journey_id": "journey",
    "unit_id": "unit",
    "team_id": "team",
    "norm_id": "norm",
    "manager_id": "manager",
}
KIND_FIELD = {
    "status": "situation",
    "job": "job_label",
    "journey": "journey_label",
    "unit": "unit_label",
    "team": "team_label",
    "norm": "norm_label",
    "manager": "manager_label",
}


@dataclass
class Scope:
    person_id: int
    tenant_id: int
    role: str


class _CalcScratch:
    def __init__(self) -> None:
        self.versions: dict[tuple[int, int], list] = {}
        self.version_rows: dict[tuple[int, int], object | None] = {}
        self.specs: dict[int, object] = {}
        self.pins: dict[tuple[int, int], list] = {}
        self.closed: list | None = None
        self.closed_tenant: int | None = None
        self.holidays: dict[tuple[int, date, date], set[date]] = {}


class WorkforceService:
    def __init__(
        self,
        repo: WorkforceRepository,
        *,
        authenticator: AuthenticatorClient | None = None,
        today=today_in_brazil,
        clock=now_utc,
        embedder=None,
        files: StorageService | None = None,
        inline_jobs: bool | None = None,
    ) -> None:
        self.repo = repo
        self.authenticator = authenticator
        self.today = today
        self.clock = clock
        self.embedder = embedder or embed_image
        self.files = files or StorageService()
        self._scratch: _CalcScratch | None = None
        self.inline_jobs = settings.FISCAL_JOBS_INLINE if inline_jobs is None else inline_jobs

    def _scratch_scope(self):
        outer = self._scratch
        self._scratch = _CalcScratch()
        return outer

    def _end_scratch(self, outer: _CalcScratch | None) -> None:
        self._scratch = outer

    def list_named(self, model, scope: Scope, page: int, limit: int, equals: dict):
        self._known(scope)
        if model is CostCenter:
            return self._list_cost_centers(scope, page, limit, equals)
        rows, total = self.repo.list_rows(model, scope.tenant_id, page=page, limit=limit, equals=equals, descending=False)
        if model is Journey:
            rows = self._present_journeys(scope, rows)
        return rows, total

    def get_named(self, model, scope: Scope, row_id: int):
        self._known(scope)
        if model is CostCenter:
            return self._cost_center_value(scope, row_id)
        row = self._row(model, scope, row_id)
        if model is Journey:
            return self._present_journey(scope, row)
        return row

    def create_named(self, model, scope: Scope, data: dict):
        self._staff(scope)
        if model is CostCenter:
            return self._create_cost_center_value(scope, data)
        if model is Journey:
            return self._create_journey(scope, data)
        payload = self._prepare_named(model, scope, data, current=None)
        self._unique_name(model, scope.tenant_id, payload, exclude_id=None)
        return self.repo.add(model(tenant_id=scope.tenant_id, **payload))

    def update_named(self, model, scope: Scope, row_id: int, data: dict):
        self._staff(scope)
        if model is CostCenter:
            return self._rename_cost_center_value(scope, row_id, data)
        if model is Journey:
            return self._update_journey(scope, row_id, data)
        row = self._row(model, scope, row_id)
        payload = self._prepare_named(model, scope, data, current=row)
        if "name" in payload or "unit_id" in payload or "kind" in payload:
            merged = {
                "name": payload.get("name", row.name),
                "unit_id": payload.get("unit_id", getattr(row, "unit_id", None)),
                "kind": payload.get("kind", getattr(row, "kind", None)),
                "category_id": payload.get("category_id", getattr(row, "category_id", None)),
            }
            self._unique_name(model, scope.tenant_id, merged, exclude_id=row.id)
        for key, value in payload.items():
            setattr(row, key, value)
        return self.repo.add(row)

    def delete_named(self, model, scope: Scope, row_id: int) -> None:
        self._staff(scope)
        if model is CostCenter:
            self._delete_cost_center_value(scope, row_id)
            return
        row = self._row(model, scope, row_id)
        if model is Category:
            self._delete_category(scope, row)
            return
        if model is CategoryValue:
            self._guard_category_value(row)
            self.repo.delete(row)
            return
        self._guard_catalog(model, row)
        if model is Journey:
            self._purge_journey(scope, row)
        self.repo.delete(row)

    def list_employees(self, scope: Scope, page: int, limit: int, equals: dict):
        self._known(scope)
        filters = dict(equals)
        if "cpf" in filters:
            filters["cpf"] = normalize_cpf(str(filters["cpf"]))
        if "full_name" in filters:
            name = str(filters["full_name"]).strip()
            if name:
                filters["full_name"] = name
            else:
                filters.pop("full_name")
        search = str(filters.pop("q", "") or "").strip() or None
        ids = self._visible_ids(scope)
        matched = self._vigency_matches(scope, filters)
        if matched is not None:
            ids = list(matched) if ids is None else [item for item in ids if item in matched]
        if "person_id" in filters and ids is not None:
            own = self.repo.list_employees(
                scope.tenant_id, ids=None, page=1, limit=1, equals={"person_id": filters["person_id"]}
            )[0]
            if not own or own[0].id not in ids:
                return [], 0
        return self.repo.list_employees(scope.tenant_id, ids=ids, page=page, limit=limit, equals=filters, search=search)

    def _vigency_matches(self, scope: Scope, filters: dict, day: date | None = None) -> set[int] | None:
        day = day or self.today()
        matched: set[int] | None = None
        raw_values = filters.pop("category_value_id", None)
        filters.pop("category_id", None)
        if "union_id" in filters and "norm_id" not in filters:
            filters["norm_id"] = filters.pop("union_id")
        else:
            filters.pop("union_id", None)
        value_ids = self._id_list(raw_values) if raw_values else []
        if "cost_center_id" in filters:
            value_ids.append(int(filters.pop("cost_center_id")))
        if value_ids:
            found = self._category_value_ids(scope, value_ids, day)
            matched = found if matched is None else matched & found
        for key, kind in VIGENCY_QUERY.items():
            if key not in filters:
                continue
            ids = self._id_list(filters.pop(key))
            if not ids:
                continue
            found = set(self.repo.applicable_ids(scope.tenant_id, kind, day, reference_ids=set(ids)))
            matched = found if matched is None else matched & found
        if "situation" in filters:
            situation = str(filters.pop("situation") or "").strip()
            if situation:
                if situation not in STATUS_LABELS:
                    raise AppError(400, "Situação inválida")
                found = set(self.repo.applicable_ids(scope.tenant_id, "status", day, label=situation))
                matched = found if matched is None else matched & found
        return matched

    def employees_out(self, rows: list[Employee]) -> list[dict]:
        ids = [row.id for row in rows]
        labels = self.repo.labels_on(ids, self.today())
        cards = self._cards_on(rows, self.today())
        managers = self.repo.managers_on(ids, self.today())
        tenant_id = rows[0].tenant_id if rows else 0
        linked = [item for group in labels.values() for item in group.values()]
        linked.extend(item for group in managers.values() for item in group)
        names = self._entity_names(tenant_id, linked)
        return [
            self._employee_out(row, labels.get(row.id, {}), cards.get(row.id, []), managers.get(row.id, []), names)
            for row in rows
        ]

    def employees_lean(self, rows: list[Employee]) -> list[dict]:
        return [
            {
                "id": row.id,
                "full_name": row.full_name,
                "cpf": row.cpf,
                "email": row.email,
                "person_id": row.person_id,
                "admission_date": row.admission_date,
                "note": row.note,
                "hour_bank": row.hour_bank,
                "registration_number": row.registration_number,
                "clock_method": row.clock_method,
                "face_key": None,
                "face_url": None,
                "situation": None,
                "job_label": None,
                "journey_label": None,
                "cost_center_label": None,
                "unit_label": None,
                "team_label": None,
                "norm_label": None,
                "manager_label": None,
                "managers": [],
                "categories": [],
            }
            for row in rows
        ]

    def get_employee(self, scope: Scope, employee_id: int) -> dict:
        self._known(scope)
        row = self._employee(scope, employee_id)
        self._visible(scope, row.id)
        return self.employees_out([row])[0]

    def create_employee(self, scope: Scope, data: dict) -> dict:
        self._staff(scope)
        payload = self._employee_payload(scope, data, current=None)
        vector, face_key = self._reference_photo(data, payload["clock_method"])
        self._assert_capacity(scope)
        row = self.repo.add(Employee(tenant_id=scope.tenant_id, face_key=face_key, **payload))
        self.repo.add(
            EmployeeVigency(
                tenant_id=scope.tenant_id,
                employee_id=row.id,
                kind="status",
                reference_id=None,
                label="active",
                valid_from=payload["admission_date"],
                valid_to=None,
                note=None,
            )
        )
        self._plan_notice(scope)
        if vector is not None:
            self._write_embedding(scope, row.id, vector)
        return self.employees_out([row])[0]

    def update_employee(self, scope: Scope, employee_id: int, data: dict) -> dict:
        self._staff(scope)
        row = self._employee(scope, employee_id)
        self._visible(scope, row.id)
        payload = self._employee_payload(scope, data, current=row)
        next_method = payload.get("clock_method", row.clock_method or "simple")
        vector, face_key = self._reference_photo(data, next_method)
        if "admission_date" in payload:
            self._assert_open(scope.tenant_id, payload["admission_date"], row.id)
        for key, value in payload.items():
            setattr(row, key, value)
        if face_key is not None:
            row.face_key = face_key
        self.repo.add(row)
        if vector is not None:
            self._write_embedding(scope, row.id, vector)
        else:
            self._drop_faces(scope.tenant_id)
        return self.employees_out([row])[0]

    def delete_employee(self, scope: Scope, employee_id: int) -> None:
        self._staff(scope)
        row = self._employee(scope, employee_id)
        self._visible(scope, row.id)
        if self.repo.count_model(Punch, tenant_id=scope.tenant_id, employee_id=row.id):
            raise AppError(409, "O histórico permanece. Desligue o funcionário.")
        if self.repo.count_model(Occurrence, tenant_id=scope.tenant_id, employee_id=row.id):
            raise AppError(409, "O histórico permanece. Desligue o funcionário.")
        if self.repo.count_model(TimeRequest, tenant_id=scope.tenant_id, employee_id=row.id):
            raise AppError(409, "O histórico permanece. Desligue o funcionário.")
        vigencies, _total = self.repo.list_rows(
            EmployeeVigency,
            scope.tenant_id,
            page=1,
            limit=100,
            equals={"employee_id": row.id},
            descending=False,
        )
        extra = [item for item in vigencies if item.kind != "status"]
        if extra or len(vigencies) > 1:
            raise AppError(409, "O histórico permanece. Desligue o funcionário.")
        for item in vigencies:
            self.repo.delete(item)
        embedding = self._embedding(scope, row.id)
        if embedding is not None:
            self.repo.delete(embedding)
        self._drop_faces(scope.tenant_id)
        self.repo.delete(row)

    def list_vigencies(self, scope: Scope, page: int, limit: int, equals: dict):
        self._known(scope)
        if "employee_id" in equals:
            self._visible(scope, int(equals["employee_id"]))
        elif scope.role != "admin":
            ids = self._visible_ids(scope) or []
            if len(ids) != 1:
                return [], 0
            equals = {**equals, "employee_id": ids[0]}
        rows, total = self.repo.list_rows(
            EmployeeVigency, scope.tenant_id, page=page, limit=limit, equals=equals, descending=True
        )
        names = self._entity_names(scope.tenant_id, rows)
        return [self._present_vigency(row, names) for row in rows], total

    def get_vigency(self, scope: Scope, row_id: int):
        self._known(scope)
        row = self._row(EmployeeVigency, scope, row_id)
        self._visible(scope, row.employee_id)
        names = self._entity_names(scope.tenant_id, [row])
        return self._present_vigency(row, names)

    def _present_vigency(self, row: EmployeeVigency, names: dict[tuple[str, int], str]):
        return SimpleNamespace(
            id=row.id,
            employee_id=row.employee_id,
            kind=row.kind,
            reference_id=row.reference_id,
            category_id=row.category_id,
            label=self._shown_name(row, names),
            valid_from=row.valid_from,
            valid_to=row.valid_to,
            note=row.note,
            cycle_day=row.cycle_day,
        )

    def _shown_name(self, row: EmployeeVigency | None, names: dict[tuple[str, int], str]) -> str | None:
        if row is None:
            return None
        if row.kind == "status" or row.reference_id is None:
            return row.label
        return names.get((row.kind, int(row.reference_id)), row.label)

    def _entity_names(self, tenant_id: int, rows) -> dict[tuple[str, int], str]:
        grouped: dict[str, set[int]] = {}
        for row in rows:
            if row is None or row.kind == "status" or row.reference_id is None:
                continue
            grouped.setdefault(row.kind, set()).add(int(row.reference_id))
        found: dict[tuple[str, int], str] = {}
        for kind, ids in grouped.items():
            model = CategoryValue if kind == "category" else REF_MODELS.get(kind)
            if model is None:
                continue
            for item in self.repo.rows_in(model, tenant_id, list(ids)):
                found[(kind, item.id)] = item.full_name if kind == "manager" else item.name
        return found

    def create_vigency(self, scope: Scope, data: dict) -> EmployeeVigency:
        self._staff(scope)
        employee = self._employee(scope, int(data["employee_id"]))
        self._visible(scope, employee.id)
        kind = data["kind"]
        if kind == "unit":
            raise AppError(400, "Informe a equipe. A empresa acompanha a equipe.")
        valid_from = data["valid_from"]
        self._assert_open(scope.tenant_id, valid_from, employee.id)
        category_id = None
        if kind in {"category", "cost_center"}:
            category_id, reference_id, label = self._category_choice(scope, kind, data.get("reference_id"))
            kind = "category"
        else:
            reference_id, label = self._vigency_target(scope, employee, kind, data, valid_from)
        if kind == "status" and label == "active" and not self._occupies(employee.id, self.today()):
            self._assert_capacity(scope)
        note = self._note(data.get("note"))
        cycle_day = self._cycle_day(scope, reference_id, valid_from, data.get("cycle_day")) if kind == "journey" else None
        row = self._replace_vigency(
            scope, employee.id, kind, reference_id, label, valid_from, note, cycle_day, category_id
        )
        if kind == "team":
            team = self._row(Team, scope, int(reference_id))
            unit = self._row(Unit, scope, int(team.unit_id))
            self._replace_vigency(scope, employee.id, "unit", unit.id, unit.name, valid_from, note)
        return row

    def _replace_vigency(
        self,
        scope: Scope,
        employee_id: int,
        kind: str,
        reference_id: int | None,
        label: str,
        valid_from: date,
        note: str | None,
        cycle_day: int | None = None,
        category_id: int | None = None,
    ) -> EmployeeVigency:
        if kind == "manager":
            return self._add_manager(scope, employee_id, reference_id, label, valid_from, note)
        current = self.repo.open_vigency(employee_id, kind, category_id)
        if current is not None and current.valid_from == valid_from:
            previous = current.label
            current.reference_id = reference_id
            current.category_id = category_id
            current.label = label
            current.note = note
            current.cycle_day = cycle_day
            self.repo.add(current)
            self._audit(scope, employee_id, kind, current.id, previous, label, valid_from)
            return current
        if current is not None:
            end = previous_end(current.valid_from, valid_from)
            self._assert_open(scope.tenant_id, end, employee_id)
            current.valid_to = end
            self.repo.add(current)
        row = self.repo.add(
            EmployeeVigency(
                tenant_id=scope.tenant_id,
                employee_id=employee_id,
                kind=kind,
                reference_id=reference_id,
                category_id=category_id,
                label=label,
                valid_from=valid_from,
                valid_to=None,
                note=note,
                cycle_day=cycle_day,
            )
        )
        self._audit(scope, employee_id, kind, row.id, current.label if current else None, label, valid_from)
        return row

    def _add_manager(
        self,
        scope: Scope,
        employee_id: int,
        reference_id: int | None,
        label: str,
        valid_from: date,
        note: str | None,
    ) -> EmployeeVigency:
        if reference_id is None:
            raise AppError(400, "Selecione o cadastro")
        current = self.repo.open_manager(employee_id, reference_id)
        if current is not None and current.valid_from == valid_from:
            previous = current.label
            current.label = label
            current.note = note
            self.repo.add(current)
            self._audit(scope, employee_id, "manager", current.id, previous, label, valid_from)
            return current
        if current is not None:
            raise AppError(409, "Esse gestor já está vigente")
        row = self.repo.add(
            EmployeeVigency(
                tenant_id=scope.tenant_id,
                employee_id=employee_id,
                kind="manager",
                reference_id=reference_id,
                category_id=None,
                label=label,
                valid_from=valid_from,
                valid_to=None,
                note=note,
                cycle_day=None,
            )
        )
        self._audit(scope, employee_id, "manager", row.id, None, label, valid_from)
        return row

    def change_employees(self, scope: Scope, data: dict) -> dict:
        self._staff(scope)
        raw_ids = data.get("employee_ids") or []
        if not raw_ids:
            raise AppError(400, "Selecione ao menos um funcionário.")
        seen: list[int] = []
        for value in raw_ids:
            employee_id = int(value)
            if employee_id not in seen:
                seen.append(employee_id)
        kind = str(data.get("kind") or "")
        if kind not in BULK_KINDS:
            raise AppError(400, "Operação inválida")
        people = []
        for employee_id in seen:
            row = self.repo.get_row(Employee, scope.tenant_id, employee_id)
            if row is None:
                raise AppError(404, "Há um funcionário da seleção que não existe.")
            self._visible(scope, row.id)
            people.append(row)
        if kind == "clock_method":
            method = str(data.get("clock_method") or "").strip().lower()
            if method not in {"simple", "qr", "face"}:
                raise AppError(400, "Tipo de registro inválido")
            for row in people:
                row.clock_method = method
                self.repo.add(row)
            return {"changed": len(people)}
        valid_from = data.get("valid_from")
        if valid_from is None:
            raise AppError(400, "Informe a vigência")
        for row in people:
            try:
                self._assert_open(scope.tenant_id, valid_from, row.id)
            except AppError as error:
                raise AppError(error.status_code, f"{row.full_name}: {error.message}") from None
        note = self._note(data.get("note"))
        extras: list[tuple[str, int, str]] = []
        category_id = None
        if kind in {"category", "cost_center"}:
            if data.get("reference_id") is None:
                raise AppError(400, "Selecione o cadastro")
            category_id, reference_id, label = self._category_choice(scope, kind, data.get("reference_id"))
            kind = "category"
        elif kind == "status":
            label = str(data.get("label") or "").strip()
            if label not in STATUS_LABELS:
                raise AppError(400, "Situação inválida")
            reference_id = None
        else:
            if data.get("reference_id") is None:
                raise AppError(400, "Selecione o cadastro")
            target = self._row(REF_MODELS[kind], scope, int(data["reference_id"]))
            reference_id = target.id
            label = target.full_name if kind == "manager" else target.name
            if kind == "manager":
                for row in people:
                    if row.id == target.id:
                        raise AppError(400, f"{row.full_name}: o gestor precisa ser outro funcionário.")
            if kind == "team":
                unit = self._row(Unit, scope, int(target.unit_id))
                extras = [("unit", unit.id, unit.name)]
        cycle_day = self._cycle_day(scope, reference_id, valid_from, data.get("cycle_day")) if kind == "journey" else None
        if kind == "status" and label == "active":
            entering = [row for row in people if not self._occupies(row.id, self.today())]
            if entering:
                tenant = self.repo.get_tenant(scope.tenant_id)
                if tenant is None:
                    raise AppError(404, "Organização não encontrada")
                active = self.repo.count_active(scope.tenant_id, self.today())
                if active + len(entering) > tenant.employee_capacity:
                    raise AppError(409, f"{entering[0].full_name}: limite de funcionários do plano atingido")
        for row in people:
            self._assert_can_replace(scope, row, kind, valid_from, category_id)
            for extra_kind, _extra_id, _extra_label in extras:
                self._assert_can_replace(scope, row, extra_kind, valid_from)
        for row in people:
            try:
                self._replace_vigency(
                    scope, row.id, kind, reference_id, label, valid_from, note, cycle_day, category_id
                )
            except AppError as error:
                if kind == "manager":
                    raise AppError(error.status_code, f"{row.full_name}: {error.message}") from None
                raise
            for extra_kind, extra_id, extra_label in extras:
                self._replace_vigency(scope, row.id, extra_kind, extra_id, extra_label, valid_from, note)
        return {"changed": len(people)}

    def _assert_can_replace(
        self, scope: Scope, employee: Employee, kind: str, valid_from: date, category_id: int | None = None
    ) -> None:
        if kind == "manager":
            return
        current = self.repo.open_vigency(employee.id, kind, category_id)
        if current is None or current.valid_from == valid_from:
            return
        try:
            end = previous_end(current.valid_from, valid_from)
        except AppError as error:
            raise AppError(error.status_code, f"{employee.full_name}: {error.message}") from None
        if self.repo.closed_for_employee(scope.tenant_id, end, employee.id) is not None:
            raise AppError(409, f"{employee.full_name}: período fechado")

    def update_vigency(self, scope: Scope, row_id: int, data: dict) -> EmployeeVigency:
        self._staff(scope)
        row = self._row(EmployeeVigency, scope, row_id)
        self._visible(scope, row.employee_id)
        if data.get("end"):
            return self._end_manager(scope, row)
        self._assert_open(scope.tenant_id, row.valid_from, row.employee_id)
        if "note" in data:
            row.note = self._note(data.get("note"))
            self.repo.add(row)
        return row

    def _end_manager(self, scope: Scope, row: EmployeeVigency) -> EmployeeVigency:
        if row.kind != "manager":
            raise AppError(400, "Só o gestor pode ser encerrado por aqui")
        if row.valid_to is not None:
            raise AppError(409, "Esse gestor já foi encerrado")
        if row.valid_from > self.today():
            end = row.valid_from - timedelta(days=1)
        else:
            self._assert_open(scope.tenant_id, self.today(), row.employee_id)
            end = self.today() - timedelta(days=1)
            if end < row.valid_from:
                end = row.valid_from - timedelta(days=1)
        previous = row.label
        row.valid_to = end
        self.repo.add(row)
        self._audit(scope, row.employee_id, "manager", row.id, previous, None, self.today())
        return row

    def delete_vigency(self, scope: Scope, row_id: int) -> None:
        self._staff(scope)
        row = self._row(EmployeeVigency, scope, row_id)
        self._visible(scope, row.employee_id)
        if row.kind == "unit":
            raise AppError(400, "A empresa acompanha a equipe.")
        companion = self._companion_unit(scope, row) if row.kind == "team" else None
        planned = [self._plan_release(scope, row, keep=row.kind != "manager")]
        if companion is not None:
            planned.append(self._plan_release(scope, companion, keep=False))
        for previous, target in planned:
            if previous is not None:
                previous.valid_to = target.valid_to
                self.repo.add(previous)
            self._audit(scope, target.employee_id, target.kind, target.id, target.label, None, target.valid_from)
            self.repo.delete(target)

    def _companion_unit(self, scope: Scope, row: EmployeeVigency) -> EmployeeVigency | None:
        found = [
            item
            for item in self._vigency_rows(scope.tenant_id, row.employee_id, "unit")
            if item.valid_from == row.valid_from
        ]
        matched = [item for item in found if item.valid_to == row.valid_to]
        chosen = matched or found
        return chosen[-1] if chosen else None

    def _plan_release(self, scope: Scope, row: EmployeeVigency, *, keep: bool) -> tuple[EmployeeVigency | None, EmployeeVigency]:
        chain = self._release_chain(scope, row)
        if keep and len(chain) <= 1:
            raise AppError(409, _KEEP_VIGENCY.get(row.kind, "Mantenha ao menos um vínculo."))
        self._assert_range_open(scope.tenant_id, row.employee_id, row.valid_from, row.valid_to)
        index = next((place for place, item in enumerate(chain) if item.id == row.id), None)
        previous = chain[index - 1] if index is not None and index > 0 else None
        return previous, row

    def _release_chain(self, scope: Scope, row: EmployeeVigency) -> list[EmployeeVigency]:
        if row.kind == "manager":
            everyone = self._vigency_rows(scope.tenant_id, row.employee_id, "manager")
            if len(everyone) <= 1:
                raise AppError(409, _KEEP_VIGENCY["manager"])
            return [item for item in everyone if item.reference_id == row.reference_id]
        if row.kind == "category":
            return self._vigency_rows(scope.tenant_id, row.employee_id, "category", category_id=row.category_id)
        return self._vigency_rows(scope.tenant_id, row.employee_id, row.kind)

    def _vigency_rows(self, tenant_id: int, employee_id: int, kind: str, **equals) -> list[EmployeeVigency]:
        found: list[EmployeeVigency] = []
        page = 1
        while True:
            rows, total = self.repo.list_rows(
                EmployeeVigency,
                tenant_id,
                page=page,
                limit=100,
                equals={"employee_id": employee_id, "kind": kind, **equals},
                descending=False,
            )
            found.extend(rows)
            if len(found) >= total or not rows:
                break
            page += 1
        found.sort(key=lambda item: (item.valid_from, item.id))
        return found

    def _assert_range_open(self, tenant_id: int, employee_id: int, start: date, end: date | None) -> None:
        finish = end if end is not None else max(start, self.today())
        if finish < start:
            return
        for row in self.repo.overlapping_closings(tenant_id, start, finish):
            if getattr(row, "status", None) != "closed":
                continue
            members = self.repo.member_ids(row.id)
            if not members or employee_id in members:
                raise AppError(409, "Período fechado")

    def list_punches(self, scope: Scope, page: int, limit: int, equals: dict, fields: str | None = None):
        self._known(scope)
        filters = dict(equals)
        starts_on = filters.pop("starts_on", None)
        ends_on = filters.pop("ends_on", None)
        occurred_from = None
        occurred_to = None
        if starts_on is not None or ends_on is not None:
            start_day = self._filter_day(starts_on) if starts_on is not None else None
            end_day = self._filter_day(ends_on) if ends_on is not None else None
            if start_day is not None and end_day is not None and end_day < start_day:
                raise AppError(400, "Intervalo inválido")
            if start_day is not None:
                occurred_from, _ignored = day_bounds(start_day)
            if end_day is not None:
                _ignored, occurred_to = day_bounds(end_day)
        ids = self._visible_ids(scope)
        if "employee_id" in filters:
            self._visible(scope, int(filters["employee_id"]))
            ids = None
        elif ids is not None and len(ids) == 0:
            return [], 0
        rows, total = self.repo.list_punches(
            scope.tenant_id,
            page=page,
            limit=limit,
            equals=filters,
            occurred_from=occurred_from,
            occurred_to=occurred_to,
            descending=True,
            employee_ids=ids,
        )
        for row in rows:
            self._punch_links(row, fields=fields)
        return rows, total

    def get_punch(self, scope: Scope, row_id: int) -> Punch:
        row = self._row(Punch, scope, row_id)
        self._visible(scope, row.employee_id)
        self._punch_links(row)
        return row

    def _punch_links(self, row: Punch, fields: str | None = None) -> None:
        requested = parse_fields(fields)
        want = requested is None or bool({"qr_url", "selfie_url", "face_url"} & set(requested))
        if not want:
            row.qr_url = None
            row.selfie_url = None
            row.face_url = None
            return
        row.qr_url = self._photo_url(getattr(row, "qr_key", None))
        row.selfie_url = self._photo_url(getattr(row, "selfie_key", None))
        row.face_url = self._photo_url(getattr(row, "face_key", None))

    def create_punch(
        self,
        scope: Scope,
        data: dict,
        *,
        source: str | None = None,
        request_id: int | None = None,
        channel: str | None = None,
        qr_image: bytes | None = None,
        selfie_image: bytes | None = None,
        face_image: bytes | None = None,
        client_event_id: str | None = None,
        trusted_device: bool = False,
    ) -> Punch:
        employee = self._employee(scope, int(data["employee_id"]))
        if trusted_device:
            if source not in {"qr", "face"}:
                raise AppError(400, "Este aparelho não registra ponto simples.")
        else:
            self._can_punch(scope, employee, source)
        chosen = source or self._punch_source(scope, employee)
        self._assert_clock_method(employee, chosen)
        occurred = assert_aware(data["occurred_at"])
        assert_not_future(occurred, self.today())
        self._assert_working(scope, employee)
        self._assert_open(scope.tenant_id, self._punch_day(occurred), employee.id)
        day = occurred.astimezone(BR).date()
        row = self.repo.add(
            Punch(
                tenant_id=scope.tenant_id,
                employee_id=employee.id,
                occurred_at=occurred,
                source=chosen,
                request_id=request_id,
                reason_id=data.get("reason_id"),
                note=self._note(data.get("note")),
                valid=True,
                voided_at=None,
                channel=channel,
                qr_key=self.files.save_punch(day, qr_image) if qr_image else None,
                selfie_key=self.files.save_punch(day, selfie_image) if selfie_image else None,
                face_key=self.files.save_punch(day, face_image) if face_image else None,
                client_event_id=client_event_id,
                created_at=self.clock(),
            )
        )
        self._punch_links(row)
        self._audit(scope, employee.id, "punch", row.id, None, "Marcação", self._punch_day(occurred))
        return row

    def punch_code(self, scope: Scope, employee_id: int) -> dict:
        self._known(scope)
        employee = self._employee(scope, employee_id)
        self._visible(scope, employee.id)
        unit, registration = self._clock_identity(employee, self.today())
        return {
            "employee_id": employee.id,
            "unit_id": unit.reference_id,
            "unit_name": self._shown_name(unit, self._entity_names(employee.tenant_id, [unit])),
            "cpf": employee.cpf,
            "registration_number": registration,
            "content": render_code(unit.reference_id, employee.cpf, registration),
        }

    def list_qr_cards(self, scope: Scope, page: int, limit: int):
        self._known(scope)
        ids = self._visible_ids(scope)
        rows, total = self.repo.list_qr_employees(
            scope.tenant_id, self.today(), page=page, limit=limit, ids=ids
        )
        if not rows:
            return [], total
        labels = self.repo.labels_on([employee.id for employee in rows], self.today())
        units = [labels.get(employee.id, {}).get("unit") for employee in rows]
        names = self._entity_names(scope.tenant_id, [unit for unit in units if unit is not None])
        cards = []
        for employee in rows:
            unit = labels.get(employee.id, {}).get("unit")
            if unit is None or unit.reference_id is None or not employee.registration_number:
                continue
            registration = employee.registration_number
            cards.append(
                {
                    "employee_id": employee.id,
                    "full_name": employee.full_name,
                    "unit_id": unit.reference_id,
                    "unit_name": self._shown_name(unit, names),
                    "cpf": employee.cpf,
                    "registration_number": registration,
                    "content": render_code(unit.reference_id, employee.cpf, registration),
                }
            )
        return cards, total

    def punch_qr(self, scope: Scope, data: dict) -> Punch:
        employee = self._employee(scope, int(data["employee_id"]))
        self._own_clock(scope, employee)
        self._assert_clock_method(employee, "qr")
        qr_image = decode_image(str(data.get("qr_image") or ""), message="A foto do QR Code não foi aceita.")
        selfie_image = decode_image(str(data.get("selfie_image") or ""), message="A selfie não foi aceita.")
        occurred = assert_aware(data["occurred_at"])
        unit, registration = self._clock_identity(employee, occurred.astimezone(BR).date())
        parsed = read_code(str(data.get("content") or ""))
        expected = (unit.reference_id, employee.cpf, registration)
        if parsed != expected:
            raise AppError(400, "O QR Code não foi aceito.")
        return self.create_punch(scope, data, source="qr", qr_image=qr_image, selfie_image=selfie_image)

    def punch_face(self, scope: Scope, data: dict) -> Punch:
        employee = self._employee(scope, int(data["employee_id"]))
        self._own_clock(scope, employee)
        channel = data.get("channel")
        if channel not in {"online", "offline"}:
            raise AppError(400, "Reconhecimento inválido.")
        event_id = str(data.get("client_event_id") or "").strip() or None
        if channel == "offline" and event_id is None:
            raise AppError(400, "Informe o evento do aparelho.")
        if event_id is not None:
            existing = self._punch_by_event(scope, employee.id, event_id)
            if existing is not None:
                return existing
        self._assert_clock_method(employee, "face")
        stored = self._embedding(scope, employee.id)
        if stored is None:
            raise AppError(400, "Este funcionário não tem foto de referência.")
        image = decode_image(str(data.get("image") or ""), message="A foto não foi aceita.")
        try:
            vector = self.embedder(image)
            if not match_one(vector, list(stored.embedding)):
                raise AppError(400, "O rosto não foi reconhecido.")
        except AppError:
            raise
        except ValueError:
            raise AppError(400, "O rosto não foi reconhecido.") from None
        except Exception:
            logger.exception("falha ao comparar o rosto employee_id=%s", employee.id)
            raise AppError(503, "Reconhecimento indisponível") from None
        return self.create_punch(
            scope,
            data,
            source="face",
            channel=channel,
            face_image=image,
            client_event_id=event_id,
        )

    def list_face_embeddings(self, scope: Scope, page: int, limit: int, updated_since: datetime | None = None):
        self._known(scope)
        rows, total = self.repo.list_face_embeddings(
            scope.tenant_id,
            page=page,
            limit=limit,
            updated_since=updated_since,
        )
        ready = [
            {
                "employee_id": employee.id,
                "person_id": employee.person_id,
                "embedding": list(row.embedding),
                "model_name": row.model_name,
                "model_version": row.model_version,
                "threshold": COSINE_THRESHOLD,
                "updated_at": row.updated_at,
            }
            for row, employee in rows
        ]
        return ready, total

    def device_face_candidate(self, tenant_id: int, image: bytes | None = None, vector: list[float] | None = None) -> int | None:
        scope = Scope(person_id=0, tenant_id=tenant_id, role="member")
        try:
            if vector is None:
                if image is None:
                    raise AppError(400, "A foto não foi aceita.")
                vector = self.embedder(image)
        except AppError:
            raise
        except ValueError:
            raise AppError(400, "O rosto não foi reconhecido.") from None
        except Exception:
            logger.exception("falha ao comparar o rosto no aparelho tenant_id=%s", tenant_id)
            raise AppError(503, "Reconhecimento indisponível") from None
        return best_match(vector, self._face_registry(scope), registry_unit=True)

    def device_qr_candidates(self, tenant_id: int, content: str) -> list[int]:
        parsed = read_code(content)
        if parsed is None:
            return []
        unit_id, cpf, registration = parsed
        employee = self.repo.employee_by_cpf(tenant_id, cpf)
        if employee is None:
            employee = self.repo.employee_by_registration(tenant_id, registration)
        if employee is None or employee.clock_method != "qr":
            return []
        try:
            unit, current_registration = self._clock_identity(employee, self.today())
        except AppError:
            return []
        if (unit.reference_id, employee.cpf, current_registration) != (unit_id, cpf, registration):
            return []
        return [employee.id]

    def device_method_flags(self, tenant_id: int) -> dict:
        return {"face": self._has_clock_method(tenant_id, "face"), "qr": self._has_clock_method(tenant_id, "qr")}

    def device_embeddings(
        self,
        tenant_ids: list[int],
        page: int,
        limit: int,
        updated_since: datetime | None = None,
    ) -> tuple[list[dict], int]:
        rows, total = self.repo.list_face_embeddings_for_tenants(
            tenant_ids,
            page=page,
            limit=limit,
            updated_since=updated_since,
        )
        ready = [
            {
                "tenant_id": row.tenant_id,
                "employee_id": employee.id,
                "embedding": list(row.embedding),
                "model_name": row.model_name,
                "model_version": row.model_version,
                "threshold": COSINE_THRESHOLD,
                "updated_at": row.updated_at,
            }
            for row, employee in rows
        ]
        return ready, total

    def commit_device_face(
        self,
        tenant_id: int,
        employee_id: int,
        data: dict,
        image: bytes,
        vector: list[float] | None = None,
    ) -> Punch:
        scope = Scope(person_id=0, tenant_id=tenant_id, role="member")
        employee = self._employee(scope, employee_id)
        channel = data.get("channel")
        if channel not in {"online", "offline"}:
            raise AppError(400, "Reconhecimento inválido.")
        event_id = str(data.get("client_event_id") or "").strip() or None
        if channel == "offline" and event_id is None:
            raise AppError(400, "Informe o evento do aparelho.")
        if event_id is not None:
            existing = self._punch_by_event(scope, employee.id, event_id)
            if existing is not None:
                return existing
        self._assert_clock_method(employee, "face")
        stored = self._embedding(scope, employee.id)
        if stored is None:
            raise AppError(400, "Este funcionário não tem foto de referência.")
        try:
            probe = vector if vector is not None else self.embedder(image)
            if not match_one(probe, list(stored.embedding)):
                raise AppError(400, "O rosto não foi reconhecido.")
        except AppError:
            raise
        except ValueError:
            raise AppError(400, "O rosto não foi reconhecido.") from None
        except Exception:
            logger.exception("falha ao confirmar o rosto no aparelho employee_id=%s", employee.id)
            raise AppError(503, "Reconhecimento indisponível") from None
        return self.create_punch(
            scope,
            {"employee_id": employee.id, "occurred_at": data["occurred_at"], "note": None},
            source="face",
            channel=channel,
            face_image=image,
            client_event_id=event_id,
            trusted_device=True,
        )

    def commit_device_qr(self, tenant_id: int, employee_id: int, data: dict, qr_image: bytes, selfie_image: bytes) -> Punch:
        scope = Scope(person_id=0, tenant_id=tenant_id, role="member")
        self._employee(scope, employee_id)
        content = str(data.get("content") or "").strip()
        if self.device_qr_candidates(tenant_id, content) != [employee_id]:
            raise AppError(400, "O QR Code não foi aceito.")
        return self.create_punch(
            scope,
            {"employee_id": employee_id, "occurred_at": data["occurred_at"], "note": None},
            source="qr",
            qr_image=qr_image,
            selfie_image=selfie_image,
            trusted_device=True,
        )

    def _has_clock_method(self, tenant_id: int, method: str) -> bool:
        _rows, total = self.repo.list_rows(
            Employee,
            tenant_id,
            page=1,
            limit=1,
            equals={"clock_method": method},
            descending=False,
        )
        return total > 0

    def store_selfie(self, scope: Scope, content_type: str, body: bytes) -> str:
        self._known(scope)
        if content_type not in {"image/jpeg", "image/png"}:
            raise AppError(400, "A selfie precisa ser uma imagem")
        return self.files.upload(
            tenant_id=scope.tenant_id,
            folder="selfies",
            content_type=content_type,
            body=body,
        )

    def correct_punches(self, scope: Scope, data: dict) -> dict:
        employee = self._employee(scope, int(data["employee_id"]))
        self._can_launch(scope, employee)
        day, moments = self._normalize_day(data["punches"])
        self._assert_no_pending(scope, employee.id, day, day)
        reason_id = self._reason(scope, "adjustment", data.get("reason_id"))
        created = self._replace_day(
            scope,
            employee,
            day,
            moments,
            source="manual",
            request_id=None,
            reason_id=reason_id,
            note=self._note(data.get("note")),
            origin_label="manual",
        )
        return {"employee_id": employee.id, "day": day, "origin": "manual", "punches": created}

    def restore_punches(self, scope: Scope, data: dict) -> dict:
        employee = self._employee(scope, int(data["employee_id"]))
        self._can_launch(scope, employee)
        day = data["day"]
        self._assert_open(scope.tenant_id, day, employee.id)
        self._assert_no_pending(scope, employee.id, day, day)
        self._assert_working(scope, employee)
        start, end = day_bounds(day)
        rows = self.repo.punches_between(scope.tenant_id, employee.id, start, end)
        current = [row for row in rows if row.valid and row.source in ADJUSTMENT_SOURCES]
        if not current:
            raise AppError(409, "Não há ajuste para desfazer")
        voided_at = self.clock()
        for row in current:
            row.valid = False
            row.voided_at = voided_at
            self.repo.add(row)
        restored = []
        for row in rows:
            if row.source in ADJUSTMENT_SOURCES or row.valid:
                continue
            row.valid = True
            row.voided_at = None
            self.repo.add(row)
            restored.append(row)
        subject_id = restored[0].id if restored else current[0].id
        self._audit(scope, employee.id, "punch_restore", subject_id, "ajuste", "original", day)
        return {"employee_id": employee.id, "day": day, "punches": restored}

    def refuse_punch_change(self, scope: Scope, row_id: int) -> None:
        self.get_punch(scope, row_id)
        raise AppError(409, "Marcação registrada não é alterada nem apagada.")

    def list_occurrences(self, scope: Scope, page: int, limit: int, equals: dict):
        if equals.get("kind"):
            equals["kind"] = occurrence_kind(str(equals["kind"]))
        rows, total = self._scoped_list(scope, Occurrence, page, limit, equals)
        return [self._show_document(row) for row in rows], total

    def get_occurrence(self, scope: Scope, row_id: int) -> Occurrence:
        row = self._row(Occurrence, scope, row_id)
        self._visible(scope, row.employee_id)
        return self._show_document(row)

    def create_occurrence(self, scope: Scope, data: dict, *, source: str = "admin", request_id: int | None = None) -> Occurrence:
        employee = self._employee(scope, int(data["employee_id"]))
        kind = occurrence_kind(data["kind"])
        if kind in {"punch_entry", "adjustment"} and source != "approved_request":
            raise AppError(400, "O lançamento de marcação não existe. Corrija as marcações do dia.")
        if source == "approved_request":
            origin = "approved_request"
        elif kind in MANUAL_OCCURRENCE_KINDS:
            self._can_launch(scope, employee)
            origin = "manual"
        else:
            self._staff(scope)
            self._visible(scope, employee.id)
            origin = "admin"
        self._days_only(kind, data)
        start, end, starts_at, ends_at = self._span(data)
        self._assert_span_open(scope.tenant_id, start, end, employee.id)
        if source != "approved_request":
            self._assert_no_pending(scope, employee.id, start, end)
        cid, crm, doctor = self._medical(kind, data)
        photo_key = self._photo_key(scope, kind, data.get("photo_key"))
        reason_id = self._reason(scope, REASON_FOR_OCCURRENCE.get(kind), data.get("reason_id"))
        warning = None
        if kind == "certificates" and self._period_has_punch(scope, employee.id, start, end, starts_at, ends_at):
            warning = CERTIFICATE_CONFLICT
        row = self.repo.add(
            Occurrence(
                tenant_id=scope.tenant_id,
                employee_id=employee.id,
                kind=kind,
                starts_on=start,
                ends_on=end,
                starts_at=starts_at,
                ends_at=ends_at,
                reason_id=reason_id,
                note=self._note(data.get("note")),
                source=origin,
                request_id=request_id,
                cid=cid,
                crm=crm,
                doctor_name=doctor,
                photo_key=photo_key,
                warning=warning,
                created_at=self.clock(),
            )
        )
        self._audit(scope, employee.id, "occurrence", row.id, None, kind, start)
        return self._show_document(row)

    def store_certificate_photo(self, scope: Scope, content_type: str, body: bytes) -> str:
        self._known(scope)
        return StorageService().upload(
            tenant_id=scope.tenant_id,
            folder="certificates",
            content_type=content_type,
            body=body,
        )

    def update_occurrence(self, scope: Scope, row_id: int, data: dict) -> Occurrence:
        self._staff(scope)
        row = self.get_occurrence(scope, row_id)
        self._assert_open(scope.tenant_id, row.starts_on, row.employee_id)
        self._assert_no_pending(scope, row.employee_id, row.starts_on, row.ends_on)
        if "note" in data:
            row.note = self._note(data.get("note"))
            self.repo.add(row)
        return row

    def delete_occurrence(self, scope: Scope, row_id: int) -> None:
        row = self.get_occurrence(scope, row_id)
        employee = self._employee(scope, row.employee_id)
        if row.kind in MANUAL_OCCURRENCE_KINDS:
            self._can_launch(scope, employee)
        else:
            self._staff(scope)
        self._assert_span_open(scope.tenant_id, row.starts_on, row.ends_on, row.employee_id)
        self._audit(scope, row.employee_id, "occurrence_delete", row.id, row.kind, None, row.starts_on)
        self.repo.delete(row)

    def list_requests(self, scope: Scope, page: int, limit: int, equals: dict):
        rows, total = self._scoped_list(scope, TimeRequest, page, limit, equals)
        return [self._request_out(row, events, punches) for row, events, punches in self._with_events(rows)], total

    def get_request(self, scope: Scope, row_id: int) -> dict:
        row = self._row(TimeRequest, scope, row_id)
        self._visible(scope, row.employee_id)
        events = self.repo.events_for([row.id]).get(row.id, [])
        punches = self.repo.request_punches_for([row.id]).get(row.id, [])
        return self._request_out(row, events, punches)

    def create_request(self, scope: Scope, data: dict) -> dict:
        employee = self._own_employee(scope)
        self._assert_working(scope, employee)
        kind = data["kind"]
        occurred = None
        moments: list[datetime] = []
        start = data.get("starts_on")
        end = data.get("ends_on")
        starts_at = None
        ends_at = None
        cid = crm = doctor = photo_key = None
        if kind == "adjustment":
            raw = data.get("punches")
            if not raw and data.get("occurred_at") is not None:
                raw = [data["occurred_at"]]
            day, moments = self._normalize_day(list(raw or []))
            start = day
            end = day
            occurred = moments[0] if len(moments) == 1 else None
            self._assert_open(scope.tenant_id, day, employee.id)
            self._medical(kind, data)
            self._photo_key(scope, kind, data.get("photo_key"))
        else:
            if data.get("punches"):
                raise AppError(400, "Marcações do dia só entram no ajuste")
            self._days_only(kind, data)
            start, end, starts_at, ends_at = self._span(data)
            self._assert_span_open(scope.tenant_id, start, end, employee.id)
            cid, crm, doctor = self._medical(kind, data)
            photo_key = self._photo_key(scope, kind, data.get("photo_key"))
        reason_id = self._reason(scope, REASON_FOR_REQUEST[kind], data.get("reason_id"))
        row = self.repo.add(
            TimeRequest(
                tenant_id=scope.tenant_id,
                employee_id=employee.id,
                kind=kind,
                status="pending",
                reason_id=reason_id,
                note=self._note(data.get("note")),
                starts_on=start,
                ends_on=end,
                occurred_at=occurred,
                starts_at=starts_at,
                ends_at=ends_at,
                cid=cid,
                crm=crm,
                doctor_name=doctor,
                photo_key=photo_key,
                decision_note=None,
                decided_at=None,
                decided_by_person_id=None,
                created_at=self.clock(),
            )
        )
        for index, moment in enumerate(moments):
            self.repo.add(
                RequestPunch(
                    tenant_id=scope.tenant_id,
                    request_id=row.id,
                    occurred_at=moment,
                    position=index,
                )
            )
        self._request_event(scope, row, "pending", "Criada")
        notice_kind = "certificate_received" if kind == "certificate" else "request_created"
        self._notify_reviewers(scope, employee, notice_kind)
        return self.get_request(scope, row.id)

    def decide_request(self, scope: Scope, row_id: int, data: dict) -> dict:
        row = self._row(TimeRequest, scope, row_id)
        if row.status != "pending":
            raise AppError(409, "A solicitação não está pendente")
        status = data["status"]
        employee = self._employee(scope, row.employee_id)
        if status == "cancelled":
            if employee.person_id != scope.person_id:
                raise AppError(403, "Sem permissão")
        else:
            self._can_decide(scope, employee)
        if status == "approved":
            self._approve(scope, row, employee)
        row.status = status
        row.decision_note = self._note(data.get("decision_note"))
        row.decided_at = self.clock()
        row.decided_by_person_id = scope.person_id
        self.repo.add(row)
        self._request_event(scope, row, status, row.decision_note)
        self._audit(scope, employee.id, "request", row.id, "pending", status, row.starts_on)
        self._notify_employee(scope, employee, f"request_{status}")
        return self.get_request(scope, row.id)

    def list_closings(self, scope: Scope, page: int, limit: int, equals: dict):
        self._known(scope)
        filters = dict(equals)
        employee_id = filters.pop("employee_id", None)
        if employee_id is not None:
            rows, total = self.repo.list_closings_for_employee(
                scope.tenant_id,
                int(employee_id),
                page=page,
                limit=limit,
                equals=filters,
                descending=True,
            )
        else:
            rows, total = self.repo.list_rows(
                Closing, scope.tenant_id, page=page, limit=limit, equals=filters, descending=True
            )
        events = self.repo.closing_events_for([row.id for row in rows])
        return [self._closing_out(row, events.get(row.id, [])) for row in rows], total

    def get_closing(
        self,
        scope: Scope,
        row_id: int,
        *,
        page: int | None = None,
        limit: int | None = None,
        part: str | None = None,
        employee_id: int | None = None,
    ) -> dict:
        self._known(scope)
        row = self._row(Closing, scope, row_id)
        events = self.repo.closing_events_for([row.id]).get(row.id, [])
        payload = self._closing_out(row, events)
        payload["people_total"] = 0
        if row.status != "closed":
            return payload
        outer = self._scratch_scope()
        try:
            if part == "bank_roster":
                roster, total = self._closing_roster_page(scope, row, page=1, limit=10_000, hour_bank=True)
                payload["banks"] = [
                    {
                        "employee_id": employee.id,
                        "full_name": employee.full_name,
                        "registration_number": employee.registration_number,
                        "balance_minutes": None,
                        "entries": [],
                    }
                    for employee in roster
                ]
                payload["people_total"] = total
                return payload
            if part == "banks":
                current = page or 1
                size = limit or 20
                _people, banks, total = self._closing_statement(
                    scope,
                    row,
                    page=current,
                    limit=size,
                    include_people=False,
                    employee_id=employee_id,
                )
                payload["banks"] = banks
                payload["people_total"] = total
                return payload
            if part == "people":
                current = page or 1
                size = limit or 20
                people, _banks, total = self._closing_statement(
                    scope, row, page=current, limit=size, with_days=False, include_banks=False
                )
                payload["people"] = people
                payload["people_total"] = total
                return payload
            if part == "sheets":
                # Caminho próprio de exportação: calcula o período uma vez para o PDF.
                people, _banks, total = self._closing_sheets(scope, row)
                payload["people"] = people
                payload["people_total"] = total
                return payload
            current = page or 1
            size = limit or 20
            people, banks, total = self._closing_statement(scope, row, page=current, limit=size)
            payload["people"] = people
            payload["banks"] = banks
            payload["people_total"] = total
            return payload
        finally:
            self._end_scratch(outer)

    def create_closing(self, scope: Scope, data: dict) -> dict:
        self._can_manage_period(scope)
        start, end = self._closing_bounds(data)
        if (end - start).days + 1 > 366:
            raise AppError(400, "O fechamento aceita no máximo 366 dias")
        chosen = self._chosen_closing_people(scope, end, data.get("employee_ids"))
        chosen_ids = {person.id for person in chosen}
        blocked = self._closing_conflict(scope.tenant_id, start, end, chosen_ids)
        if blocked:
            raise AppError(409, "Há pessoas que já estão em um fechamento deste período", blocked)
        row = self.repo.add(
            Closing(
                tenant_id=scope.tenant_id,
                year=start.year,
                month=start.month,
                starts_on=start,
                ends_on=end,
                status="open",
                note=self._note(data.get("note")),
                closed_at=None,
                closed_by_person_id=None,
            )
        )
        self.repo.add(
            ClosingEvent(
                tenant_id=scope.tenant_id,
                closing_id=row.id,
                kind="started",
                note=row.note,
                person_id=scope.person_id,
                created_at=self.clock(),
            )
        )
        for person in chosen:
            self.repo.add(
                ClosingMember(
                    tenant_id=scope.tenant_id,
                    closing_id=row.id,
                    employee_id=person.id,
                )
            )
        return self.get_closing(scope, row.id)

    def update_closing(self, scope: Scope, row_id: int, data: dict) -> dict:
        self._can_manage_period(scope)
        outer = self._scratch_scope()
        try:
            return self._update_closing(scope, row_id, data)
        finally:
            self._end_scratch(outer)

    def _update_closing(self, scope: Scope, row_id: int, data: dict) -> dict:
        row = self._row(Closing, scope, row_id)
        status = data["status"]
        previous = row.status
        if status == "closed":
            if row.status != "open":
                raise AppError(409, "Só um período aberto pode ser fechado")
            self._assert_can_close(scope, row.starts_on, row.ends_on, set(self.repo.member_ids(row.id)))
            if "note" in data:
                row.note = self._note(data.get("note"))
            row.status = "closed"
            row.closed_at = self.clock()
            row.closed_by_person_id = scope.person_id
            event_note = row.note
        elif status == "cancelled":
            if row.status != "closed":
                raise AppError(409, "Só um período fechado pode ser cancelado")
            event_note = self._required_note(data)
            row.note = event_note
            row.status = "cancelled"
            self.repo.delete_pins_for_closing(row.id)
            self.repo.delete_closing_entries(row.id)
        elif status == "open":
            if row.status not in {"closed", "cancelled"}:
                raise AppError(409, "Só um período fechado ou cancelado pode ser reaberto")
            event_note = self._required_note(data)
            row.note = event_note
            row.status = "open"
            row.closed_at = None
            row.closed_by_person_id = None
            self.repo.delete_pins_for_closing(row.id)
            self.repo.delete_closing_entries(row.id)
        else:
            raise AppError(400, "Situação inválida")
        self.repo.add(row)
        if status == "closed":
            self._pin_journeys(scope, row)
        self._forget_closing_cache()
        self.repo.add(
            ClosingEvent(
                tenant_id=scope.tenant_id,
                closing_id=row.id,
                kind={"closed": "closed", "cancelled": "cancelled", "open": "reopened"}[status],
                note=event_note,
                person_id=scope.person_id,
                created_at=self.clock(),
            )
        )
        self._audit(scope, None, "closing", row.id, previous, status, row.starts_on)
        if status in {"cancelled", "open"}:
            self._invalidate_files(scope, row.starts_on, row.ends_on)
        return self.get_closing(scope, row.id)

    def delete_closing(self, scope: Scope, row_id: int) -> None:
        self._can_manage_period(scope)
        row = self._row(Closing, scope, row_id)
        if row.status == "closed":
            raise AppError(409, "Período fechado permanece no histórico.")
        self.repo.delete_pins_for_closing(row.id)
        self.repo.delete_closing_entries(row.id)
        self.repo.delete_members_for_closing(row.id)
        for event in self.repo.closing_events_for([row.id]).get(row.id, []):
            self.repo.delete(event)
        self.repo.delete(row)

    def list_notices(self, scope: Scope, page: int, limit: int, equals: dict):
        self._known(scope)
        filters = dict(equals)
        if scope.role != "admin":
            filters["person_id"] = scope.person_id
        return self.repo.list_rows(
            Notice, scope.tenant_id, page=page, limit=limit, equals=filters, descending=True
        )

    def count_unread_notices(self, scope: Scope) -> int:
        self._known(scope)
        return self.repo.count_unread_notices(scope.tenant_id, scope.person_id)

    def get_notice(self, scope: Scope, row_id: int) -> Notice:
        row = self._row(Notice, scope, row_id)
        if scope.role != "admin" and row.person_id != scope.person_id:
            raise AppError(404, "Registro não encontrado")
        return row

    def refuse_notice_create(self, scope: Scope) -> None:
        self._known(scope)
        raise AppError(409, "Notificação é gerada pelo sistema.")

    def update_notice(self, scope: Scope, row_id: int, data: dict) -> Notice:
        row = self.get_notice(scope, row_id)
        if data.get("read") is True:
            row.read_at = self.clock()
        elif data.get("read") is False:
            row.read_at = None
        return self.repo.add(row)

    def delete_notice(self, scope: Scope, row_id: int) -> None:
        self.get_notice(scope, row_id)
        raise AppError(409, "Notificação gerada permanece no histórico.")

    def list_audits(self, scope: Scope, page: int, limit: int, equals: dict):
        self._staff(scope)
        return self.repo.list_rows(Audit, scope.tenant_id, page=page, limit=limit, equals=equals, descending=True)

    def get_audit(self, scope: Scope, row_id: int) -> Audit:
        self._staff(scope)
        return self._row(Audit, scope, row_id)

    def refuse_audit_write(self, scope: Scope) -> None:
        self._staff(scope)
        raise AppError(409, "Auditoria é gerada pelo sistema.")

    def dashboard(self, scope: Scope) -> dict:
        self._known(scope)
        tenant = self.repo.get_tenant(scope.tenant_id)
        if tenant is None:
            raise AppError(404, "Organização não encontrada")
        start, end = day_bounds(self.today())
        return {
            "active_employees": self.repo.count_active(scope.tenant_id, self.today()),
            "punches_today": self.repo.count_punches_between(scope.tenant_id, start, end),
            "pending_adjustments": self.repo.count_requests(scope.tenant_id, kind="adjustment", status="pending"),
            "pending_allowances": self.repo.count_requests(scope.tenant_id, kind="allowance", status="pending"),
            "pending_certificates": self.repo.count_requests(scope.tenant_id, kind="certificate", status="pending"),
            "pending_leaves": self.repo.count_requests(scope.tenant_id, kind="leave", status="pending"),
            "pending_vacations": self.repo.count_requests(scope.tenant_id, kind="vacation", status="pending"),
            "open_closings": self.repo.count_model(Closing, tenant_id=scope.tenant_id, status="open"),
            "employee_capacity": tenant.employee_capacity,
        }

    def payroll(self, scope: Scope, year: int, month: int) -> dict:
        self._staff(scope)
        start = date(year, month, 1)
        if month == 12:
            end = date(year, 12, 31)
        else:
            end = date(year, month + 1, 1) - timedelta(days=1)
        outer = self._scratch_scope()
        try:
            return {"year": year, "month": month, "items": self._payroll_items(scope, start, end)}
        finally:
            self._end_scratch(outer)

    def list_fiscal_files(self, scope: Scope, page: int, limit: int, equals: dict):
        self._can_manage_period(scope)
        return self.repo.list_fiscal_files(scope.tenant_id, page=page, limit=limit, equals=equals)

    def get_fiscal_file(self, scope: Scope, row_id: int) -> FiscalFile:
        self._can_manage_period(scope)
        return self._row(FiscalFile, scope, row_id)

    def list_payroll_events(self, scope: Scope, page: int, limit: int, equals: dict):
        self._can_manage_period(scope)
        return self.repo.list_rows(
            PayrollEvent, scope.tenant_id, page=page, limit=limit, equals=equals, descending=False
        )

    def get_payroll_event(self, scope: Scope, row_id: int) -> PayrollEvent:
        self._can_manage_period(scope)
        return self._row(PayrollEvent, scope, row_id)

    def create_payroll_event(self, scope: Scope, data: dict) -> PayrollEvent:
        self._can_manage_period(scope)
        payload = self._payroll_event_payload(scope, data, current=None)
        return self.repo.add(PayrollEvent(tenant_id=scope.tenant_id, **payload))

    def update_payroll_event(self, scope: Scope, row_id: int, data: dict) -> PayrollEvent:
        self._can_manage_period(scope)
        row = self.get_payroll_event(scope, row_id)
        payload = self._payroll_event_payload(scope, data, current=row)
        for key, value in payload.items():
            setattr(row, key, value)
        return self.repo.add(row)

    def delete_payroll_event(self, scope: Scope, row_id: int) -> None:
        self._can_manage_period(scope)
        self.repo.delete(self.get_payroll_event(scope, row_id))

    def create_fiscal_file(self, scope: Scope, data: dict) -> FiscalFile:
        self._can_manage_period(scope)
        kind = data["kind"]
        start, end = self._closing_bounds(data)
        max_days = settings.FISCAL_MAX_DAYS
        if (end - start).days + 1 > max_days:
            raise AppError(400, f"O arquivo aceita no máximo {max_days} dias")
        return self._build_fiscal_file(scope, data, kind, start, end)

    def enqueue_fiscal_file(self, scope: Scope, data: dict) -> FiscalJob:
        self._can_manage_period(scope)
        kind = data["kind"]
        if kind not in {"afd", "aej", "payroll"}:
            raise AppError(400, "Tipo de arquivo inválido")
        start, end = self._closing_bounds(data)
        max_days = settings.FISCAL_MAX_DAYS
        if (end - start).days + 1 > max_days:
            raise AppError(400, f"O arquivo aceita no máximo {max_days} dias")
        time_format = data.get("time_format")
        if kind == "payroll":
            events = self._active_payroll_events(scope)
            if not events:
                raise AppError(400, "Configure ao menos um evento da folha.")
            time_format = time_format or "centesimal"
            if time_format not in {"centesimal", "sexagesimal"}:
                raise AppError(400, "Formato de hora inválido.")
        job = self.repo.add(
            FiscalJob(
                tenant_id=scope.tenant_id,
                kind=kind,
                starts_on=start,
                ends_on=end,
                time_format=time_format,
                status="pending",
                fiscal_file_id=None,
                error=None,
                created_by_person_id=scope.person_id,
                created_at=self.clock(),
                started_at=None,
                finished_at=None,
            )
        )
        if self.inline_jobs:
            self.execute_fiscal_job(job.id)
            return self.get_fiscal_job(scope, job.id)
        self._spawn_fiscal_job(job.id)
        return job

    def get_fiscal_job(self, scope: Scope, job_id: int) -> FiscalJob:
        self._can_manage_period(scope)
        row = self.repo.get_row(FiscalJob, scope.tenant_id, job_id)
        if row is None:
            raise AppError(404, "Registro não encontrado")
        return row

    def _spawn_fiscal_job(self, job_id: int) -> None:
        def run() -> None:
            from app.db.session import SessionLocal

            db = SessionLocal()
            try:
                service = WorkforceService(
                    WorkforceRepository(db),
                    authenticator=AuthenticatorClient(),
                    today=self.today,
                    clock=self.clock,
                    embedder=self.embedder,
                    files=self.files,
                    inline_jobs=True,
                )
                service.execute_fiscal_job(job_id)
                db.commit()
            except Exception:
                db.rollback()
                logger.exception("fiscal job %s failed", job_id)
            finally:
                db.close()

        threading.Thread(target=run, name=f"fiscal-job-{job_id}", daemon=True).start()

    def execute_fiscal_job(self, job_id: int) -> FiscalJob:
        row = self.repo.fiscal_job(job_id)
        if row is None:
            raise AppError(404, "Registro não encontrado")
        if row.status in {"done", "running"}:
            return row
        row.status = "running"
        row.started_at = self.clock()
        row.error = None
        self.repo.add(row)
        scope = Scope(person_id=row.created_by_person_id, tenant_id=row.tenant_id, role="admin")
        payload = {
            "kind": row.kind,
            "starts_on": row.starts_on,
            "ends_on": row.ends_on,
            "time_format": row.time_format,
        }
        try:
            created = self._build_fiscal_file(scope, payload, row.kind, row.starts_on, row.ends_on)
            row.fiscal_file_id = created.id
            row.status = "done"
            row.finished_at = self.clock()
        except AppError as error:
            row.status = "failed"
            row.error = error.message
            row.finished_at = self.clock()
        except Exception as error:
            row.status = "failed"
            row.error = str(error)
            row.finished_at = self.clock()
            logger.exception("fiscal job %s crashed", job_id)
        self.repo.add(row)
        return row

    def _build_fiscal_file(self, scope: Scope, data: dict, kind: str, start: date, end: date) -> FiscalFile:
        tenant = self.repo.get_tenant(scope.tenant_id)
        employer = employer_from(getattr(tenant, "document", None), getattr(tenant, "name", None))
        generated = self.clock()
        outer = self._scratch_scope()
        try:
            return self._create_fiscal_file(scope, data, kind, start, end, employer, generated)
        finally:
            self._end_scratch(outer)

    def _create_fiscal_file(self, scope: Scope, data: dict, kind: str, start: date, end: date, employer, generated: datetime) -> FiscalFile:
        if kind == "afd":
            content = render_afd(
                employer=employer,
                starts_on=start,
                ends_on=end,
                generated_at=generated,
                punches=self._afd_punches(scope, start, end),
            )
        elif kind == "aej":
            employees, punches, absences = self._aej_payload(scope, start, end)
            content = render_aej(
                employer=employer,
                starts_on=start,
                ends_on=end,
                generated_at=generated,
                employees=employees,
                punches=punches,
                absences=absences,
            )
        elif kind == "payroll":
            events = self._active_payroll_events(scope)
            if not events:
                raise AppError(400, "Configure ao menos um evento da folha.")
            time_format = data.get("time_format") or "centesimal"
            if time_format not in {"centesimal", "sexagesimal"}:
                raise AppError(400, "Formato de hora inválido.")
            content = render_payroll(
                payroll_lines(
                    items=self._payroll_items(scope, start, end),
                    events=events,
                    time_format=time_format,
                )
            )
        else:
            raise AppError(400, "Tipo de arquivo inválido")
        row = self.repo.add(
            FiscalFile(
                tenant_id=scope.tenant_id,
                kind=kind,
                starts_on=start,
                ends_on=end,
                content=content,
                valid=True,
                invalidated_at=None,
                created_by_person_id=scope.person_id,
                created_at=generated,
            )
        )
        self._audit(scope, None, "fiscal_file", row.id, None, kind, start)
        return row

    def import_afd(self, scope: Scope, content: str) -> dict:
        self._can_manage_period(scope)
        by_cpf = self.repo.employees_cpf_map(scope.tenant_id)
        created = 0
        ignored = 0
        blocked = 0
        for cpf, moment in parse_afd(content):
            employee = by_cpf.get(cpf)
            if employee is None:
                blocked += 1
                continue
            if self.repo.punch_at(scope.tenant_id, employee.id, moment) is not None:
                ignored += 1
                continue
            try:
                self._insert_afd_punch(scope, employee, moment)
            except AppError as error:
                if error.status_code in {400, 409}:
                    blocked += 1
                    continue
                raise
            created += 1
        return {"created": created, "ignored": ignored, "blocked": blocked}

    def _insert_afd_punch(self, scope: Scope, employee: Employee, moment: datetime) -> Punch:
        occurred = assert_aware(moment)
        assert_not_future(occurred, self.today())
        self._assert_working(scope, employee)
        self._assert_open(scope.tenant_id, self._punch_day(occurred), employee.id)
        row = self.repo.add(
            Punch(
                tenant_id=scope.tenant_id,
                employee_id=employee.id,
                occurred_at=occurred,
                source="afd",
                request_id=None,
                reason_id=None,
                note=None,
                valid=True,
                voided_at=None,
                channel=None,
                qr_key=None,
                selfie_key=None,
                face_key=None,
                client_event_id=None,
                created_at=self.clock(),
            )
        )
        self._audit(scope, employee.id, "punch", row.id, None, "Marcação", self._punch_day(occurred))
        return row

    def refuse_fiscal_file_change(self, scope: Scope, row_id: int) -> None:
        self.get_fiscal_file(scope, row_id)
        raise AppError(409, "Arquivo fiscal permanece no histórico.")

    def calculations(self, scope: Scope, employee_id: int, starts_on: date, ends_on: date) -> dict:
        self._known(scope)
        if ends_on < starts_on:
            raise AppError(400, "O fim precisa ser igual ou posterior ao início")
        if (ends_on - starts_on).days + 1 > 62:
            raise AppError(400, "A apuração aceita no máximo 62 dias")
        employee = self._employee(scope, employee_id)
        self._visible(scope, employee.id)
        outer = self._scratch_scope()
        try:
            calc_from = starts_on
            if employee.hour_bank:
                calc_from = self._bank_calc_from(scope, employee, starts_on, ends_on)
            covered = self._day_results(scope, employee, calc_from, ends_on)
            items = [item for item in covered if starts_on <= item["work_date"] <= ends_on]
            balance = None
            if employee.hour_bank:
                balances = self._balances_on(scope, employee, [item["work_date"] for item in items], covered)
                for item in items:
                    item["balance_minutes"] = balances.get(item["work_date"], 0)
                balance = balances.get(ends_on, 0)
            else:
                for item in items:
                    item["balance_minutes"] = None
        finally:
            self._end_scratch(outer)
        return {
            "employee_id": employee.id,
            "starts_on": starts_on,
            "ends_on": ends_on,
            "balance_minutes": balance,
            "items": items,
        }

    def report_catalog(self, scope: Scope, page: int, limit: int) -> tuple[list[dict], int]:
        self._can_manage_period(scope)
        rows = [{"kind": kind, "name": name} for kind, name in REPORTS]
        start = (page - 1) * limit
        return rows[start : start + limit], len(rows)

    def report(
        self,
        scope: Scope,
        kind: str,
        starts_on: date,
        ends_on: date,
        employee_id: int | None,
        page: int,
        limit: int,
        filters: dict | None = None,
        *,
        export: bool = False,
    ) -> dict:
        self._can_manage_period(scope)
        if kind == "people":
            kind = "employees"
        name = REPORT_NAMES.get(kind)
        if name is None:
            raise AppError(400, "Relatório inválido")
        if ends_on < starts_on:
            raise AppError(400, "O fim precisa ser igual ou posterior ao início")
        if kind == "employees" and ends_on != starts_on:
            raise AppError(400, "O relatório de funcionários pede um dia")
        if (ends_on - starts_on).days + 1 > 366:
            raise AppError(400, "O relatório aceita no máximo 366 dias")
        outer = self._scratch_scope()
        try:
            chosen = dict(filters or {})
            people, places, situation, category_values = self._report_people_filtered(
                scope, kind, starts_on, ends_on, employee_id, chosen
            )
            total_people = len(people)
            if export:
                page_people = people
                current = 1
                size = total_people or 1
            else:
                current = page
                size = limit
                start = (current - 1) * size
                page_people = people[start : start + size]
            include_closings = employee_id is None and (export or current == 1)
            lines = self._report_lines_for(
                scope,
                kind,
                starts_on,
                ends_on,
                page_people,
                chosen,
                places,
                situation,
                category_values,
                include_closings=include_closings,
            )
            return {
                "kind": kind,
                "name": name,
                "starts_on": starts_on,
                "ends_on": ends_on,
                "items": lines,
                "total": total_people,
                "page": current,
                "limit": size,
            }
        finally:
            self._end_scratch(outer)

    def _report_people_filtered(
        self,
        scope: Scope,
        kind: str,
        starts_on: date,
        ends_on: date,
        employee_id: int | None,
        filters: dict,
    ) -> tuple[list[Employee], dict[str, set[int]], str | None, list[int]]:
        category_values = self._id_list(filters.pop("category_value_id", None))
        filters.pop("category_id", None)
        places, situation = self._place_sets(filters)
        matched = self._place_people(scope, starts_on, ends_on, places, situation)
        if category_values:
            by_category = self._category_value_ids(scope, category_values, starts_on)
            if ends_on != starts_on:
                cursor = starts_on + timedelta(days=1)
                while cursor <= ends_on:
                    by_category |= self._category_value_ids(scope, category_values, cursor)
                    cursor += timedelta(days=1)
            matched = by_category if matched is None else matched & by_category
        people = self._report_people(scope, employee_id, matched)
        if kind == "employees":
            if "full_name" in filters:
                needle = str(filters["full_name"]).casefold()
                people = [person for person in people if needle in person.full_name.casefold()]
            if "cpf" in filters:
                digits = normalize_cpf(str(filters["cpf"]))
                people = [person for person in people if person.cpf == digits]
            if "person_id" in filters:
                person_id = int(filters["person_id"])
                people = [person for person in people if person.person_id == person_id]
        return people, places, situation, category_values

    def _report_lines_for(
        self,
        scope: Scope,
        kind: str,
        starts_on: date,
        ends_on: date,
        people: list[Employee],
        filters: dict,
        places: dict[str, set[int]],
        situation: str | None,
        category_values: list[int],
        *,
        include_closings: bool = False,
    ) -> list[dict]:
        if kind == "employees":
            lines = self._employee_lines_for(scope, starts_on, people, filters)
        else:
            lines = self._kind_lines_for(
                scope, kind, starts_on, ends_on, people, include_closings=include_closings
            )
        if places or situation:
            lines = self._filter_lines_places(lines, places, situation)
        if category_values:
            matched: dict[date, set[int]] = {}
            kept = []
            for line in lines:
                day = line["occurred_on"]
                if day not in matched:
                    matched[day] = self._category_value_ids(scope, category_values, day)
                if line.get("employee_id") in matched[day]:
                    kept.append(line)
            lines = kept
        return sorted(lines, key=lambda item: (item["occurred_on"], item["full_name"] or "", item["title"], item["detail"]))

    def _kind_lines_for(
        self,
        scope: Scope,
        kind: str,
        starts_on: date,
        ends_on: date,
        people: list[Employee],
        *,
        include_closings: bool = False,
    ) -> list[dict]:
        if kind == "punch":
            return self._punch_lines(scope, people, starts_on, ends_on)
        if kind == "journey":
            return self._journey_lines(scope, people, starts_on, ends_on)
        if kind == "hour_bank":
            return self._bank_lines(scope, people, starts_on, ends_on)
        if kind == "occurrence":
            return self._occurrence_lines(scope, people, starts_on, ends_on)
        if kind == "marking":
            return self._marking_lines(scope, people, starts_on, ends_on)
        return self._management_lines(scope, people, starts_on, ends_on, include_closings)

    def _place_sets(self, filters: dict) -> tuple[dict[str, set[int]], str | None]:
        found: dict[str, set[int]] = {}
        if "union_id" in filters and "norm_id" not in filters:
            filters["norm_id"] = filters.pop("union_id")
        else:
            filters.pop("union_id", None)
        for key, kind in (
            ("unit_id", "unit"),
            ("team_id", "team"),
            ("job_id", "job"),
            ("journey_id", "journey"),
            ("norm_id", "norm"),
        ):
            ids = self._id_list(filters.pop(key, None))
            if ids:
                found[kind] = set(ids)
        situation = str(filters.pop("situation", "") or "").strip()
        if situation and situation not in STATUS_LABELS:
            raise AppError(400, "Situação inválida")
        return found, situation or None

    def _place_people(
        self,
        scope: Scope,
        starts_on: date,
        ends_on: date,
        places: dict[str, set[int]],
        situation: str | None,
    ) -> set[int] | None:
        matched: set[int] | None = None
        for kind, ids in places.items():
            found = self.repo.employee_ids_overlapping(
                scope.tenant_id, kind, starts_on, ends_on, reference_ids=ids
            )
            matched = found if matched is None else matched & found
        if situation is not None:
            found = self.repo.employee_ids_overlapping(
                scope.tenant_id, "status", starts_on, ends_on, label=situation
            )
            matched = found if matched is None else matched & found
        return matched

    def _filter_lines_places(
        self,
        lines: list[dict],
        places: dict[str, set[int]],
        situation: str | None,
    ) -> list[dict]:
        if not lines:
            return []
        by_day: dict[date, list[dict]] = {}
        for line in lines:
            by_day.setdefault(line["occurred_on"], []).append(line)
        kept: list[dict] = []
        for day, day_lines in by_day.items():
            ids = [line["employee_id"] for line in day_lines if line.get("employee_id") is not None]
            labels = self.repo.labels_on(ids, day)
            for line in day_lines:
                employee_id = line.get("employee_id")
                if employee_id is None:
                    continue
                current = labels.get(employee_id, {})
                if any(
                    current.get(kind) is None or current[kind].reference_id not in ids_set
                    for kind, ids_set in places.items()
                ):
                    continue
                if situation is not None:
                    status = current.get("status")
                    if status is None or status.label != situation:
                        continue
                kept.append(line)
        return kept

    def _on_places(self, employee_id: int | None, day: date, places: dict[str, set[int]], situation: str | None = None) -> bool:
        if employee_id is None:
            return False
        labels = self.repo.labels_on([employee_id], day).get(employee_id, {})
        for kind, ids in places.items():
            current = labels.get(kind)
            if current is None or current.reference_id not in ids:
                return False
        if situation is None:
            return True
        current = labels.get("status")
        return current is not None and current.label == situation

    def _marking_lines(self, scope: Scope, people: list[Employee], starts_on: date, ends_on: date) -> list[dict]:
        start_at, _ignored = day_bounds(starts_on)
        _start, end_at = day_bounds(ends_on)
        lines = []
        for employee in people:
            for punch in self.repo.punches_between(scope.tenant_id, employee.id, start_at, end_at):
                local = punch.occurred_at.astimezone(BR)
                state = "vale" if punch.valid else "deixou de valer"
                lines.append(
                    {
                        "employee_id": employee.id,
                        "full_name": employee.full_name,
                        "occurred_on": local.date(),
                        "title": local.strftime("%H:%M"),
                        "detail": f"{state}; {punch.source}",
                    }
                )
        return lines

    def _report_people(
        self,
        scope: Scope,
        employee_id: int | None,
        matched: set[int] | None = None,
    ) -> list[Employee]:
        ids = self._visible_ids(scope)
        if employee_id is not None:
            self._visible(scope, employee_id)
            ids = [employee_id]
        if matched is not None:
            if ids is None:
                ids = list(matched)
            else:
                ids = [item for item in ids if item in matched]
        people: list[Employee] = []
        page = 1
        while True:
            rows, total = self.repo.list_employees(scope.tenant_id, ids=ids, page=page, limit=100, equals={})
            people.extend(rows)
            if not rows or page * 100 >= total:
                people.sort(key=lambda item: (item.full_name.casefold(), item.id))
                return people
            page += 1

    def _punch_lines(self, scope: Scope, people: list[Employee], starts_on: date, ends_on: date) -> list[dict]:
        finish = ends_on if ends_on <= self.today() else self.today()
        if finish < starts_on:
            return []
        lines = []
        for employee in people:
            start = max(starts_on, employee.admission_date)
            if start > finish:
                continue
            for day in self._day_results(scope, employee, start, finish):
                lines.append(
                    {
                        "employee_id": employee.id,
                        "full_name": employee.full_name,
                        "occurred_on": day["work_date"],
                        "title": "Ponto",
                        "detail": (
                            f"trabalhadas {show_duration(day['worked_minutes'])}; "
                            f"hora extra {show_duration(day['overtime_minutes'])}; "
                            f"adicional noturno {show_duration(day['night_additional_minutes'])}; "
                            f"falta {show_duration(day['shortage_minutes'])}"
                        ),
                    }
                )
        return lines

    def _journey_lines(self, scope: Scope, people: list[Employee], starts_on: date, ends_on: date) -> list[dict]:
        lines = []
        for employee in people:
            for vigency in self.repo.vigencies_between(scope.tenant_id, employee.id, "journey", starts_on, ends_on):
                journey = (
                    self.repo.get_row(Journey, scope.tenant_id, vigency.reference_id) if vigency.reference_id else None
                )
                spans = []
                if journey is not None:
                    for start, end in (
                        (journey.morning_start, journey.morning_end),
                        (journey.afternoon_start, journey.afternoon_end),
                    ):
                        if start and end:
                            spans.append(f"{start}-{end}")
                end_label = vigency.valid_to.isoformat() if vigency.valid_to else "atual"
                clocks = "; ".join(spans)
                period = f"vigência {vigency.valid_from.isoformat()} a {end_label}"
                lines.append(
                    {
                        "employee_id": employee.id,
                        "full_name": employee.full_name,
                        "occurred_on": vigency.valid_from,
                        "title": journey.name if journey is not None else vigency.label,
                        "detail": f"{clocks}; {period}" if clocks else period,
                    }
                )
        return lines

    def _bank_lines(self, scope: Scope, people: list[Employee], starts_on: date, ends_on: date) -> list[dict]:
        finish = ends_on if ends_on <= self.today() else self.today()
        if finish < starts_on:
            return []
        lines = []
        for employee in people:
            if not employee.hour_bank:
                continue
            start = max(starts_on, employee.admission_date)
            period_days: list[dict] = []
            movement = 0
            if start <= finish:
                period_days = self._day_results(scope, employee, start, finish)
                movement = sum(day["bank_minutes"] for day in period_days)
            projection = project_balance(self._bank_events(scope, employee, finish, period_days), finish)
            detail = f"saldo {show_duration(projection['balance_minutes'])}; movimento {show_duration(movement)}"
            if projection["warning"]:
                detail = f"{detail}; {projection['warning']}"
            lines.append(
                {
                    "employee_id": employee.id,
                    "full_name": employee.full_name,
                    "occurred_on": finish,
                    "title": "Saldo",
                    "detail": detail,
                }
            )
            for entry in self.repo.hour_bank_entries_for(scope.tenant_id, employee.id):
                if starts_on <= entry.entry_on <= ends_on:
                    entry_detail = show_duration(entry.minutes)
                    if entry.effect:
                        entry_detail = f"{entry_detail}; {entry.effect}"
                    lines.append(
                        {
                            "employee_id": employee.id,
                            "full_name": employee.full_name,
                            "occurred_on": entry.entry_on,
                            "title": ENTRY_TITLES.get(entry.kind, entry.kind),
                            "detail": entry_detail,
                        }
                    )
        return lines

    def _occurrence_lines(self, scope: Scope, people: list[Employee], starts_on: date, ends_on: date) -> list[dict]:
        lines = []
        for employee in people:
            for row in self.repo.occurrences_between(scope.tenant_id, employee.id, starts_on, ends_on):
                detail = row.source
                if row.warning:
                    detail = f"{detail}; {row.warning}"
                lines.append(
                    {
                        "employee_id": employee.id,
                        "full_name": employee.full_name,
                        "occurred_on": row.starts_on,
                        "title": OCCURRENCE_TITLES.get(row.kind, row.kind),
                        "detail": detail,
                    }
                )
        return lines

    def _management_lines(
        self, scope: Scope, people: list[Employee], starts_on: date, ends_on: date, include_closings: bool
    ) -> list[dict]:
        allowed = {person.id for person in people}
        lines = []
        if include_closings:
            page = 1
            while True:
                rows, total = self.repo.list_rows(
                    Closing, scope.tenant_id, page=page, limit=100, equals={}, descending=False
                )
                for closing in rows:
                    if closing.starts_on <= ends_on and closing.ends_on >= starts_on:
                        lines.append(
                            {
                                "employee_id": None,
                                "full_name": None,
                                "occurred_on": closing.starts_on,
                                "title": "Fechamento",
                                "detail": (
                                    f"{CLOSING_STATUS.get(closing.status, closing.status)} "
                                    f"de {closing.starts_on.isoformat()} a {closing.ends_on.isoformat()}"
                                ),
                            }
                        )
                if not rows or page * 100 >= total:
                    break
                page += 1
        page = 1
        employee_ids = None if self._visible_ids(scope) is None else list(allowed)
        while True:
            rows, total = self.repo.list_rows(
                TimeRequest,
                scope.tenant_id,
                page=page,
                limit=100,
                equals={},
                descending=False,
                employee_ids=employee_ids,
            )
            for request in rows:
                if request.employee_id not in allowed:
                    continue
                created = request.created_at.astimezone(BR).date()
                decided = request.decided_at.astimezone(BR).date() if request.decided_at else None
                if starts_on <= created <= ends_on:
                    occurred = created
                elif decided is not None and starts_on <= decided <= ends_on:
                    occurred = decided
                else:
                    continue
                person = next((item for item in people if item.id == request.employee_id), None)
                lines.append(
                    {
                        "employee_id": request.employee_id,
                        "full_name": person.full_name if person is not None else None,
                        "occurred_on": occurred,
                        "title": f"Solicitação de {REQUEST_TITLES.get(request.kind, request.kind).lower()}",
                        "detail": REQUEST_STATUS.get(request.status, request.status),
                    }
                )
            if not rows or page * 100 >= total:
                break
            page += 1
        return lines

    def _day_results(self, scope: Scope, employee: Employee, starts_on: date, ends_on: date, *, with_punches: bool = False) -> list[dict]:
        if self._scratch is not None:
            return self._day_results_loaded(scope, employee, starts_on, ends_on, with_punches=with_punches)
        self._scratch = _CalcScratch()
        try:
            return self._day_results_loaded(scope, employee, starts_on, ends_on, with_punches=with_punches)
        finally:
            self._scratch = None

    def _day_results_loaded(self, scope: Scope, employee: Employee, starts_on: date, ends_on: date, *, with_punches: bool = False) -> list[dict]:
        vigencies = self.repo.vigencies_between(scope.tenant_id, employee.id, "journey", starts_on, ends_on)
        span_start, span_end = self._result_span(scope, vigencies, starts_on, ends_on)
        start, _ignored = day_bounds(span_start - timedelta(days=1))
        _start, window_end = day_bounds(span_end + timedelta(days=1))
        punches = self.repo.valid_punches_between(scope.tenant_id, employee.id, start, window_end)
        by_day: dict[date, list] = {}
        for punch in punches:
            by_day.setdefault(punch.occurred_at.astimezone(BR).date(), []).append(punch)
        for rows in by_day.values():
            rows.sort(key=lambda row: (row.occurred_at, row.id))
        occurrences = self.repo.occurrences_between(scope.tenant_id, employee.id, span_start, span_end)
        holiday_key = (scope.tenant_id, span_start, span_end)
        scratch = self._scratch
        if scratch is not None and holiday_key in scratch.holidays:
            holidays = scratch.holidays[holiday_key]
        else:
            holidays = {row.holiday_date for row in self.repo.holidays_between(scope.tenant_id, span_start, span_end)}
            if scratch is not None:
                scratch.holidays[holiday_key] = holidays
        journeys: dict[int, Journey] = {}
        rule_on = self._norm_rules(scope, employee.id, span_start - timedelta(days=1), span_end)
        consumed: set[int] = set()
        previous = span_start - timedelta(days=1)
        if len(by_day.get(previous, [])) % 2 == 1:
            self._take_night_exit(by_day, previous, consumed, self._night_limit(scope, vigencies, journeys, previous, rule_on(previous)["night_end"]))
        items = []
        current = span_start
        while current <= span_end:
            vigency = self._vigency_on(vigencies, current)
            journey = None if vigency is None else self._journey_row(scope, journeys, vigency.reference_id)
            spec = None if journey is None else self._spec_on(scope.tenant_id, journey, current)
            plan = None
            if spec is not None and vigency is not None:
                anchor_day = vigency.cycle_day or vigency.valid_from.isoweekday()
                plan = schedule_of(spec, current, vigency.valid_from, anchor_day)
            calendar = by_day.get(current, [])
            working = [row for row in calendar if row.id not in consumed]
            moments = [row.occurred_at for row in working]
            if len(working) % 2 == 1:
                exit_at = self._take_night_exit(by_day, current, consumed, self._night_limit_for(plan, rule_on(current)["night_end"]))
                if exit_at is not None:
                    moments.append(exit_at)
            covering = [row for row in occurrences if row.starts_on <= current <= row.ends_on]
            holiday = current in holidays
            vacation = any(row.kind == "vacations" for row in covering)
            leave = any(row.kind == "leaves" for row in covering)
            full_allowance = any(self._full_day(row) for row in covering if row.kind == "allowances")
            full_certificate = any(self._full_day(row) for row in covering if row.kind == "certificates")
            item = settle_day(
                work_date=current,
                moments=moments,
                counted=len(calendar),
                journey=journey,
                holiday=holiday,
                vacation=vacation,
                leave=leave,
                full_allowance=full_allowance,
                full_certificate=full_certificate,
                extra_warnings=[row.warning for row in covering if row.warning],
                uses_bank=bool(employee.hour_bank),
                plan=plan,
                rule=rule_on(current),
            )
            item["mode"] = None if spec is None else spec.kind
            item["excused"] = holiday or vacation or leave or full_allowance or full_certificate
            item["vigency_id"] = None if vigency is None else vigency.id
            item["weekly_minutes"] = None if spec is None else spec.weekly_minutes
            item["punches"] = [moment.astimezone(BR).strftime("%H:%M") for moment in moments]
            items.append(item)
            current += timedelta(days=1)
        self._settle_carga(employee, items)
        visible = [item for item in items if starts_on <= item["work_date"] <= ends_on]
        public = (
            "work_date",
            "contracted_minutes",
            "worked_minutes",
            "delay_minutes",
            "overtime_minutes",
            "shortage_minutes",
            "bank_minutes",
            "night_minutes",
            "night_additional_minutes",
            "absence",
            "incomplete",
            "holiday",
            "warnings",
            "first_entry_at",
            "last_exit_at",
        )
        rows = []
        for item in visible:
            payload = {key: item[key] for key in public}
            if with_punches:
                payload["punches"] = item["punches"]
            rows.append(payload)
        return rows

    def hour_bank(self, scope: Scope, employee_id: int) -> dict:
        self._known(scope)
        employee = self._employee(scope, employee_id)
        self._visible(scope, employee.id)
        return {"employee_id": employee.id, **self._project_hour_bank(scope, employee)}

    def list_hour_bank_entries(self, scope: Scope, page: int, limit: int, equals: dict):
        return self._scoped_list(scope, HourBankEntry, page, limit, equals)

    def get_hour_bank_entry(self, scope: Scope, row_id: int) -> HourBankEntry:
        row = self._row(HourBankEntry, scope, row_id)
        self._visible(scope, row.employee_id)
        return row

    def create_hour_bank_entry(self, scope: Scope, data: dict) -> HourBankEntry:
        self._known(scope)
        employee = self._employee(scope, int(data["employee_id"]))
        self._can_launch(scope, employee)
        if not employee.hour_bank:
            raise AppError(409, "Este funcionário não usa banco de horas")
        kind = data["kind"]
        entry_on = data.get("entry_on") or self.today()
        if entry_on > self.today():
            raise AppError(400, "A data não pode ser futura")
        self._assert_open(scope.tenant_id, entry_on, employee.id)
        minutes, effect = self._hour_bank_amounts(scope, employee, kind, data.get("minutes"), entry_on, None)
        row = self.repo.add(
            HourBankEntry(
                tenant_id=scope.tenant_id,
                employee_id=employee.id,
                kind=kind,
                minutes=minutes,
                effect=effect,
                note=self._note(data.get("note")),
                entry_on=entry_on,
                closing_id=None,
                created_by_person_id=scope.person_id,
                created_at=self.clock(),
            )
        )
        return row

    def update_hour_bank_entry(self, scope: Scope, row_id: int, data: dict) -> HourBankEntry:
        row = self.get_hour_bank_entry(scope, row_id)
        employee = self._employee(scope, row.employee_id)
        self._can_launch(scope, employee)
        if not employee.hour_bank:
            raise AppError(409, "Este funcionário não usa banco de horas")
        if row.closing_id is not None:
            raise AppError(409, "Altere este lançamento pelo fechamento")
        entry_on = data.get("entry_on") or row.entry_on
        if entry_on > self.today():
            raise AppError(400, "A data não pode ser futura")
        self._assert_open(scope.tenant_id, row.entry_on, employee.id)
        self._assert_open(scope.tenant_id, entry_on, employee.id)
        minutes, effect = self._hour_bank_amounts(scope, employee, data["kind"], data.get("minutes"), entry_on, {row.id})
        row.kind = data["kind"]
        row.minutes = minutes
        row.effect = effect
        row.note = self._note(data.get("note"))
        row.entry_on = entry_on
        return self.repo.add(row)

    def delete_hour_bank_entry(self, scope: Scope, row_id: int) -> None:
        row = self.get_hour_bank_entry(scope, row_id)
        employee = self._employee(scope, row.employee_id)
        self._can_launch(scope, employee)
        if row.closing_id is not None:
            raise AppError(409, "Altere este lançamento pelo fechamento")
        self._assert_open(scope.tenant_id, row.entry_on, employee.id)
        self.repo.delete(row)

    def _hour_bank_amounts(
        self,
        scope: Scope,
        employee: Employee,
        kind: str,
        raw,
        entry_on: date,
        exclude_ids: set[int] | None,
    ) -> tuple[int, str | None]:
        if kind == "settlement":
            balance = self._signed_balance(scope, employee, entry_on, exclude_ids)
            if balance == 0:
                raise AppError(409, "O saldo já está zerado")
            return abs(balance), "debit" if balance > 0 else "credit"
        if kind == "balance":
            if raw is None:
                raise AppError(400, "Informe o saldo")
            target = int(raw)
            return abs(target), "debit" if target < 0 else "credit"
        if raw is None or int(raw) <= 0:
            raise AppError(400, "Informe os minutos")
        return int(raw), None

    def _signed_balance(self, scope: Scope, employee: Employee, day: date, exclude_ids: set[int] | None) -> int:
        events = self._bank_events(scope, employee, day)
        if exclude_ids:
            events = [event for event in events if event[1] not in exclude_ids]
        return project_balance(events, day)["balance_minutes"]

    def _payroll_items(self, scope: Scope, starts_on: date, ends_on: date) -> list[dict]:
        finish = ends_on if ends_on <= self.today() else self.today()
        counts: dict[int, int] = {}
        if finish >= starts_on:
            start_at, _ignored = day_bounds(starts_on)
            _start, end_at = day_bounds(finish)
            counts = self.repo.punch_counts(scope.tenant_id, start_at, end_at)
        items = []
        page = 1
        while True:
            rows, total = self.repo.list_employees(scope.tenant_id, ids=None, page=page, limit=100, equals={})
            items.extend(self._payroll_item(scope, row, starts_on, finish, counts) for row in rows)
            if page * 100 >= total or not rows:
                break
            page += 1
        return items

    def _payroll_item(self, scope: Scope, employee: Employee, starts_on: date, finish: date, counts: dict[int, int]) -> dict:
        punch_count = counts.get(employee.id, 0) if finish >= starts_on else 0
        worked = overtime = night = shortage = balance = 0
        absence_days = allowance_days = vacation_days = leave_days = certificate_days = 0
        period_days: list[dict] = []
        if finish >= starts_on and employee.admission_date <= finish:
            day_start = employee.admission_date if employee.admission_date > starts_on else starts_on
            period_days = self._day_results(scope, employee, day_start, finish)
            for day in period_days:
                worked += day["worked_minutes"]
                overtime += day["overtime_minutes"]
                night += day["night_additional_minutes"]
                shortage += day["shortage_minutes"]
                if day.get("absence"):
                    absence_days += 1
            for row in self.repo.occurrences_between(scope.tenant_id, employee.id, starts_on, finish):
                span_start = row.starts_on if row.starts_on > starts_on else starts_on
                span_end = row.ends_on if row.ends_on < finish else finish
                if span_end < span_start:
                    continue
                days = (span_end - span_start).days + 1
                if row.kind == "allowances":
                    allowance_days += days
                elif row.kind == "vacations":
                    vacation_days += days
                elif row.kind == "leaves":
                    leave_days += days
                elif row.kind == "certificates":
                    certificate_days += days
            if employee.hour_bank:
                balance = project_balance(self._bank_events(scope, employee, finish, period_days), finish)["balance_minutes"]
        return {
            "employee_id": employee.id,
            "full_name": employee.full_name,
            "cpf": employee.cpf,
            "registration_number": employee.registration_number,
            "punch_count": punch_count,
            "worked_minutes": worked,
            "overtime_minutes": overtime,
            "night_additional_minutes": night,
            "shortage_minutes": shortage,
            "balance_minutes": balance,
            "absence_days": absence_days,
            "allowance_days": allowance_days,
            "vacation_days": vacation_days,
            "leave_days": leave_days,
            "certificate_days": certificate_days,
        }

    def _payroll_event_payload(self, scope: Scope, data: dict, current: PayrollEvent | None) -> dict:
        payload = {}
        if current is None or "system_event" in data:
            event = str(data.get("system_event") or "").strip()
            if event not in PAYROLL_SYSTEM_EVENTS:
                raise AppError(400, "Evento da folha inválido.")
            payload["system_event"] = event
        if current is None or "external_code" in data:
            code = str(data.get("external_code") or "").strip()
            if not code:
                raise AppError(400, "Informe o código do evento.")
            payload["external_code"] = code
        if current is None or "time_format" in data:
            fmt = str(data.get("time_format") or "centesimal").strip()
            if fmt not in {"centesimal", "sexagesimal"}:
                raise AppError(400, "Formato de hora inválido.")
            payload["time_format"] = fmt
        if current is None or "active" in data:
            payload["active"] = True if current is None and "active" not in data else bool(data.get("active", True))
        system_event = payload.get("system_event", None if current is None else current.system_event)
        external_code = payload.get("external_code", None if current is None else current.external_code)
        for row in self.repo.list_rows(PayrollEvent, scope.tenant_id, page=1, limit=200, equals={}, descending=False)[0]:
            if current is not None and row.id == current.id:
                continue
            if row.system_event == system_event:
                raise AppError(409, "Este evento da folha já está configurado.")
            if row.external_code == external_code:
                raise AppError(409, "Este código de evento já está em uso.")
        return payload

    def _active_payroll_events(self, scope: Scope) -> list[dict]:
        rows, _total = self.repo.list_rows(
            PayrollEvent, scope.tenant_id, page=1, limit=200, equals={"active": True}, descending=False
        )
        return [
            {
                "system_event": row.system_event,
                "external_code": row.external_code,
                "time_format": row.time_format,
            }
            for row in rows
        ]

    def _afd_punches(self, scope: Scope, starts_on: date, ends_on: date) -> list[AfdPunch]:
        punches = self._punches_in(scope, starts_on, ends_on)
        employees: dict[int, Employee | None] = {}
        rows: list[AfdPunch] = []
        for punch in punches:
            if punch.employee_id not in employees:
                employees[punch.employee_id] = self.repo.get_row(Employee, scope.tenant_id, punch.employee_id)
            employee = employees[punch.employee_id]
            if employee is None:
                continue
            rows.append(
                AfdPunch(
                    cpf=employee.cpf,
                    marked_at=punch.occurred_at,
                    stored_at=punch.created_at or punch.occurred_at,
                    collector=self._afd_collector(punch),
                    offline=str(punch.channel or "") == "offline",
                )
            )
        return rows

    def _afd_collector(self, punch: Punch) -> str:
        source = str(punch.source or "")
        if source in {"face", "qr"}:
            return "01"
        if source in {"employee", "admin", "manual", "approved_request", "afd"}:
            return "02"
        return "05"

    def _aej_payload(self, scope: Scope, starts_on: date, ends_on: date):
        finish = ends_on if ends_on <= self.today() else self.today()
        punches_by_day: dict[tuple[int, date], list[Punch]] = {}
        for punch in self._punches_in(scope, starts_on, ends_on):
            local = punch.occurred_at.astimezone(BR).date()
            punches_by_day.setdefault((punch.employee_id, local), []).append(punch)
        employees_out: list[AejEmployee] = []
        punches_out: list[AejPunch] = []
        absences_out: list[AejAbsence] = []
        page = 1
        link_id = 0
        while True:
            employees, total = self.repo.list_employees(scope.tenant_id, ids=None, page=page, limit=100, equals={})
            for employee in employees:
                if finish < starts_on or employee.admission_date > finish:
                    continue
                link_id += 1
                journey_code, journey_minutes, clocks = self._aej_journey(scope, employee, starts_on)
                employees_out.append(
                    AejEmployee(
                        link_id=link_id,
                        cpf=employee.cpf,
                        name=employee.full_name,
                        registration=employee.registration_number,
                        journey_code=journey_code,
                        journey_minutes=journey_minutes,
                        clocks=clocks,
                    )
                )
                day_start = employee.admission_date if employee.admission_date > starts_on else starts_on
                for day in self._day_results(scope, employee, day_start, finish):
                    work_date = day["work_date"]
                    day_punches = sorted(
                        punches_by_day.get((employee.id, work_date), []),
                        key=lambda item: item.occurred_at,
                    )
                    pair = 0
                    for index, punch in enumerate(day_punches):
                        if index % 2 == 0:
                            pair += 1
                            mark_type = "E"
                        else:
                            mark_type = "S"
                        punches_out.append(
                            AejPunch(
                                link_id=link_id,
                                marked_at=punch.occurred_at,
                                mark_type=mark_type,
                                pair_seq=pair,
                                source=self._aej_source(punch),
                                journey_code=journey_code if mark_type == "E" and pair == 1 else None,
                                reason="Inclusão manual" if self._aej_source(punch) == "I" else None,
                            )
                        )
                    if day.get("absence"):
                        absences_out.append(
                            AejAbsence(link_id=link_id, kind="2", day=work_date, minutes=None, bank_move=None)
                        )
                    elif day.get("holiday") and not day.get("worked_minutes"):
                        absences_out.append(
                            AejAbsence(link_id=link_id, kind="4", day=work_date, minutes=None, bank_move=None)
                        )
                    elif not day.get("workday") and not day.get("worked_minutes"):
                        absences_out.append(
                            AejAbsence(link_id=link_id, kind="1", day=work_date, minutes=None, bank_move=None)
                        )
                    bank = int(day.get("bank_minutes") or 0)
                    if employee.hour_bank and bank:
                        absences_out.append(
                            AejAbsence(
                                link_id=link_id,
                                kind="3",
                                day=work_date,
                                minutes=abs(bank),
                                bank_move="1" if bank > 0 else "2",
                            )
                        )
            if page * 100 >= total or not employees:
                break
            page += 1
        return employees_out, punches_out, absences_out

    def _aej_source(self, punch: Punch) -> str:
        source = str(punch.source or "")
        if source in {"face", "qr", "employee", "afd"}:
            return "O"
        if source in {"admin", "manual", "approved_request"}:
            return "I"
        return "T"

    def _aej_journey(self, scope: Scope, employee: Employee, day: date) -> tuple[str | None, int, list[tuple[str, str]]]:
        vigencies, _total = self.repo.list_rows(
            EmployeeVigency,
            scope.tenant_id,
            page=1,
            limit=200,
            equals={"employee_id": employee.id, "kind": "journey"},
            descending=False,
        )
        vigency = self._vigency_on(vigencies, day)
        if vigency is None or vigency.reference_id is None:
            return None, 0, [(pending(4), pending(4))]
        journey = self.repo.get_row(Journey, scope.tenant_id, vigency.reference_id)
        if journey is None:
            return None, 0, [(pending(4), pending(4))]
        presented = self._present_journey(scope, journey)
        code = f"J{journey.id}"
        clocks: list[tuple[str, str]] = []
        minutes = 0
        days = presented.get("days") if isinstance(presented, dict) else getattr(presented, "days", None)
        for item in days or []:
            off = item.get("off") if isinstance(item, dict) else getattr(item, "off", False)
            if off:
                continue
            spans = item.get("spans") if isinstance(item, dict) else getattr(item, "spans", [])
            for span in spans or []:
                starts = span.get("starts_at") if isinstance(span, dict) else getattr(span, "starts_at", None)
                ends = span.get("ends_at") if isinstance(span, dict) else getattr(span, "ends_at", None)
                clocks.append((self._hhmm(starts), self._hhmm(ends)))
                minutes += self._span_minutes(starts, ends)
            break
        if not clocks:
            morning = clocks_of(
                legacy_spec(
                    getattr(journey, "morning_start", None),
                    getattr(journey, "morning_end", None),
                    getattr(journey, "afternoon_start", None),
                    getattr(journey, "afternoon_end", None),
                )
            )
            for start, end in ((morning[0], morning[1]), (morning[2], morning[3])):
                if start and end:
                    clocks.append((self._hhmm(start), self._hhmm(end)))
                    minutes += self._span_minutes(start, end)
        if not clocks:
            clocks = [(pending(4), pending(4))]
        return code, minutes, clocks

    def _hhmm(self, value: str | None) -> str:
        text = str(value or "").strip()
        if len(text) >= 5 and text[2] == ":":
            return f"{text[0:2]}{text[3:5]}"
        return pending(4)

    def _span_minutes(self, start: str | None, end: str | None) -> int:
        try:
            begin = self._hhmm(start)
            finish = self._hhmm(end)
            if "x" in begin or "x" in finish:
                return 0
            start_min = int(begin[0:2]) * 60 + int(begin[2:4])
            end_min = int(finish[0:2]) * 60 + int(finish[2:4])
            if end_min <= start_min:
                end_min += 24 * 60
            return end_min - start_min
        except ValueError:
            return 0

    def _punches_in(self, scope: Scope, starts_on: date, ends_on: date):
        finish = ends_on if ends_on <= self.today() else self.today()
        if finish < starts_on:
            return []
        start_at, _ignored = day_bounds(starts_on)
        _start, end_at = day_bounds(finish)
        return self.repo.valid_punches_in(scope.tenant_id, start_at, end_at)

    def _invalidate_files(self, scope: Scope, start: date, end: date) -> None:
        for row in self.repo.fiscal_files_overlapping(scope.tenant_id, start, end):
            row.valid = False
            row.invalidated_at = self.clock()
            self.repo.add(row)

    def _project_hour_bank(self, scope: Scope, employee: Employee, until: date | None = None) -> dict:
        limit = self.today() if until is None or until > self.today() else until
        return project_balance(self._bank_events(scope, employee, limit), limit)

    def _latest_balance_entry(self, entries: list, limit: date):
        found = None
        for entry in entries:
            if entry.kind == "balance" and entry.entry_on <= limit:
                found = entry
        return found

    def _bank_day_origin(self, employee: Employee, entries: list, limit: date) -> date:
        marco = self._latest_balance_entry(entries, limit)
        if marco is None:
            # Custo conhecido: sem lançamento kind=balance, o saldo recalcula desde a admissão.
            return employee.admission_date
        after = marco.entry_on + timedelta(days=1)
        return after if after > employee.admission_date else employee.admission_date

    def _bank_calc_from(self, scope: Scope, employee: Employee, starts_on: date, ends_on: date) -> date:
        entries = self.repo.hour_bank_entries_for(scope.tenant_id, employee.id)
        marco = self._latest_balance_entry(entries, ends_on)
        if marco is None:
            # Custo conhecido: sem marco de saldo, a apuração com banco volta à admissão.
            if employee.admission_date < starts_on:
                return employee.admission_date
            return starts_on
        if marco.entry_on < starts_on:
            origin = self._bank_day_origin(employee, entries, ends_on)
            return origin if origin < starts_on else starts_on
        prior_limit = starts_on - timedelta(days=1)
        prior = self._latest_balance_entry(entries, prior_limit) if prior_limit >= employee.admission_date else None
        if prior is not None:
            origin = self._bank_day_origin(employee, [prior], prior.entry_on)
            return origin if origin < starts_on else starts_on
        if employee.admission_date < starts_on:
            return employee.admission_date
        return starts_on

    def _bank_day_items(
        self,
        scope: Scope,
        employee: Employee,
        origin: date,
        limit: date,
        computed: list[dict] | None,
    ) -> list[dict]:
        if origin > limit:
            return []
        if computed is None:
            return self._day_results(scope, employee, origin, limit)
        items = [day for day in computed if origin <= day["work_date"] <= limit]
        if not items:
            return self._day_results(scope, employee, origin, limit)
        first = min(day["work_date"] for day in items)
        if first > origin:
            return self._day_results(scope, employee, origin, first - timedelta(days=1)) + items
        return items

    def _bank_events(
        self,
        scope: Scope,
        employee: Employee,
        limit: date,
        computed: list[dict] | None = None,
        *,
        since: date | None = None,
    ) -> list[tuple]:
        entries = self.repo.hour_bank_entries_for(scope.tenant_id, employee.id)
        origin = since if since is not None else self._bank_day_origin(employee, entries, limit)
        items = self._bank_day_items(scope, employee, origin, limit, computed)
        events = []
        for day in items:
            if day["work_date"] < employee.admission_date or day["work_date"] > limit:
                continue
            if day["bank_minutes"] > 0:
                events.append((day["work_date"], 0, "credit", day["bank_minutes"]))
            elif day["bank_minutes"] < 0:
                events.append((day["work_date"], 0, "debit", -day["bank_minutes"]))
        for entry in entries:
            if entry.entry_on > limit:
                continue
            if entry.kind == "settlement":
                events.append((entry.entry_on, entry.id, entry.effect, entry.minutes))
            elif entry.kind == "balance":
                signed = -entry.minutes if entry.effect == "debit" else entry.minutes
                events.append((entry.entry_on, entry.id, "balance", signed))
            else:
                events.append((entry.entry_on, entry.id, entry.kind, entry.minutes))
        return events

    def _balances_on(self, scope: Scope, employee: Employee, days: list[date], computed: list[dict] | None = None) -> dict[date, int]:
        if not days:
            return {}
        first = min(days)
        last = max(days)
        entries = self.repo.hour_bank_entries_for(scope.tenant_id, employee.id)
        prior = None
        if first > employee.admission_date:
            prior = self._latest_balance_entry(entries, first - timedelta(days=1))
        if prior is not None:
            since = self._bank_day_origin(employee, entries, prior.entry_on)
        else:
            # Custo conhecido: sem marco antes do intervalo, o saldo diário recalcula desde a admissão.
            since = employee.admission_date
        events = self._bank_events(scope, employee, last, computed, since=since)
        return balance_minutes_by_day(events, days)

    def _forget_closing_cache(self) -> None:
        scratch = self._scratch
        if scratch is None:
            return
        scratch.closed = None
        scratch.closed_tenant = None
        scratch.pins.clear()

    def _night_limit(self, scope: Scope, vigencies: list, journeys: dict, day: date, night_end: time) -> time | None:
        vigency = self._vigency_on(vigencies, day)
        journey = None if vigency is None else self._journey_row(scope, journeys, vigency.reference_id)
        spec = None if journey is None else self._spec_on(scope.tenant_id, journey, day)
        plan = None
        if spec is not None and vigency is not None:
            plan = schedule_of(spec, day, vigency.valid_from, vigency.cycle_day or vigency.valid_from.isoweekday())
        return self._night_limit_for(plan, night_end)

    def _night_limit_for(self, plan: dict | None, night_end: time) -> time | None:
        if plan is None:
            return night_end
        if plan["mode"] in {"carga", "livre"}:
            return None
        start = plan["start"]
        end = plan["end"]
        if start is not None and end is not None and end.date() > start.date():
            return None
        return night_end

    def _norm_rules(self, scope: Scope, employee_id: int, starts_on: date, ends_on: date):
        vigencies = self.repo.vigencies_between(scope.tenant_id, employee_id, "norm", starts_on, ends_on)
        rows: dict[int, Norm] = {}

        def rule_on(day: date) -> dict:
            vigency = self._vigency_on(vigencies, day)
            norm = None
            if vigency is not None and vigency.reference_id is not None:
                if vigency.reference_id not in rows:
                    found = self.repo.get_row(Norm, scope.tenant_id, vigency.reference_id)
                    if found is not None:
                        rows[vigency.reference_id] = found
                norm = rows.get(vigency.reference_id)
            return self._norm_rule(norm)

        return rule_on

    def _norm_rule(self, norm) -> dict:
        if norm is None:
            return {
                "tolerance_minutes": 10,
                "minimum_interval_minutes": 60,
                "night_start": time(22, 0),
                "night_end": time(5, 0),
                "night_additional_percent": 20,
            }
        return {
            "tolerance_minutes": int(norm.tolerance_minutes),
            "minimum_interval_minutes": self._interval_minutes(norm.minimum_interval),
            "night_start": self._clock_time(norm.night_start),
            "night_end": self._clock_time(norm.night_end),
            "night_additional_percent": int(norm.night_additional_percent),
        }

    def _interval_minutes(self, value: str) -> int:
        hours, minutes = (int(part) for part in str(value).split(":"))
        return hours * 60 + minutes

    def _clock_time(self, value: str) -> time:
        hour, minute = (int(part) for part in str(value).split(":"))
        return time(hour, minute)

    def _take_night_exit(self, by_day: dict, day: date, consumed: set[int], limit: time | None) -> datetime | None:
        following = by_day.get(day + timedelta(days=1), [])
        if not following or following[0].id in consumed:
            return None
        if limit is not None:
            local = following[0].occurred_at.astimezone(BR)
            if (local.hour, local.minute) > (limit.hour, limit.minute):
                return None
        consumed.add(following[0].id)
        return following[0].occurred_at

    def _result_span(self, scope: Scope, vigencies: list, starts_on: date, ends_on: date) -> tuple[date, date]:
        for vigency in vigencies:
            if vigency.reference_id is None:
                continue
            journey = self.repo.get_row(Journey, scope.tenant_id, vigency.reference_id)
            if journey is None:
                continue
            probe = starts_on if vigency.valid_from < starts_on else vigency.valid_from
            if self._spec_on(scope.tenant_id, journey, probe).kind == "carga":
                return week_monday(starts_on), week_monday(ends_on) + timedelta(days=6)
        return starts_on, ends_on

    def _settle_carga(self, employee: Employee, items: list[dict]) -> None:
        weeks: dict[tuple, list] = {}
        for item in items:
            if item["mode"] != "carga" or item["vigency_id"] is None:
                continue
            weeks.setdefault((item["vigency_id"], week_monday(item["work_date"])), []).append(item)
        for week in weeks.values():
            week.sort(key=lambda item: item["work_date"])
            active = [item for item in week if item["work_date"] >= employee.admission_date]
            if not active:
                continue
            close = active[-1]
            countable = [item for item in active if not item["excused"]]
            weekly = close["weekly_minutes"] or 0
            target = nearest_minute(weekly * len(countable) / 7)
            done = sum(item["worked_minutes"] for item in countable)
            delta = done - target
            close["contracted_minutes"] = target
            if employee.hour_bank:
                close["bank_minutes"] = close["bank_minutes"] + delta
                close["overtime_minutes"] = 0
                close["shortage_minutes"] = 0
            elif delta > 0:
                close["overtime_minutes"] = close["overtime_minutes"] + delta
            else:
                close["shortage_minutes"] = -delta

    def _vigency_on(self, vigencies: list, day: date):
        chosen = None
        for row in vigencies:
            if row.valid_from <= day and (row.valid_to is None or row.valid_to >= day):
                if chosen is None or (row.valid_from, row.id) > (chosen.valid_from, chosen.id):
                    chosen = row
        return chosen

    def _journey_row(self, scope: Scope, journeys: dict, journey_id: int | None):
        if journey_id is None:
            return None
        if journey_id not in journeys:
            journeys[journey_id] = self.repo.get_row(Journey, scope.tenant_id, journey_id)
        return journeys[journey_id]

    def _journey_on(self, scope: Scope, vigencies: list, journeys: dict, day: date):
        chosen = None
        for row in vigencies:
            if row.valid_from <= day and (row.valid_to is None or row.valid_to >= day):
                if chosen is None or (row.valid_from, row.id) > (chosen.valid_from, chosen.id):
                    chosen = row
        if chosen is None or chosen.reference_id is None:
            return None
        if chosen.reference_id not in journeys:
            journeys[chosen.reference_id] = self.repo.get_row(Journey, scope.tenant_id, chosen.reference_id)
        return journeys[chosen.reference_id]

    def _full_day(self, row) -> bool:
        return row.starts_at is None and row.ends_at is None

    def _create_journey(self, scope: Scope, data: dict):
        name = str(data.get("name") or "").strip()
        if not name:
            raise AppError(400, "Informe o nome")
        self._unique_name(Journey, scope.tenant_id, {"name": name}, exclude_id=None)
        spec = self._spec_from(data, current=None)
        when = data.get("valid_from") or ORIGIN
        spec.valid_from = when
        if when != ORIGIN:
            self._assert_open(scope.tenant_id, when)
        morning, morning_end, afternoon, afternoon_end = clocks_of(spec)
        journey = self.repo.add(
            Journey(
                tenant_id=scope.tenant_id,
                name=name,
                note=self._note(data.get("note")),
                morning_start=morning,
                morning_end=morning_end,
                afternoon_start=afternoon,
                afternoon_end=afternoon_end,
                kind=spec.kind,
                flexible=spec.flexible,
                weekly_minutes=spec.weekly_minutes,
            )
        )
        self._write_version(scope, journey, spec)
        return self._present_journey(scope, journey, spec)

    def _update_journey(self, scope: Scope, row_id: int, data: dict):
        journey = self._row(Journey, scope, row_id)
        if "name" in data and data["name"] is not None:
            name = str(data["name"]).strip()
            if not name:
                raise AppError(400, "Informe o nome")
            self._unique_name(Journey, scope.tenant_id, {"name": name}, exclude_id=journey.id)
            journey.name = name
        if "note" in data:
            journey.note = self._note(data.get("note"))
        if self._journey_content_sent(data):
            current = self._spec_latest(scope.tenant_id, journey)
            spec = self._spec_from(data, current)
            when = data.get("valid_from") or self.today()
            spec.valid_from = when
            previous = self._spec_latest(scope.tenant_id, journey)
            if not same_content(previous, spec):
                latest = self._latest_version(scope.tenant_id, journey.id)
                if latest is not None and when < latest.valid_from:
                    raise AppError(400, "A vigência da jornada precisa ser igual ou posterior à atual")
                if previous.kind == "programada" and spec.kind == "programada" and previous.length != spec.length:
                    self._assert_open(scope.tenant_id, when)
                    self._reanchor(scope, journey, when, spec.length, data.get("anchors") or [])
                self._freeze_closed(scope.tenant_id, journey)
                self._write_version(scope, journey, spec)
                morning, morning_end, afternoon, afternoon_end = clocks_of(spec)
                journey.morning_start = morning
                journey.morning_end = morning_end
                journey.afternoon_start = afternoon
                journey.afternoon_end = afternoon_end
                journey.kind = spec.kind
                journey.flexible = spec.flexible
                journey.weekly_minutes = spec.weekly_minutes
        self.repo.add(journey)
        return self._present_journey(scope, journey)

    def _journey_content_sent(self, data: dict) -> bool:
        return any(
            key in data
            for key in (
                "kind",
                "days",
                "weekly_minutes",
                "weekly_time",
                "flexible",
                "morning_start",
                "morning_end",
                "afternoon_start",
                "afternoon_end",
            )
        )

    def _spec_from(self, data: dict, current: JourneySpec | None) -> JourneySpec:
        kind = data.get("kind")
        weekly = data.get("weekly_minutes")
        if data.get("weekly_time"):
            weekly = parse_duration(data["weekly_time"])
        if data.get("days"):
            kind = kind or "programada"
            if kind != "programada":
                raise AppError(400, "Os dias ficam na programada")
            days = parse_days(data["days"])
            flexible = bool(data.get("flexible", False))
            return JourneySpec("programada", flexible, None, days, ORIGIN)
        if kind == "livre":
            if data.get("flexible"):
                raise AppError(400, "A flexível fica na programada")
            return JourneySpec("livre", False, None, [], ORIGIN)
        if kind == "carga" or weekly is not None:
            if data.get("flexible"):
                raise AppError(400, "A flexível fica na programada")
            if weekly is None and current is not None and current.kind == "carga":
                weekly = current.weekly_minutes
            if not weekly:
                raise AppError(400, "Informe a carga da semana")
            return JourneySpec("carga", False, int(weekly), [], ORIGIN)
        clock_keys = ("morning_start", "morning_end", "afternoon_start", "afternoon_end")
        flexible = bool(data.get("flexible", False if current is None else current.flexible))
        if current is not None and not any(key in data for key in clock_keys):
            return JourneySpec(current.kind, flexible if current.kind == "programada" else False, current.weekly_minutes, current.days, ORIGIN)
        stored = clocks_of(current) if current is not None else (None, None, None, None)
        morning = data["morning_start"] if "morning_start" in data else stored[0]
        morning_end = data["morning_end"] if "morning_end" in data else stored[1]
        afternoon = data["afternoon_start"] if "afternoon_start" in data else stored[2]
        afternoon_end = data["afternoon_end"] if "afternoon_end" in data else stored[3]
        if current is None and not any((morning, morning_end, afternoon, afternoon_end)):
            raise AppError(400, "Informe os dias da jornada")
        return JourneySpec(
            "programada",
            flexible,
            None,
            legacy_days(morning, morning_end, afternoon, afternoon_end),
            ORIGIN,
        )

    def _write_version(self, scope: Scope, journey: Journey, spec: JourneySpec) -> None:
        existing = [
            row
            for row in self.repo.versions_for(scope.tenant_id, journey.id)
            if row.valid_from == spec.valid_from
        ]
        for version in existing:
            if self.repo.version_is_pinned(version.id):
                continue
            self._delete_version(version)
        version = self.repo.add(
            JourneyVersion(
                tenant_id=scope.tenant_id,
                journey_id=journey.id,
                valid_from=spec.valid_from,
                kind=spec.kind,
                flexible=spec.flexible,
                weekly_minutes=spec.weekly_minutes,
            )
        )
        for day in spec.days:
            stored = self.repo.add(
                JourneyDay(
                    tenant_id=scope.tenant_id,
                    version_id=version.id,
                    position=day.position,
                    off=day.off,
                )
            )
            for index, span in enumerate(day.spans, start=1):
                self.repo.add(
                    JourneySpan(
                        tenant_id=scope.tenant_id,
                        day_id=stored.id,
                        position=index,
                        starts_at=span.starts_at,
                        ends_at=span.ends_at,
                    )
                )

    def _delete_version(self, version: JourneyVersion) -> None:
        for day in self.repo.days_for(version.id):
            for span in self.repo.spans_for(day.id):
                self.repo.delete(span)
            self.repo.delete(day)
        self.repo.delete(version)

    def _purge_journey(self, scope: Scope, journey: Journey) -> None:
        self.repo.delete_pins_for_journey(journey.id)
        for version in list(self.repo.versions_for(scope.tenant_id, journey.id)):
            self._delete_version(version)

    def _reanchor(self, scope: Scope, journey: Journey, valid_from: date, length: int, anchors: list) -> None:
        wanted = {}
        for item in anchors:
            employee_id = int(item["employee_id"] if isinstance(item, dict) else item.employee_id)
            cycle_day = int(item["cycle_day"] if isinstance(item, dict) else item.cycle_day)
            if cycle_day < 1 or cycle_day > length:
                raise AppError(400, "Informe um dia da sequência")
            wanted[employee_id] = cycle_day
        for vigency in self.repo.vigencies_for_reference(scope.tenant_id, "journey", journey.id):
            if vigency.valid_to is not None and vigency.valid_to < valid_from:
                continue
            if vigency.employee_id not in wanted:
                person = self.repo.get_row(Employee, scope.tenant_id, vigency.employee_id)
                name = person.full_name if person is not None else "funcionário"
                raise AppError(400, f"Informe o dia da sequência de {name}.")
        for employee_id, cycle_day in wanted.items():
            employee = self._employee(scope, employee_id)
            self._replace_vigency(scope, employee.id, "journey", journey.id, journey.name, valid_from, None, cycle_day)

    def _present_journey(self, scope: Scope, journey: Journey, spec: JourneySpec | None = None):
        chosen = spec or self._spec_latest(scope.tenant_id, journey)
        return self._journey_view(journey, chosen)

    def _present_journeys(self, scope: Scope, journeys: list[Journey]):
        if not journeys:
            return []
        latest = self.repo.latest_versions_for(scope.tenant_id, [journey.id for journey in journeys])
        version_ids = [version.id for version in latest.values()]
        days_by_version = self.repo.days_for_versions(version_ids)
        day_ids = [day.id for days in days_by_version.values() for day in days]
        spans_by_day = self.repo.spans_for_days(day_ids)
        views = []
        for journey in journeys:
            version = latest.get(journey.id)
            if version is None:
                views.append(self._journey_view(journey, legacy_spec(journey.morning_start, journey.morning_end, journey.afternoon_start, journey.afternoon_end)))
                continue
            days: list[DaySpec] = []
            for stored in days_by_version.get(version.id, []):
                spans = [
                    SpanSpec(span.starts_at, span.ends_at)
                    for span in spans_by_day.get(stored.id, [])
                ]
                days.append(DaySpec(position=stored.position, off=bool(stored.off), spans=spans))
            days.sort(key=lambda item: item.position)
            spec = JourneySpec(
                kind=version.kind,
                flexible=bool(version.flexible),
                weekly_minutes=version.weekly_minutes,
                days=days,
                valid_from=version.valid_from,
            )
            views.append(self._journey_view(journey, spec))
        return views

    def _journey_view(self, journey: Journey, chosen: JourneySpec):
        morning, morning_end, afternoon, afternoon_end = clocks_of(chosen)
        return SimpleNamespace(
            id=journey.id,
            name=journey.name,
            note=journey.note,
            kind=chosen.kind,
            morning_start=morning,
            morning_end=morning_end,
            afternoon_start=afternoon,
            afternoon_end=afternoon_end,
            days=day_view(chosen),
            weekly_minutes=chosen.weekly_minutes,
            flexible=chosen.flexible,
            valid_from=chosen.valid_from,
        )

    def _spec_on(self, tenant_id: int, journey: Journey, day: date) -> JourneySpec:
        closing = self._closed_on(tenant_id, day)
        if closing is not None:
            pin = self._pin_on(closing.id, journey.id, day)
            if pin is not None:
                pinned = self._version_row(tenant_id, pin.version_id)
                if pinned is not None:
                    return self._built_spec(journey, pinned)
            return self._spec_covering(tenant_id, journey, day)
        return self._spec_latest(tenant_id, journey)

    def _closed_on(self, tenant_id: int, day: date):
        scratch = self._scratch
        if scratch is None:
            return self.repo.closed_covering(tenant_id, day)
        if scratch.closed_tenant != tenant_id:
            scratch.closed_tenant = tenant_id
            scratch.closed = self.repo.closed_periods(tenant_id)
        for row in scratch.closed or []:
            if row.starts_on <= day <= row.ends_on:
                return row
        return None

    def _pin_on(self, closing_id: int, journey_id: int, day: date):
        scratch = self._scratch
        if scratch is None:
            return self.repo.pin_on(closing_id, journey_id, day)
        key = (closing_id, journey_id)
        if key not in scratch.pins:
            scratch.pins[key] = self.repo.pins_for(closing_id, journey_id)
        found = [row for row in scratch.pins[key] if row.covers_from <= day]
        return found[-1] if found else None

    def _version_row(self, tenant_id: int, version_id: int):
        scratch = self._scratch
        if scratch is None:
            return self.repo.get_row(JourneyVersion, tenant_id, version_id)
        key = (tenant_id, version_id)
        if key not in scratch.version_rows:
            scratch.version_rows[key] = self.repo.get_row(JourneyVersion, tenant_id, version_id)
        return scratch.version_rows[key]

    def _versions(self, tenant_id: int, journey_id: int):
        scratch = self._scratch
        if scratch is None:
            return self.repo.versions_for(tenant_id, journey_id)
        key = (tenant_id, journey_id)
        if key not in scratch.versions:
            scratch.versions[key] = self.repo.versions_for(tenant_id, journey_id)
        return scratch.versions[key]

    def _built_spec(self, journey: Journey, chosen: JourneyVersion) -> JourneySpec:
        scratch = self._scratch
        if scratch is None or chosen.id is None:
            return self._spec_of(journey, chosen)
        found = scratch.specs.get(chosen.id)
        if found is None:
            found = self._spec_of(journey, chosen)
            scratch.specs[chosen.id] = found
        return found

    def _spec_latest(self, tenant_id: int, journey: Journey) -> JourneySpec:
        chosen = self._latest_version(tenant_id, journey.id)
        if chosen is None:
            return legacy_spec(journey.morning_start, journey.morning_end, journey.afternoon_start, journey.afternoon_end)
        return self._built_spec(journey, chosen)

    def _spec_covering(self, tenant_id: int, journey: Journey, day: date) -> JourneySpec:
        chosen = self._version_covering(tenant_id, journey.id, day)
        if chosen is None:
            return legacy_spec(journey.morning_start, journey.morning_end, journey.afternoon_start, journey.afternoon_end)
        return self._built_spec(journey, chosen)

    def _version_covering(self, tenant_id: int, journey_id: int, day: date) -> JourneyVersion | None:
        chosen = None
        for version in self._versions(tenant_id, journey_id):
            if version.valid_from <= day and (chosen is None or (version.valid_from, version.id) > (chosen.valid_from, chosen.id)):
                chosen = version
        return chosen

    def _spec_of(self, journey: Journey, chosen: JourneyVersion) -> JourneySpec:
        days: list[DaySpec] = []
        for stored in self.repo.days_for(chosen.id):
            spans = [SpanSpec(span.starts_at, span.ends_at) for span in self.repo.spans_for(stored.id)]
            days.append(DaySpec(position=stored.position, off=bool(stored.off), spans=spans))
        days.sort(key=lambda item: item.position)
        return JourneySpec(
            kind=chosen.kind,
            flexible=bool(chosen.flexible),
            weekly_minutes=chosen.weekly_minutes,
            days=days,
            valid_from=chosen.valid_from,
        )

    def _pin_journeys(self, scope: Scope, closing: Closing) -> None:
        page = 1
        while True:
            journeys, total = self.repo.list_rows(
                Journey, scope.tenant_id, page=page, limit=100, equals={}, descending=False
            )
            for journey in journeys:
                if self.repo.pins_for(closing.id, journey.id):
                    continue
                latest = self._latest_version(scope.tenant_id, journey.id)
                if latest is None:
                    continue
                self.repo.add(
                    ClosingJourneyPin(
                        tenant_id=scope.tenant_id,
                        closing_id=closing.id,
                        journey_id=journey.id,
                        version_id=latest.id,
                        covers_from=closing.starts_on,
                    )
                )
            if page * 100 >= total or not journeys:
                break
            page += 1

    def _freeze_closed(self, tenant_id: int, journey: Journey) -> None:
        for closing in self.repo.closed_periods(tenant_id):
            if self.repo.pins_for(closing.id, journey.id):
                continue
            previous_id = None
            day = closing.starts_on
            while day <= closing.ends_on:
                version = self._version_covering(tenant_id, journey.id, day)
                if version is not None and version.id != previous_id:
                    self.repo.add(
                        ClosingJourneyPin(
                            tenant_id=tenant_id,
                            closing_id=closing.id,
                            journey_id=journey.id,
                            version_id=version.id,
                            covers_from=day,
                        )
                    )
                    previous_id = version.id
                day += timedelta(days=1)

    def _latest_version(self, tenant_id: int, journey_id: int):
        found = self._versions(tenant_id, journey_id)
        return found[-1] if found else None

    def _cycle_day(self, scope: Scope, journey_id: int, valid_from: date, raw) -> int | None:
        journey = self._row(Journey, scope, journey_id)
        spec = self._spec_on(scope.tenant_id, journey, valid_from)
        if spec.kind != "programada":
            return None
        chosen = valid_from.isoweekday() if raw is None else int(raw)
        if spec.length and (chosen < 1 or chosen > spec.length):
            raise AppError(400, "Informe um dia da sequência")
        return chosen

    def _norm_measures(self, data: dict, current) -> dict:
        payload = {}
        payload.update(self._norm_minutes(data, current, "tolerance_minutes", 10, 240, "Informe a tolerância", "A tolerância precisa ficar entre 0 e 240 minutos"))
        payload.update(self._norm_interval(data, current))
        payload.update(self._norm_clock(data, current, "night_start", "22:00", "Informe o início do período noturno"))
        payload.update(self._norm_clock(data, current, "night_end", "05:00", "Informe o fim do período noturno"))
        payload.update(self._norm_minutes(data, current, "night_additional_percent", 20, 100, "Informe o adicional das horas noturnas", "O adicional precisa ficar entre 0 e 100"))
        return payload

    def _norm_minutes(self, data: dict, current, key: str, default: int, high: int, missing: str, bounds: str) -> dict:
        if current is not None and key not in data:
            return {}
        raw = data.get(key)
        if raw is None or str(raw).strip() == "":
            if current is None:
                return {key: default}
            raise AppError(400, missing)
        text = str(raw).strip()
        if not text.lstrip("-").isdigit():
            raise AppError(400, bounds)
        value = int(text)
        if value < 0 or value > high:
            raise AppError(400, bounds)
        return {key: value}

    def _norm_interval(self, data: dict, current) -> dict:
        key = "minimum_interval"
        if current is not None and key not in data:
            return {}
        raw = data.get(key)
        if raw is None or not str(raw).strip():
            if current is None:
                return {key: "01:00"}
            raise AppError(400, "Informe o intervalo mínimo")
        parts = str(raw).strip().split(":")
        if len(parts) != 2 or not parts[0].isdigit() or not parts[1].isdigit() or len(parts[1]) != 2:
            raise AppError(400, "Informe o intervalo mínimo no formato 01:30")
        hours = int(parts[0])
        minutes = int(parts[1])
        if minutes > 59 or hours > 12 or (hours == 12 and minutes > 0):
            raise AppError(400, "O intervalo mínimo precisa ficar entre 00:00 e 12:00")
        return {key: f"{hours:02d}:{minutes:02d}"}

    def _norm_clock(self, data: dict, current, key: str, default: str, missing: str) -> dict:
        if current is not None and key not in data:
            return {}
        raw = data.get(key)
        if raw is None or not str(raw).strip():
            if current is None:
                return {key: default}
            raise AppError(400, missing)
        return {key: assert_clock(str(raw))}

    def _prepare_named(self, model, scope: Scope, data: dict, current) -> dict:
        payload = {}
        if "name" in data and data["name"] is not None:
            name = str(data["name"]).strip()
            if not name:
                raise AppError(400, "Informe o nome")
            payload["name"] = name
        elif current is None:
            raise AppError(400, "Informe o nome")
        if model is Team:
            unit_id = data.get("unit_id", getattr(current, "unit_id", None))
            if current is None or "unit_id" in data:
                self._row(Unit, scope, int(unit_id))
                payload["unit_id"] = int(unit_id)
        if model is Journey:
            for key in ("morning_start", "morning_end", "afternoon_start", "afternoon_end"):
                if current is None or key in data:
                    payload[key] = assert_clock(data.get(key))
            if current is None or "note" in data:
                payload["note"] = self._note(data.get("note"))
        if model is Norm:
            if current is None or "union_name" in data:
                union_name = str(data.get("union_name") or "").strip()
                if not union_name:
                    raise AppError(400, "Informe o sindicato")
                payload["union_name"] = union_name
            if current is None or "kind" in data:
                kind = str(data.get("kind") or "").strip()
                if kind not in NORM_KINDS:
                    raise AppError(400, "Informe se é convenção ou acordo")
                payload["kind"] = kind
            start = data.get("valid_from", getattr(current, "valid_from", None))
            end = data.get("valid_to", getattr(current, "valid_to", None)) if current is None or "valid_to" in data or "valid_from" in data else getattr(current, "valid_to", None)
            if current is None or "valid_from" in data:
                payload["valid_from"] = start
            if current is None or "valid_to" in data:
                payload["valid_to"] = end
            finish = payload.get("valid_to", getattr(current, "valid_to", None))
            begin = payload.get("valid_from", getattr(current, "valid_from", None))
            if begin is not None and finish is not None and finish < begin:
                raise AppError(400, "O fim precisa ser igual ou posterior ao início")
            if current is None or "note" in data:
                payload["note"] = self._note(data.get("note"))
            payload.update(self._norm_measures(data, current))
        if model is Holiday:
            if current is None or "holiday_date" in data:
                payload["holiday_date"] = data.get("holiday_date")
            if current is None or "note" in data:
                payload["note"] = self._note(data.get("note"))
        if model is Reason:
            if current is None or "kind" in data:
                kind = data.get("kind")
                if kind not in REASON_KINDS:
                    raise AppError(400, "Informe onde o motivo é usado")
                payload["kind"] = kind
            payload["active"] = True
        if model is CategoryValue and current is None:
            category_id = data.get("category_id")
            if category_id is None:
                raise AppError(400, "Selecione a categoria")
            self._row(Category, scope, int(category_id))
            payload["category_id"] = int(category_id)
        return payload

    def _unique_name(self, model, tenant_id: int, payload: dict, exclude_id: int | None) -> None:
        if model not in UNIQUE_MODELS or "name" not in payload:
            return
        scope = {}
        if model is Team:
            scope["unit_id"] = payload["unit_id"]
        elif model is Reason:
            scope["kind"] = payload["kind"]
        elif model is CategoryValue:
            scope["category_id"] = payload["category_id"]
        if self.repo.name_taken(model, tenant_id, payload["name"], exclude_id=exclude_id, scope=scope):
            raise AppError(409, "Já existe um cadastro com esse nome")

    def _guard_catalog(self, model, row) -> None:
        checks = {
            Unit: (Team, {"unit_id": row.id}, "Existem equipes nesta empresa."),
        }
        if model in checks:
            other, equals, message = checks[model]
            if self.repo.count_model(other, **equals):
                raise AppError(409, message)
        kind_by_model = {
            Job: "job",
            CostCenter: "cost_center",
            Unit: "unit",
            Team: "team",
            Journey: "journey",
            Norm: "norm",
        }
        kind = kind_by_model.get(model)
        if kind and self.repo.count_model(EmployeeVigency, kind=kind, reference_id=row.id):
            raise AppError(409, "O cadastro está no histórico de um funcionário.")
        if model is Reason and (
            self.repo.count_model(Occurrence, reason_id=row.id) or self.repo.count_model(TimeRequest, reason_id=row.id)
        ):
            raise AppError(409, "O motivo está em uso.")

    def _resolve_access(self, scope: Scope, *, cpf: str, email: str | None, full_name: str) -> int:
        if self.authenticator is None:
            raise AppError(503, "Autenticador indisponível")
        person_id, _created = self.authenticator.upsert_person(
            cpf=cpf,
            email=email,
            full_name=full_name,
            password=None,
            redirect_url=settings.PUBLIC_APP_URL,
        )
        taken, _total = self.repo.list_rows(
            Employee,
            scope.tenant_id,
            page=1,
            limit=1,
            equals={"person_id": person_id},
            descending=False,
        )
        if taken:
            raise AppError(409, "Esse acesso já está ligado a outro funcionário")
        if self.repo.membership(person_id, scope.tenant_id) is None:
            self.repo.add(Membership(person_id=person_id, tenant_id=scope.tenant_id, role="member"))
            logger.info("vínculo criado person_id=%s tenant_id=%s", person_id, scope.tenant_id)
        return person_id

    def _reference_photo(self, data: dict, method: str) -> tuple[list[float] | None, str | None]:
        image = data.get("face_image")
        if not image or method != "face":
            return None, None
        decoded = decode_image(str(image), message="A foto de referência não foi aceita.")
        try:
            vector = self.embedder(decoded)
        except AppError:
            raise
        except Exception:
            logger.exception("falha ao gravar a foto de referência")
            raise AppError(503, "Reconhecimento indisponível") from None
        return vector, self.files.save_reference(decoded)

    def _write_embedding(self, scope: Scope, employee_id: int, vector: list[float]) -> None:
        stamp = self.clock()
        current = self._embedding(scope, employee_id)
        if current is None:
            self.repo.add(
                FaceEmbedding(
                    tenant_id=scope.tenant_id,
                    employee_id=employee_id,
                    model_name=MODEL_NAME,
                    model_version=MODEL_VERSION,
                    embedding=vector,
                    updated_at=stamp,
                )
            )
        else:
            current.model_name = MODEL_NAME
            current.model_version = MODEL_VERSION
            current.embedding = vector
            current.updated_at = stamp
            self.repo.add(current)
        self._drop_faces(scope.tenant_id)

    def _drop_faces(self, tenant_id: int) -> None:
        _face_registries.pop(tenant_id, None)

    def _embedding(self, scope: Scope, employee_id: int) -> FaceEmbedding | None:
        rows, _total = self.repo.list_rows(
            FaceEmbedding,
            scope.tenant_id,
            page=1,
            limit=1,
            equals={"employee_id": employee_id},
            descending=False,
        )
        return rows[0] if rows else None

    def _face_registry(self, scope: Scope) -> list[tuple[int, list[float]]]:
        cached = _face_registries.get(scope.tenant_id)
        now = monotonic()
        if cached is not None and now - cached[0] < _FACE_REGISTRY_SECONDS:
            return list(cached[1])
        found = self._load_face_registry(scope)
        _face_registries[scope.tenant_id] = (now, found)
        return list(found)

    def _load_face_registry(self, scope: Scope) -> list[tuple[int, list[float]]]:
        found = []
        for row, employee_id in self.repo.face_registry_rows(scope.tenant_id):
            try:
                found.append((employee_id, unit(list(row.embedding))))
            except ValueError:
                continue
        return found

    def _punch_by_event(self, scope: Scope, employee_id: int, event_id: str) -> Punch | None:
        rows, _total = self.repo.list_rows(
            Punch,
            scope.tenant_id,
            page=1,
            limit=1,
            equals={"client_event_id": event_id},
            descending=False,
        )
        if not rows:
            return None
        row = rows[0]
        if row.employee_id != employee_id:
            raise AppError(409, "O evento do aparelho já foi usado.")
        return row

    def _assert_clock_method(self, employee: Employee, source: str) -> None:
        if source in {"manual", "approved_request", "afd"}:
            return
        expected = {"employee": "simple", "qr": "qr", "face": "face"}.get(source)
        if expected is None or employee.clock_method != expected:
            raise AppError(400, "Este funcionário não usa esse tipo de registro.")

    def _employee_payload(self, scope: Scope, data: dict, current: Employee | None) -> dict:
        payload = {}
        if current is None or "full_name" in data:
            name = str(data.get("full_name") or "").strip()
            if not name:
                raise AppError(400, "Informe o nome")
            payload["full_name"] = name
        if current is None or "cpf" in data:
            cpf = normalize_cpf(str(data.get("cpf") or ""))
            taken, _total = self.repo.list_rows(
                Employee, scope.tenant_id, page=1, limit=1, equals={"cpf": cpf}, descending=False
            )
            if taken and (current is None or taken[0].id != current.id):
                raise AppError(409, "CPF já cadastrado nesta organização")
            payload["cpf"] = cpf
        if current is None or "email" in data:
            payload["email"] = self._email(data.get("email"))
        if current is None:
            payload["person_id"] = self._resolve_access(
                scope,
                cpf=payload["cpf"],
                email=payload.get("email"),
                full_name=payload["full_name"],
            )
        if current is None or "admission_date" in data:
            if data.get("admission_date") is None:
                raise AppError(400, "Informe a admissão")
            payload["admission_date"] = data["admission_date"]
        if current is None or "note" in data:
            payload["note"] = self._note(data.get("note"))
        if current is None or "hour_bank" in data:
            payload["hour_bank"] = bool(data.get("hour_bank", False))
        if current is None or "registration_number" in data:
            payload["registration_number"] = self._registration(scope, data.get("registration_number"), current)
        if current is None or "clock_method" in data:
            method = str(data.get("clock_method") or "simple").strip().lower()
            if method not in {"simple", "qr", "face"}:
                raise AppError(400, "Tipo de registro inválido")
            payload["clock_method"] = method
        return payload

    def _employee_out(self, row: Employee, labels: dict, cards: list | None = None, managers: list | None = None, names: dict | None = None) -> dict:
        body = {
            "id": row.id,
            "full_name": row.full_name,
            "cpf": row.cpf,
            "email": row.email,
            "person_id": row.person_id,
            "admission_date": row.admission_date,
            "note": row.note,
            "hour_bank": bool(row.hour_bank),
            "registration_number": row.registration_number,
            "clock_method": row.clock_method or "simple",
            "face_key": row.face_key,
            "face_url": self._photo_url(row.face_key),
        }
        for kind, field in KIND_FIELD.items():
            if kind == "manager":
                continue
            item = labels.get(kind)
            body[field] = self._shown_name(item, names or {}) if item is not None else None
        current_managers = list(managers or [])
        body["managers"] = [
            {"vigency_id": item.id, "reference_id": item.reference_id, "name": self._shown_name(item, names or {})}
            for item in current_managers
        ]
        body["manager_label"] = ", ".join(item["name"] for item in body["managers"]) or None
        chosen = cards or []
        body["categories"] = chosen
        cost = next((item for item in chosen if item["name"] == COST_CENTER_CLASSIFICATION), None)
        body["cost_center_label"] = cost["value_name"] if cost else None
        return body

    def _id_list(self, raw) -> list[int]:
        if raw is None or raw == "":
            return []
        if isinstance(raw, list):
            pieces = [str(item) for item in raw]
        else:
            pieces = str(raw).split(",")
        found = []
        for piece in pieces:
            item = piece.strip()
            if not item:
                continue
            if not item.isdigit():
                raise AppError(400, "Filtro inválido")
            number = int(item)
            if number not in found:
                found.append(number)
        return found

    def _category_value_ids(self, scope: Scope, value_ids: list[int], day: date) -> set[int]:
        categories: dict[int, set[int]] = {}
        for value_id in value_ids:
            value = self._row(CategoryValue, scope, value_id)
            categories.setdefault(int(value.category_id), set()).add(value.id)
        matched: set[int] | None = None
        for category_id, ids in categories.items():
            found = self.repo.employees_with_values(scope.tenant_id, category_id, day, ids)
            matched = found if matched is None else matched & found
        return matched or set()

    def _category_choice(self, scope: Scope, kind: str, reference_id):
        if reference_id is None:
            raise AppError(400, "Selecione o cadastro")
        value = self._row(CategoryValue, scope, int(reference_id))
        category = self._row(Category, scope, int(value.category_id))
        if kind == "cost_center" and category.name != COST_CENTER_CLASSIFICATION:
            raise AppError(400, "Selecione um valor do centro de custo")
        return category.id, value.id, value.name

    def _cards_on(self, rows: list[Employee], day: date) -> dict[int, list[dict]]:
        grouped = self.repo.applicable_categories([row.id for row in rows], day)
        vigencies = [vigency for by_class in grouped.values() for vigency in by_class.values()]
        tenant_id = vigencies[0].tenant_id if vigencies else (rows[0].tenant_id if rows else 0)
        value_names = self._entity_names(tenant_id, vigencies)
        category_ids = [item.category_id for item in vigencies if item.category_id is not None]
        category_names = {item.id: item.name for item in self.repo.rows_in(Category, tenant_id, category_ids)}
        cards: dict[int, list[dict]] = {}
        for employee_id, by_class in grouped.items():
            items = []
            for category_id, vigency in by_class.items():
                items.append(
                    {
                        "category_id": category_id,
                        "name": category_names.get(category_id, ""),
                        "value_id": vigency.reference_id,
                        "value_name": self._shown_name(vigency, value_names),
                    }
                )
            items.sort(key=lambda item: item["name"].casefold())
            cards[employee_id] = items
        return cards

    def _employee_lines_for(self, scope: Scope, day: date, people: list[Employee], filters: dict) -> list[dict]:
        labels = self.repo.labels_on([person.id for person in people], day)
        return [
            {
                "employee_id": person.id,
                "full_name": person.full_name,
                "occurred_on": day,
                "title": "Funcionários",
                "detail": self._employee_snapshot(person, labels.get(person.id, {})),
            }
            for person in people
        ]

    def _employee_snapshot(self, person: Employee, labels: dict) -> str:
        situation = labels.get("status")
        situation_name = {"active": "Ativo", "dismissed": "Desligado"}.get(situation.label if situation is not None else "", "Não informado")
        names = self._entity_names(person.tenant_id, list(labels.values()))
        parts = (
            f"Matrícula {self._shown(person.registration_number)}",
            f"CPF {self._cpf_text(person.cpf)}",
            f"Empresa {self._shown(self._shown_name(labels.get('unit'), names))}",
            f"Equipe {self._shown(self._shown_name(labels.get('team'), names))}",
            f"Função {self._shown(self._shown_name(labels.get('job'), names))}",
            f"Jornada {self._shown(self._shown_name(labels.get('journey'), names))}",
            f"Situação {situation_name}",
            f"Admissão {person.admission_date.strftime('%d/%m/%Y')}",
            f"Banco de horas {'sim' if person.hour_bank else 'não'}",
        )
        return ". ".join(parts)

    def _shown(self, value) -> str:
        text = "" if value is None else str(value).strip()
        return text or "Não informado"

    def _cpf_text(self, digits: str) -> str:
        if len(digits) != 11:
            return self._shown(digits)
        return f"{digits[:3]}.{digits[3:6]}.{digits[6:9]}-{digits[9:]}"

    def _cost_center_category(self, scope: Scope, *, create: bool) -> Category | None:
        found = self.repo.category_named(scope.tenant_id, COST_CENTER_CLASSIFICATION)
        if found is None and create:
            found = self.repo.add(Category(tenant_id=scope.tenant_id, name=COST_CENTER_CLASSIFICATION))
        return found

    def _list_cost_centers(self, scope: Scope, page: int, limit: int, equals: dict):
        category = self._cost_center_category(scope, create=False)
        if category is None:
            return [], 0
        filters = {"category_id": category.id}
        if "name" in equals:
            filters["name"] = equals["name"]
        return self.repo.list_rows(
            CategoryValue, scope.tenant_id, page=page, limit=limit, equals=filters, descending=False
        )

    def _cost_center_value(self, scope: Scope, row_id: int) -> CategoryValue:
        value = self._row(CategoryValue, scope, row_id)
        category = self._row(Category, scope, int(value.category_id))
        if category.name != COST_CENTER_CLASSIFICATION:
            raise AppError(404, "Registro não encontrado")
        return value

    def _create_cost_center_value(self, scope: Scope, data: dict) -> CategoryValue:
        category = self._cost_center_category(scope, create=True)
        return self.create_named(
            CategoryValue,
            scope,
            {"name": data.get("name"), "category_id": category.id},
        )

    def _rename_cost_center_value(self, scope: Scope, row_id: int, data: dict) -> CategoryValue:
        value = self._cost_center_value(scope, row_id)
        return self.update_named(CategoryValue, scope, value.id, data)

    def _delete_cost_center_value(self, scope: Scope, row_id: int) -> None:
        value = self._cost_center_value(scope, row_id)
        self.delete_named(CategoryValue, scope, value.id)

    def _delete_category(self, scope: Scope, row: Category) -> None:
        if self.repo.count_model(EmployeeVigency, category_id=row.id):
            raise AppError(409, "O cadastro está no histórico de um funcionário.")
        values = [
            item
            for item in self.repo.rows_of(CategoryValue, scope.tenant_id)
            if item.category_id == row.id
        ]
        for value in values:
            self._guard_category_value(value)
            self.repo.delete(value)
        self.repo.delete(row)

    def _guard_category_value(self, row: CategoryValue) -> None:
        if self.repo.count_model(EmployeeVigency, kind="category", reference_id=row.id):
            raise AppError(409, "O cadastro está no histórico de um funcionário.")

    def _vigency_target(self, scope: Scope, employee: Employee, kind: str, data: dict, valid_from: date):
        if kind == "status":
            label = str(data.get("label") or "").strip()
            if label not in STATUS_LABELS:
                raise AppError(400, "Situação inválida")
            if data.get("reference_id") is not None:
                raise AppError(400, "Situação não usa outro cadastro")
            return None, label
        reference_id = data.get("reference_id")
        if reference_id is None:
            raise AppError(400, "Selecione o cadastro")
        model = REF_MODELS[kind]
        target = self._row(model, scope, int(reference_id))
        if kind == "manager" and target.id == employee.id:
            raise AppError(400, "O gestor precisa ser outro funcionário")
        label = target.full_name if kind == "manager" else target.name
        return target.id, label

    def _occupies(self, employee_id: int, day: date) -> bool:
        current = self.repo.applicable(employee_id, "status", day)
        if current is not None and current.label == "active":
            return True
        opened = self.repo.open_vigency(employee_id, "status")
        return opened is not None and opened.label == "active" and opened.valid_from > day

    def _assert_capacity(self, scope: Scope) -> None:
        tenant = self.repo.get_tenant(scope.tenant_id)
        if tenant is None:
            raise AppError(404, "Organização não encontrada")
        if self.repo.count_active(scope.tenant_id, self.today()) >= tenant.employee_capacity:
            raise AppError(409, "Limite de funcionários do plano atingido")

    def _plan_notice(self, scope: Scope) -> None:
        tenant = self.repo.get_tenant(scope.tenant_id)
        if tenant is None or tenant.employee_capacity <= 0:
            return
        active = self.repo.count_active(scope.tenant_id, self.today())
        if active >= tenant.employee_capacity:
            kind = "plan_limit"
        elif active * 100 >= tenant.employee_capacity * 85:
            kind = "plan_limit_near"
        else:
            return
        for person_id in self._admin_ids(scope):
            self._deliver(scope, person_id, None, kind, daily=True)

    def _approve(self, scope: Scope, row: TimeRequest, employee: Employee) -> None:
        if row.kind == "adjustment":
            stored = self.repo.request_punches_for([row.id]).get(row.id, [])
            raw = [item.occurred_at for item in stored]
            if not raw and row.occurred_at is not None:
                raw = [row.occurred_at]
            day, moments = self._normalize_day(raw)
            self._replace_day(
                scope,
                employee,
                day,
                moments,
                source="approved_request",
                request_id=row.id,
                reason_id=row.reason_id,
                note=row.note,
                origin_label="solicitação",
            )
        start = row.starts_on or self.today()
        self.create_occurrence(
            scope,
            {
                "employee_id": employee.id,
                "kind": OCCURRENCE_FOR_REQUEST[row.kind],
                "starts_on": start,
                "ends_on": row.ends_on or start,
                "starts_at": row.starts_at,
                "ends_at": row.ends_at,
                "reason_id": row.reason_id,
                "note": row.note,
                "cid": row.cid,
                "crm": row.crm,
                "doctor_name": row.doctor_name,
                "photo_key": row.photo_key,
            },
            source="approved_request",
            request_id=row.id,
        )

    def _normalize_day(self, values: list[datetime]) -> tuple[date, list[datetime]]:
        if not values:
            raise AppError(400, "Informe as marcações do dia")
        moments = sorted(assert_aware(value) for value in values)
        seen: set[datetime] = set()
        day = self._punch_day(moments[0])
        for moment in moments:
            assert_not_future(moment, self.today())
            if self._punch_day(moment) != day:
                raise AppError(400, "As marcações precisam ser do mesmo dia")
            if moment in seen:
                raise AppError(400, "Há marcações repetidas")
            seen.add(moment)
        return day, moments

    def _replace_day(
        self,
        scope: Scope,
        employee: Employee,
        day: date,
        moments: list[datetime],
        *,
        source: str,
        request_id: int | None,
        reason_id: int | None,
        note: str | None,
        origin_label: str,
    ) -> list[Punch]:
        self._assert_working(scope, employee)
        self._assert_open(scope.tenant_id, day, employee.id)
        start, end = day_bounds(day)
        current = self.repo.valid_punches_between(scope.tenant_id, employee.id, start, end)
        voided_at = self.clock()
        for row in current:
            row.valid = False
            row.voided_at = voided_at
            self.repo.add(row)
        created = [
            self.create_punch(
                scope,
                {"employee_id": employee.id, "occurred_at": moment, "note": note, "reason_id": reason_id},
                source=source,
                request_id=request_id,
            )
            for moment in moments
        ]
        subject_id = created[0].id if created else employee.id
        self._audit(scope, employee.id, "punch_correction", subject_id, None, origin_label, day)
        return created

    def _span(self, data: dict) -> tuple[date, date, datetime | None, datetime | None]:
        start = data.get("starts_on")
        if start is None:
            raise AppError(400, "Informe o período")
        end = assert_period(start, data.get("ends_on"))
        starts_at = data.get("starts_at")
        ends_at = data.get("ends_at")
        if (starts_at is None) != (ends_at is None):
            raise AppError(400, "Informe o início e o fim do horário")
        if starts_at is None:
            return start, end, None, None
        starts_at = assert_aware(starts_at)
        ends_at = assert_aware(ends_at)
        if ends_at <= starts_at:
            raise AppError(400, "O fim do horário precisa ser posterior ao início")
        if start != end or self._punch_day(starts_at) != start or self._punch_day(ends_at) != end:
            raise AppError(400, "Horário parcial vale para um dia")
        return start, end, starts_at, ends_at

    def _days_only(self, kind: str, data: dict) -> None:
        if kind not in {"vacation", "vacations"}:
            return
        timed = any(data.get(name) is not None for name in ("starts_at", "ends_at", "occurred_at"))
        if timed or data.get("punches"):
            raise AppError(400, "Férias aceitam só período de dias")

    def _assert_span_open(self, tenant_id: int, start: date, end: date, employee_id: int | None = None) -> None:
        day = start
        while day <= end:
            self._assert_open(tenant_id, day, employee_id)
            day += timedelta(days=1)

    def _medical(self, kind: str, data: dict) -> tuple[str | None, str | None, str | None]:
        cid = self._bounded(data.get("cid"), 16)
        crm = self._bounded(data.get("crm"), 32)
        doctor = self._bounded(data.get("doctor_name"), 255)
        if kind not in {"certificate", "certificates"}:
            if cid or crm or doctor:
                raise AppError(400, "CID, CRM e médico só entram no atestado")
            return None, None, None
        if not crm or not doctor:
            raise AppError(400, "Informe o CRM e o nome do médico")
        return cid, crm, doctor

    def _photo_key(self, scope: Scope, kind: str, value) -> str | None:
        if value is None or not str(value).strip():
            return None
        if kind not in {"certificate", "certificates"}:
            raise AppError(400, "A foto só entra no atestado")
        key = str(value).strip()
        prefix = f"{scope.tenant_id}/certificates/"
        if not key.startswith(prefix) or ".." in key:
            raise AppError(400, "A foto não pertence a esta organização")
        return key

    def _period_has_punch(
        self,
        scope: Scope,
        employee_id: int,
        start: date,
        end: date,
        starts_at: datetime | None,
        ends_at: datetime | None,
    ) -> bool:
        window_start, _window_end = day_bounds(start)
        _start, window_end = day_bounds(end)
        rows = self.repo.valid_punches_between(scope.tenant_id, employee_id, window_start, window_end)
        if starts_at is None:
            return len(rows) > 0
        return any(starts_at <= row.occurred_at <= ends_at for row in rows)

    def _photo_url(self, key: str | None) -> str | None:
        if not key:
            return None
        try:
            return self.files.presign_get(key)
        except AppError:
            return None

    def _show_document(self, row: Occurrence) -> Occurrence:
        row.photo_url = self._photo_url(row.photo_key)
        return row

    def _bounded(self, value, limit: int) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        if not text:
            return None
        if len(text) > limit:
            raise AppError(400, "Texto longo demais")
        return text

    def _can_launch(self, scope: Scope, employee: Employee) -> None:
        if scope.role == "admin":
            return
        if scope.role != "manager":
            raise AppError(403, "Sem permissão")
        ids = self._visible_ids(scope) or []
        if employee.id not in ids:
            raise AppError(403, "Sem permissão")

    def _registration(self, scope: Scope, value, current: Employee | None) -> str | None:
        if value is None or not str(value).strip():
            return None
        number = str(value).strip()
        if "|" in number or len(number) > 32:
            raise AppError(400, "Matrícula inválida")
        taken, _total = self.repo.list_rows(
            Employee,
            scope.tenant_id,
            page=1,
            limit=1,
            equals={"registration_number": number},
            descending=False,
        )
        if taken and (current is None or taken[0].id != current.id):
            raise AppError(409, "Matrícula já cadastrada nesta organização")
        return number

    def _qr_card(self, employee: Employee) -> dict | None:
        if not employee.registration_number:
            return None
        unit = self.repo.applicable(employee.id, "unit", self.today())
        if unit is None or unit.reference_id is None:
            return None
        registration = employee.registration_number
        return {
            "employee_id": employee.id,
            "full_name": employee.full_name,
            "unit_id": unit.reference_id,
            "unit_name": self._shown_name(unit, self._entity_names(employee.tenant_id, [unit])),
            "cpf": employee.cpf,
            "registration_number": registration,
            "content": render_code(unit.reference_id, employee.cpf, registration),
        }

    def _clock_identity(self, employee: Employee, day: date):
        if not employee.registration_number:
            raise AppError(400, "Informe a matrícula.")
        unit = self.repo.applicable(employee.id, "unit", day)
        if unit is None or unit.reference_id is None:
            raise AppError(400, "O funcionário não tem empresa vigente.")
        return unit, employee.registration_number

    def _own_clock(self, scope: Scope, employee: Employee) -> None:
        self._known(scope)
        if employee.person_id != scope.person_id:
            raise AppError(403, "Sem permissão")

    def _selfie_key(self, scope: Scope, value) -> str | None:
        if value is None or not str(value).strip():
            return None
        key = str(value).strip()
        prefix = f"{scope.tenant_id}/selfies/"
        if not key.startswith(prefix) or ".." in key:
            return None
        return key

    def _can_punch(self, scope: Scope, employee: Employee, source: str | None) -> None:
        if source == "approved_request":
            return
        if source == "afd":
            self._can_manage_period(scope)
            return
        if source == "manual":
            self._can_launch(scope, employee)
            return
        if source not in {None, "employee", "qr", "face"} or employee.person_id != scope.person_id:
            raise AppError(403, "Sem permissão")

    def _punch_source(self, scope: Scope, employee: Employee) -> str:
        if employee.person_id != scope.person_id:
            raise AppError(403, "Sem permissão")
        return "employee"

    def _assert_working(self, scope: Scope, employee: Employee) -> None:
        current = self.repo.applicable(employee.id, "status", self.today())
        if current is not None and current.label == "dismissed":
            raise AppError(409, "Funcionário desligado")

    def _can_decide(self, scope: Scope, employee: Employee) -> None:
        if scope.role == "admin":
            return
        if scope.role != "manager":
            raise AppError(403, "Sem permissão")
        if employee.person_id == scope.person_id:
            raise AppError(403, "O gestor não decide a própria solicitação")
        ids = self._visible_ids(scope) or []
        if employee.id not in ids:
            raise AppError(403, "Sem permissão")

    def _own_employee(self, scope: Scope) -> Employee:
        rows, _total = self.repo.list_employees(
            scope.tenant_id, ids=None, page=1, limit=1, equals={"person_id": scope.person_id}
        )
        if not rows:
            raise AppError(403, "Seu acesso não está ligado a um funcionário")
        return rows[0]

    def _visible_ids(self, scope: Scope) -> list[int] | None:
        if scope.role == "admin":
            return None
        own_rows, _total = self.repo.list_employees(
            scope.tenant_id, ids=None, page=1, limit=1, equals={"person_id": scope.person_id}
        )
        own = own_rows[0].id if own_rows else None
        if scope.role == "manager" and own is not None:
            ids: list[int] = []
            team = self.repo.applicable(own, "team", self.today())
            if team is not None and team.reference_id is not None:
                ids = self.repo.employee_ids_for_team(scope.tenant_id, team.reference_id, self.today())
            for employee_id in self.repo.employee_ids_managed_by(scope.tenant_id, own, self.today()):
                if employee_id not in ids:
                    ids.append(employee_id)
            if own not in ids:
                ids.append(own)
            return ids
        return [own] if own is not None else []

    def _visible(self, scope: Scope, employee_id: int) -> None:
        ids = self._visible_ids(scope)
        if ids is not None and employee_id not in ids:
            raise AppError(404, "Registro não encontrado")

    def _scoped_list(self, scope: Scope, model, page: int, limit: int, equals: dict):
        self._known(scope)
        filters = dict(equals)
        ids = self._visible_ids(scope)
        if "employee_id" in filters:
            self._visible(scope, int(filters["employee_id"]))
        elif ids is not None:
            if len(ids) == 0:
                return [], 0
            return self.repo.list_rows(
                model,
                scope.tenant_id,
                page=page,
                limit=limit,
                equals=filters,
                descending=True,
                employee_ids=ids,
            )
        return self.repo.list_rows(model, scope.tenant_id, page=page, limit=limit, equals=filters, descending=True)

    def _reason(self, scope: Scope, kind: str | None, reason_id: int | None) -> int | None:
        if kind is not None and reason_id is None and self.repo.reasons_active(scope.tenant_id, kind) > 0:
            raise AppError(400, "Selecione um motivo")
        if reason_id is None:
            return None
        reason = self._row(Reason, scope, int(reason_id))
        if kind is not None and reason.kind != kind:
            raise AppError(400, "O motivo não serve a este lançamento")
        if not reason.active:
            raise AppError(400, "O motivo está inativo")
        return reason.id

    def _request_event(self, scope: Scope, row: TimeRequest, status: str, note: str | None) -> None:
        self.repo.add(
            RequestEvent(
                tenant_id=scope.tenant_id,
                request_id=row.id,
                status=status,
                note=note,
                person_id=scope.person_id,
                created_at=self.clock(),
            )
        )

    def _request_out(self, row: TimeRequest, events: list, punches: list | None = None) -> dict:
        stored = list(punches or [])
        moments = [item.occurred_at for item in stored]
        if not moments and row.kind == "adjustment" and row.occurred_at is not None:
            moments = [row.occurred_at]
        return {
            "id": row.id,
            "employee_id": row.employee_id,
            "kind": row.kind,
            "status": row.status,
            "reason_id": row.reason_id,
            "note": row.note,
            "starts_on": row.starts_on,
            "ends_on": row.ends_on,
            "occurred_at": row.occurred_at,
            "starts_at": row.starts_at,
            "ends_at": row.ends_at,
            "cid": row.cid,
            "crm": row.crm,
            "doctor_name": row.doctor_name,
            "photo_key": row.photo_key,
            "photo_url": self._photo_url(row.photo_key),
            "punches": moments,
            "decision_note": row.decision_note,
            "decided_at": row.decided_at,
            "decided_by_person_id": row.decided_by_person_id,
            "created_at": row.created_at,
            "events": [
                {
                    "id": event.id,
                    "status": event.status,
                    "note": event.note,
                    "person_id": event.person_id,
                    "created_at": event.created_at,
                }
                for event in events
            ],
        }

    def _with_events(self, rows: list[TimeRequest]):
        ids = [row.id for row in rows]
        grouped = self.repo.events_for(ids)
        punches = self.repo.request_punches_for(ids)
        return [(row, grouped.get(row.id, []), punches.get(row.id, [])) for row in rows]

    def _closing_out(self, row: Closing, events: list) -> dict:
        return {
            "id": row.id,
            "year": int(row.year),
            "month": int(row.month),
            "starts_on": row.starts_on,
            "ends_on": row.ends_on,
            "status": row.status,
            "note": row.note,
            "closed_at": row.closed_at,
            "closed_by_person_id": row.closed_by_person_id,
            "events": [
                {
                    "id": event.id,
                    "kind": event.kind,
                    "note": event.note,
                    "person_id": event.person_id,
                    "created_at": event.created_at,
                }
                for event in events
            ],
            "people": [],
            "banks": [],
        }

    def launch_closing_bank(self, scope: Scope, row_id: int, data: dict) -> dict:
        self._can_manage_period(scope)
        row = self._row(Closing, scope, row_id)
        if row.status != "closed":
            raise AppError(409, "O banco do fechamento só abre com o período fechado")
        employee = self._employee(scope, int(data["employee_id"]))
        self._can_launch(scope, employee)
        members = self.repo.member_ids(row.id)
        if members and employee.id not in members:
            raise AppError(409, "Esta pessoa não está neste fechamento")
        if not employee.hour_bank:
            raise AppError(409, "Este funcionário não usa banco de horas")
        when = row.ends_on if row.ends_on <= self.today() else self.today()
        if when < row.starts_on:
            raise AppError(400, "O período ainda não começou")
        kind = data["kind"]
        note = self._note(data.get("note"))
        if note is None:
            raise AppError(400, "Informe a observação")
        wrote = self._apply_closing_launch(scope, row, employee, when, kind, note, data.get("minutes"))
        if kind == "settlement" and not wrote:
            raise AppError(409, "O saldo já está zerado")
        return self.get_closing(scope, row.id, part="banks", employee_id=employee.id, page=1, limit=1)

    def settle_closing_banks(self, scope: Scope, row_id: int, data: dict) -> dict:
        self._can_manage_period(scope)
        row = self._row(Closing, scope, row_id)
        if row.status != "closed":
            raise AppError(409, "O banco do fechamento só abre com o período fechado")
        note = self._note(data.get("note"))
        if note is None:
            raise AppError(400, "Informe a observação")
        when = row.ends_on if row.ends_on <= self.today() else self.today()
        if when < row.starts_on:
            raise AppError(400, "O período ainda não começou")
        outer = self._scratch_scope()
        try:
            wrote = False
            page = 1
            total = 0
            while True:
                targets, total = self._closing_roster_page(scope, row, page=page, limit=50, hour_bank=True)
                if not targets and page == 1:
                    raise AppError(409, "Ninguém neste fechamento usa banco de horas")
                if not targets:
                    break
                for employee in targets:
                    self._can_launch(scope, employee)
                    if self._apply_closing_launch(scope, row, employee, when, "settlement", note, None):
                        wrote = True
                if page * 50 >= total:
                    break
                page += 1
            if not wrote:
                raise AppError(409, "O saldo já está zerado")
            return self.get_closing(scope, row.id, part="banks", page=1, limit=max(total, 1))
        finally:
            self._end_scratch(outer)

    def _apply_closing_launch(self, scope: Scope, row: Closing, employee: Employee, when: date, kind: str, note: str, raw) -> bool:
        previous = [
            item
            for item in self.repo.hour_bank_entries_for(scope.tenant_id, employee.id)
            if item.closing_id == row.id
        ]
        previous_ids = {item.id for item in previous}
        events = self._bank_events(scope, employee, when)
        if previous_ids:
            events = [event for event in events if event[1] not in previous_ids]
        balance = project_balance(events, when)["balance_minutes"]
        if kind == "balance":
            if raw is None:
                raise AppError(400, "Informe o saldo")
            target = int(raw)
            effect = "debit" if target < 0 else "credit"
            minutes = abs(target)
        elif kind == "settlement":
            if balance == 0 and not previous:
                return False
            if balance == 0:
                for item in previous:
                    self.repo.delete(item)
                self._audit(scope, employee.id, "hour_bank", row.id, None, kind, when)
                return True
            effect = "debit" if balance > 0 else "credit"
            minutes = abs(balance)
        else:
            if raw is None or int(raw) <= 0:
                raise AppError(400, "Informe os minutos")
            effect = None
            minutes = int(raw)
        for item in previous:
            self.repo.delete(item)
        self.repo.add(
            HourBankEntry(
                tenant_id=scope.tenant_id,
                employee_id=employee.id,
                kind=kind,
                minutes=int(minutes),
                effect=effect,
                note=note,
                entry_on=when,
                closing_id=row.id,
                created_by_person_id=scope.person_id,
                created_at=self.clock(),
            )
        )
        self._audit(scope, employee.id, "hour_bank", row.id, None, kind, when)
        return True

    def clear_closing_bank(self, scope: Scope, row_id: int, employee_id: int) -> dict:
        self._can_manage_period(scope)
        row = self._row(Closing, scope, row_id)
        if row.status != "closed":
            raise AppError(409, "O banco do fechamento só abre com o período fechado")
        employee = self._employee(scope, employee_id)
        self._can_launch(scope, employee)
        members = self.repo.member_ids(row.id)
        if members and employee.id not in members:
            raise AppError(409, "Esta pessoa não está neste fechamento")
        previous = [
            item
            for item in self.repo.hour_bank_entries_for(scope.tenant_id, employee.id)
            if item.closing_id == row.id
        ]
        if not previous:
            raise AppError(404, "Não há lançamento neste fechamento")
        when = row.ends_on if row.ends_on <= self.today() else self.today()
        kind = previous[-1].kind
        for item in previous:
            self.repo.delete(item)
        self._audit(scope, employee.id, "hour_bank", row.id, kind, None, when)
        return self.get_closing(scope, row.id, part="banks", employee_id=employee.id, page=1, limit=1)

    def _closing_finish(self, row: Closing) -> date | None:
        finish = row.ends_on if row.ends_on <= self.today() else self.today()
        if finish < row.starts_on:
            return None
        return finish

    def _closing_roster_page(
        self,
        scope: Scope,
        row: Closing,
        *,
        page: int,
        limit: int,
        hour_bank: bool | None = None,
        employee_id: int | None = None,
    ) -> tuple[list[Employee], int]:
        finish = self._closing_finish(row)
        if finish is None:
            return [], 0
        return self.repo.list_closing_members(
            scope.tenant_id,
            row.id,
            page=page,
            limit=limit,
            finish=finish,
            starts_on=row.starts_on,
            hour_bank=hour_bank,
            employee_id=employee_id,
        )

    def _closing_person(self, scope: Scope, row: Closing, employee: Employee, finish: date, *, with_days: bool) -> tuple[dict, dict | None]:
        day_start = employee.admission_date if employee.admission_date > row.starts_on else row.starts_on
        totals = {
            "contracted_minutes": 0,
            "worked_minutes": 0,
            "overtime_minutes": 0,
            "night_minutes": 0,
            "night_additional_minutes": 0,
            "shortage_minutes": 0,
            "delay_minutes": 0,
            "absence_days": 0,
            "bank_minutes": 0,
        }
        computed = {
            day["work_date"]: day
            for day in self._day_results(scope, employee, day_start, finish, with_punches=with_days)
        }
        days = []
        cursor = row.starts_on
        while cursor <= row.ends_on:
            day = computed.get(cursor)
            if day is not None:
                for key in totals:
                    if key == "absence_days":
                        continue
                    totals[key] += day[key]
                if day["absence"]:
                    totals["absence_days"] += 1
            if with_days:
                if day is None:
                    days.append(
                        {
                            "work_date": cursor,
                            "punches": [],
                            "contracted_minutes": 0,
                            "worked_minutes": 0,
                            "overtime_minutes": 0,
                            "shortage_minutes": 0,
                            "delay_minutes": 0,
                            "night_minutes": 0,
                            "night_additional_minutes": 0,
                            "bank_minutes": 0,
                            "absence": False,
                        }
                    )
                else:
                    days.append(
                        {
                            "work_date": cursor,
                            "punches": day["punches"],
                            "contracted_minutes": day["contracted_minutes"],
                            "worked_minutes": day["worked_minutes"],
                            "overtime_minutes": day["overtime_minutes"],
                            "shortage_minutes": day["shortage_minutes"],
                            "delay_minutes": day["delay_minutes"],
                            "night_minutes": day["night_minutes"],
                            "night_additional_minutes": day["night_additional_minutes"],
                            "bank_minutes": day["bank_minutes"],
                            "absence": day["absence"],
                        }
                    )
            cursor += timedelta(days=1)
        balance = None
        bank = None
        if employee.hour_bank:
            balance, entries = self._closing_launch(scope, row, employee, finish, list(computed.values()))
            bank = {
                "employee_id": employee.id,
                "full_name": employee.full_name,
                "registration_number": employee.registration_number,
                "balance_minutes": balance,
                "entries": entries,
            }
        unit = self.repo.applicable(employee.id, "unit", finish)
        person = {
            "employee_id": employee.id,
            "full_name": employee.full_name,
            "cpf": employee.cpf,
            "registration_number": employee.registration_number,
            "unit_name": None if unit is None else self._shown_name(unit, self._entity_names(employee.tenant_id, [unit])),
            "hour_bank": bool(employee.hour_bank),
            "balance_minutes": balance,
            "days": days,
            **totals,
        }
        return person, bank

    def _closing_statement(
        self,
        scope: Scope,
        row: Closing,
        *,
        page: int | None = None,
        limit: int | None = None,
        with_days: bool = True,
        include_people: bool = True,
        include_banks: bool = True,
        employee_id: int | None = None,
    ) -> tuple[list[dict], list[dict], int]:
        finish = self._closing_finish(row)
        if finish is None:
            return [], [], 0
        current = page or 1
        size = limit or 20
        people: list[dict] = []
        banks: list[dict] = []
        if include_people:
            roster, total = self._closing_roster_page(scope, row, page=current, limit=size, employee_id=employee_id)
            for employee in roster:
                person, bank = self._closing_person(scope, row, employee, finish, with_days=with_days)
                people.append(person)
                if include_banks and bank is not None:
                    banks.append(bank)
            return people, banks, total
        if include_banks:
            roster, total = self._closing_roster_page(
                scope, row, page=current, limit=size, hour_bank=True, employee_id=employee_id
            )
            for employee in roster:
                banks.append(self._closing_bank_row(scope, row, employee, finish))
            return people, banks, total
        return people, banks, 0

    def _closing_sheets(self, scope: Scope, row: Closing) -> tuple[list[dict], list[dict], int]:
        finish = self._closing_finish(row)
        if finish is None:
            return [], [], 0
        people: list[dict] = []
        page = 1
        total = 0
        while True:
            roster, total = self._closing_roster_page(scope, row, page=page, limit=50)
            if not roster:
                break
            for employee in roster:
                person, _bank = self._closing_person(scope, row, employee, finish, with_days=True)
                people.append(person)
            if page * 50 >= total:
                break
            page += 1
        return people, [], total

    def _closing_launch(
        self,
        scope: Scope,
        row: Closing,
        employee: Employee,
        finish: date,
        computed: list[dict] | None = None,
    ) -> tuple[int, list[dict]]:
        events = self._bank_events(scope, employee, finish, computed)
        after = project_balance(events, finish)["balance_minutes"]
        saved = [
            item
            for item in self.repo.hour_bank_entries_for(scope.tenant_id, employee.id)
            if item.closing_id == row.id
        ]
        saved_ids = {item.id for item in saved}
        before = project_balance([event for event in events if event[1] not in saved_ids], finish)["balance_minutes"]
        entries = [
            {
                "id": item.id,
                "kind": item.kind,
                "effect": item.effect,
                "minutes": item.minutes,
                "note": item.note,
                "entry_on": item.entry_on,
                "balance_before_minutes": before,
                "balance_after_minutes": after,
            }
            for item in saved
        ]
        return after, entries

    def _closing_bank_row(self, scope: Scope, row: Closing, employee: Employee, finish: date) -> dict:
        balance, entries = self._closing_launch(scope, row, employee, finish)
        return {
            "employee_id": employee.id,
            "full_name": employee.full_name,
            "registration_number": employee.registration_number,
            "balance_minutes": balance,
            "entries": entries,
        }

    def list_notice_preferences(self, scope: Scope, page: int, limit: int, equals: dict):
        self._known(scope)
        filters = dict(equals)
        filters["person_id"] = scope.person_id
        return self.repo.list_rows(
            NoticePreference, scope.tenant_id, page=page, limit=limit, equals=filters, descending=True
        )

    def get_notice_preference(self, scope: Scope, row_id: int) -> NoticePreference:
        self._known(scope)
        row = self._row(NoticePreference, scope, row_id)
        if row.person_id != scope.person_id:
            raise AppError(404, "Registro não encontrado")
        return row

    def create_notice_preference(self, scope: Scope, data: dict) -> NoticePreference:
        self._known(scope)
        kind = str(data["kind"])
        if kind not in PHRASES:
            raise AppError(400, "Aviso inválido")
        channel = str(data.get("channel") or "both")
        if channel not in CHANNELS:
            raise AppError(400, "Canal inválido")
        if self.repo.preference_for(scope.tenant_id, scope.person_id, kind) is not None:
            raise AppError(409, "Esse aviso já está configurado")
        return self.repo.add(
            NoticePreference(
                tenant_id=scope.tenant_id,
                person_id=scope.person_id,
                kind=kind,
                enabled=bool(data["enabled"]),
                channel=channel,
                created_at=self.clock(),
            )
        )

    def update_notice_preference(self, scope: Scope, row_id: int, data: dict) -> NoticePreference:
        row = self.get_notice_preference(scope, row_id)
        if "enabled" in data and data["enabled"] is not None:
            row.enabled = bool(data["enabled"])
        if "channel" in data and data["channel"] is not None:
            channel = str(data["channel"])
            if channel not in CHANNELS:
                raise AppError(400, "Canal inválido")
            row.channel = channel
        self.repo.add(row)
        return row

    def delete_notice_preference(self, scope: Scope, row_id: int) -> None:
        row = self.get_notice_preference(scope, row_id)
        self.repo.delete(row)

    def list_notice_emails(self, scope: Scope, page: int, limit: int, equals: dict):
        self._known(scope)
        filters = dict(equals)
        if scope.role != "admin":
            filters["person_id"] = scope.person_id
        return self.repo.list_rows(NoticeEmail, scope.tenant_id, page=page, limit=limit, equals=filters, descending=True)

    def get_notice_email(self, scope: Scope, row_id: int) -> NoticeEmail:
        self._known(scope)
        row = self._row(NoticeEmail, scope, row_id)
        if scope.role != "admin" and row.person_id != scope.person_id:
            raise AppError(404, "Registro não encontrado")
        return row

    def refuse_notice_email_write(self, scope: Scope, row_id: int | None = None) -> None:
        self._known(scope)
        if row_id is not None:
            self.get_notice_email(scope, row_id)
        raise AppError(409, "E-mail de aviso é gerado pelo sistema.")

    def assert_usable(self, scope: Scope) -> None:
        self._known(scope)
        if self._needs_plan(scope):
            raise AppError(403, "Contrate um plano.")
        subscription = self._prepare_billing(scope)
        if subscription is not None and subscription.status == "blocked":
            raise AppError(403, "O uso está bloqueado por inadimplência.")

    def list_subscriptions(self, scope: Scope, page: int, limit: int, equals: dict):
        self._admin(scope)
        row = self._prepare_billing(scope)
        if row is None:
            return [], 0
        if equals.get("status") not in (None, row.status):
            return [], 0
        items = [self._subscription_out(row)]
        start = (page - 1) * limit
        return items[start : start + limit], len(items)

    def get_subscription(self, scope: Scope, row_id: int) -> dict:
        self._admin(scope)
        row = self._prepare_billing(scope)
        if row is None or row.id != row_id:
            raise AppError(404, "Registro não encontrado")
        return self._subscription_out(row)

    def create_subscription(self, scope: Scope, data: dict) -> dict:
        self._admin(scope)
        if self.repo.subscription_for(scope.tenant_id) is not None:
            raise AppError(409, "A organização já tem um plano")
        capacity = self._capacity_block(int(data["capacity"]))
        self._fit_capacity(scope, capacity)
        tenant = self._billing_tenant(scope)
        start = self.today()
        end = add_months(start, 1)
        row = self.repo.add(
            Subscription(
                tenant_id=scope.tenant_id,
                status="active",
                capacity=capacity,
                payment_method=data["payment_method"],
                period_start=start,
                period_end=end,
                contracted_at=self.clock(),
            )
        )
        tenant.employee_capacity = capacity
        self._open_charge(scope, row, "monthly", monthly_amount(capacity), capacity, start, end)
        return self._subscription_out(row)

    def update_subscription(self, scope: Scope, row_id: int, data: dict) -> dict:
        self._admin(scope)
        row = self._prepare_billing(scope)
        if row is None or row.id != row_id:
            raise AppError(404, "Registro não encontrado")
        changed = False
        if data.get("payment_method"):
            row.payment_method = data["payment_method"]
            changed = True
        if data.get("capacity") is not None:
            capacity = self._capacity_block(int(data["capacity"]))
            if capacity != row.capacity:
                if capacity > row.capacity:
                    amount = prorate(row.capacity, capacity, row.period_start, row.period_end, self.today())
                    if amount > 0:
                        self._open_charge(scope, row, "upgrade", amount, capacity, self.today(), row.period_end)
                else:
                    self._fit_capacity(scope, capacity)
                row.capacity = capacity
                self._billing_tenant(scope).employee_capacity = capacity
                changed = True
            elif not changed:
                raise AppError(400, "A capacidade informada já é a do plano")
        if not changed:
            raise AppError(400, "Informe a capacidade ou a forma de pagamento")
        self.repo.add(row)
        self._refresh_billing(scope, row)
        return self._subscription_out(row)

    def refuse_subscription_delete(self, scope: Scope, row_id: int) -> None:
        self.get_subscription(scope, row_id)
        raise AppError(409, "Assinatura permanece no histórico.")

    def list_charges(self, scope: Scope, page: int, limit: int, equals: dict):
        self._admin(scope)
        self._prepare_billing(scope)
        return self.repo.list_rows(Charge, scope.tenant_id, page=page, limit=limit, equals=equals, descending=True)

    def get_charge(self, scope: Scope, row_id: int) -> Charge:
        self._admin(scope)
        self._prepare_billing(scope)
        return self._row(Charge, scope, row_id)

    def refuse_charge_create(self, scope: Scope) -> None:
        self._admin(scope)
        raise AppError(409, "Cobrança é gerada pelo sistema.")

    def pay_charge(self, scope: Scope, row_id: int, data: dict) -> Charge:
        self._admin(scope)
        if data.get("paid") is not True:
            raise AppError(400, "Informe o pagamento")
        row = self._row(Charge, scope, row_id)
        if row.status == "paid":
            raise AppError(409, "Esta cobrança já está paga")
        row.status = "paid"
        row.paid_at = self.clock()
        self.repo.add(row)
        subscription = self.repo.subscription_for(scope.tenant_id)
        if subscription is not None:
            self._refresh_billing(scope, subscription)
        return row

    def refuse_charge_delete(self, scope: Scope, row_id: int) -> None:
        self.get_charge(scope, row_id)
        raise AppError(409, "Cobrança permanece no histórico.")

    def dispatch_notices(self, scope: Scope) -> dict:
        self._can_manage_period(scope)
        before = self.repo.count_model(Notice, tenant_id=scope.tenant_id)
        self._daily_incomplete(scope)
        self._daily_closing(scope)
        self._daily_trial(scope)
        self._plan_notice(scope)
        created = self.repo.count_model(Notice, tenant_id=scope.tenant_id) - before
        return {"created": created}

    def _needs_plan(self, scope: Scope) -> bool:
        if self.repo.subscription_for(scope.tenant_id) is not None:
            return False
        tenant = self.repo.get_tenant(scope.tenant_id)
        ends = None if tenant is None else getattr(tenant, "trial_ends_at", None)
        if ends is None:
            return False
        if ends.tzinfo is None:
            ends = ends.replace(tzinfo=BR)
        return self.clock() >= ends

    def _prepare_billing(self, scope: Scope) -> Subscription | None:
        row = self.repo.subscription_for(scope.tenant_id)
        if row is None:
            return None
        while row.period_end <= self.today():
            start = row.period_end
            end = add_months(start, 1)
            row.period_start = start
            row.period_end = end
            self.repo.add(row)
            self._open_charge(scope, row, "monthly", monthly_amount(row.capacity), row.capacity, start, end)
        self._refresh_billing(scope, row)
        return row

    def _refresh_billing(self, scope: Scope, row: Subscription) -> None:
        opened = self.repo.open_charges(scope.tenant_id)
        if not opened:
            row.status = "active"
            self.repo.add(row)
            return
        oldest = min(item.due_on for item in opened)
        if self.today() >= oldest + timedelta(days=7):
            row.status = "blocked"
        elif self.today() > oldest:
            row.status = "delinquent"
            for person_id in self._admin_ids(scope):
                self._deliver(scope, person_id, None, "billing_overdue", daily=True)
        else:
            row.status = "active"
        self.repo.add(row)

    def _open_charge(
        self,
        scope: Scope,
        row: Subscription,
        kind: str,
        amount: int,
        capacity: int,
        start: date,
        end: date,
    ) -> Charge:
        return self.repo.add(
            Charge(
                tenant_id=scope.tenant_id,
                subscription_id=row.id,
                kind=kind,
                amount_cents=amount,
                capacity=capacity,
                due_on=start,
                status="open",
                payment_method=row.payment_method,
                period_start=start,
                period_end=end,
                paid_at=None,
                created_at=self.clock(),
            )
        )

    def _subscription_out(self, row: Subscription) -> dict:
        return {
            "id": row.id,
            "status": row.status,
            "capacity": row.capacity,
            "payment_method": row.payment_method,
            "price_cents": PRICE_CENTS,
            "monthly_amount_cents": monthly_amount(row.capacity),
            "period_start": row.period_start,
            "period_end": row.period_end,
            "contracted_at": row.contracted_at,
        }

    def _capacity_block(self, capacity: int) -> int:
        if capacity < MIN_CAPACITY or capacity > MAX_CAPACITY or capacity % 10 != 0:
            raise AppError(400, "A capacidade é um múltiplo de 10, de 10 a 200")
        return capacity

    def _fit_capacity(self, scope: Scope, capacity: int) -> None:
        if self.repo.count_active(scope.tenant_id, self.today()) > capacity:
            raise AppError(409, "A nova capacidade não cabe nos funcionários contabilizados")

    def _billing_tenant(self, scope: Scope):
        tenant = self.repo.get_tenant(scope.tenant_id)
        if tenant is None:
            raise AppError(404, "Organização não encontrada")
        return tenant

    def _notify_reviewers(self, scope: Scope, employee: Employee, kind: str) -> None:
        for person_id in self._reviewer_ids(scope, employee):
            self._deliver(scope, person_id, employee.id, kind, daily=False)

    def _notify_employee(self, scope: Scope, employee: Employee, kind: str) -> None:
        if employee.person_id is None:
            return
        self._deliver(scope, employee.person_id, employee.id, kind, daily=False)

    def _deliver(self, scope: Scope, person_id: int, employee_id: int | None, kind: str, *, daily: bool) -> None:
        phrase = PHRASES[kind]
        channels = self._notice_channels(scope, person_id, kind)
        if not channels:
            return
        if daily:
            start, end = day_bounds(self.today())
            if "system" in channels and self.repo.notice_between(scope.tenant_id, person_id, kind, start, end) is not None:
                channels.discard("system")
            if "email" in channels and self.repo.email_between(scope.tenant_id, person_id, kind, start, end) is not None:
                channels.discard("email")
            if not channels:
                return
        if "system" in channels:
            self._notice(scope, person_id, employee_id, kind, phrase, phrase)
        if "email" in channels:
            employee = self.repo.employee_by_person(scope.tenant_id, person_id)
            self.repo.add(
                NoticeEmail(
                    tenant_id=scope.tenant_id,
                    person_id=person_id,
                    employee_id=employee_id,
                    kind=kind,
                    body=phrase,
                    address=None if employee is None else employee.email,
                    created_at=self.clock(),
                )
            )

    def _notice_channels(self, scope: Scope, person_id: int, kind: str) -> set[str]:
        row = self.repo.preference_for(scope.tenant_id, person_id, kind)
        if row is None:
            return notice_channels(True, "both")
        return notice_channels(bool(row.enabled), getattr(row, "channel", None))

    def _admin_ids(self, scope: Scope) -> list[int]:
        return [row.person_id for row in self.repo.role_memberships(scope.tenant_id, "admin")]

    def _closer_ids(self, scope: Scope) -> list[int]:
        found: list[int] = []
        for role in ("admin", "manager"):
            for row in self.repo.role_memberships(scope.tenant_id, role):
                if row.person_id not in found:
                    found.append(row.person_id)
        return found

    def _reviewer_ids(self, scope: Scope, employee: Employee) -> list[int]:
        found = self._admin_ids(scope)
        team = self.repo.applicable(employee.id, "team", self.today())
        member_ids: set[int] = set()
        if team is not None and team.reference_id is not None:
            member_ids = set(self.repo.employee_ids_for_team(scope.tenant_id, team.reference_id, self.today()))
        named = {
            item.reference_id
            for item in self.repo.managers_on([employee.id], self.today()).get(employee.id, [])
            if item.reference_id is not None
        }
        for manager in self.repo.role_memberships(scope.tenant_id, "manager"):
            row = self.repo.employee_by_person(scope.tenant_id, manager.person_id)
            if row is None or manager.person_id in found:
                continue
            if row.id in member_ids or row.id in named:
                found.append(manager.person_id)
        return found

    def _daily_incomplete(self, scope: Scope) -> None:
        start = date(self.today().year, self.today().month, 1)
        found = False
        outer = self._scratch_scope()
        try:
            page = 1
            while True:
                rows, total = self.repo.list_employees(scope.tenant_id, ids=None, page=page, limit=100, equals={})
                for employee in rows:
                    if employee.admission_date > self.today():
                        continue
                    first = employee.admission_date if employee.admission_date > start else start
                    if any(day["incomplete"] for day in self._day_results(scope, employee, first, self.today())):
                        found = True
                        if employee.person_id is not None:
                            self._deliver(scope, employee.person_id, employee.id, "incomplete_punch", daily=True)
                if page * 100 >= total or not rows:
                    break
                page += 1
        finally:
            self._end_scratch(outer)
        if not found:
            return
        for person_id in self._closer_ids(scope):
            self._deliver(scope, person_id, None, "incomplete_punch", daily=True)

    def _daily_closing(self, scope: Scope) -> None:
        blocked = False
        soon = False
        opened = self.repo.open_closings(scope.tenant_id)
        for row in opened:
            try:
                self._assert_can_close(scope, row.starts_on, row.ends_on, set(self.repo.member_ids(row.id)))
            except AppError as error:
                if error.status_code != 409:
                    raise
                blocked = True
            if (row.ends_on - self.today()).days <= 3:
                soon = True
        if not opened:
            month = self.today().month
            year = self.today().year
            if month == 12:
                month_end = date(year, 12, 31)
            else:
                month_end = date(year, month + 1, 1) - timedelta(days=1)
            if 0 <= (month_end - self.today()).days <= 3:
                soon = True
        people = self._closer_ids(scope)
        if blocked:
            for person_id in people:
                self._deliver(scope, person_id, None, "closing_pending", daily=True)
        if soon:
            for person_id in people:
                self._deliver(scope, person_id, None, "closing_soon", daily=True)

    def _daily_trial(self, scope: Scope) -> None:
        tenant = self.repo.get_tenant(scope.tenant_id)
        ends = None if tenant is None else getattr(tenant, "trial_ends_at", None)
        if ends is None:
            return
        end_day = ends.astimezone(BR).date() if ends.tzinfo is not None else ends.date()
        left = (end_day - self.today()).days
        if left < 0 or left > 3:
            return
        for person_id in self._admin_ids(scope):
            self._deliver(scope, person_id, None, "trial_ending", daily=True)

    def _notice(self, scope: Scope, person_id: int, employee_id: int | None, kind: str, title: str, body: str) -> None:
        self.repo.add(
            Notice(
                tenant_id=scope.tenant_id,
                person_id=person_id,
                employee_id=employee_id,
                kind=kind,
                title=title,
                body=body,
                read_at=None,
                created_at=self.clock(),
            )
        )

    def _audit(
        self,
        scope: Scope,
        employee_id: int | None,
        kind: str,
        subject_id: int,
        previous: str | None,
        new: str | None,
        valid_from: date | None,
    ) -> None:
        action = AUDIT_ACTION.get(kind, "Registro")
        if kind == "punch":
            action = "Registro de marcação"
        elif kind == "punch_correction":
            action = "Correção de marcação"
        elif kind == "punch_restore":
            action = "Restauração de marcação"
        elif kind == "occurrence":
            action = "Registro de ocorrência"
        elif kind == "occurrence_delete":
            action = "Exclusão de ocorrência"
        elif kind == "request":
            action = "Decisão de solicitação"
        elif kind == "fiscal_file":
            action = "Exportação de arquivo fiscal"
        elif kind == "closing":
            action = {
                "closed": "Fechamento do período",
                "cancelled": "Cancelamento do período",
                "open": "Reabertura do período",
            }.get(new or "", "Fechamento do período")
        self.repo.add(
            Audit(
                tenant_id=scope.tenant_id,
                person_id=scope.person_id,
                action=action,
                employee_id=employee_id,
                subject_kind=kind,
                subject_id=subject_id,
                previous_label=previous,
                new_label=new,
                valid_from=valid_from,
                created_at=self.clock(),
            )
        )

    def _assert_no_pending(self, scope: Scope, employee_id: int, start: date, end: date) -> None:
        for request in self.repo.pending_overlapping(scope.tenant_id, start, end):
            if request.employee_id == employee_id:
                raise AppError(409, "Há solicitação pendente cobrindo este dia")

    def _assert_open(self, tenant_id: int, day: date, employee_id: int | None = None) -> None:
        if employee_id is None:
            found = self.repo.closed_covering(tenant_id, day)
        else:
            found = self.repo.closed_for_employee(tenant_id, day, employee_id)
        if found is not None:
            raise AppError(409, "Período fechado")

    def _can_manage_period(self, scope: Scope) -> None:
        self._known(scope)
        if scope.role not in {"admin", "manager"}:
            raise AppError(403, "Sem permissão")

    def closing_candidates(self, scope: Scope, data: dict) -> list[dict]:
        self._can_manage_period(scope)
        start, end = self._closing_bounds(data)
        day = end if end <= self.today() else start if start > self.today() else self.today()
        places, situation = self._place_sets(
            {
                "unit_id": data.get("unit_id"),
                "team_id": data.get("team_id"),
                "job_id": data.get("job_id"),
                "journey_id": data.get("journey_id"),
                "situation": data.get("situation"),
            }
        )
        category_values = self._id_list(data.get("category_value_id"))
        matched = self._category_value_ids(scope, category_values, day) if category_values else None
        search = str(data.get("q") or "").strip()
        found = []
        for employee in self._report_people(scope, None):
            if employee.admission_date > end:
                continue
            if search and not employee_search_matches(employee.full_name, employee.cpf, employee.registration_number, search):
                continue
            if (places or situation) and not self._on_places(employee.id, day, places, situation):
                continue
            if matched is not None and employee.id not in matched:
                continue
            found.append(
                {
                    "id": employee.id,
                    "full_name": employee.full_name,
                    "registration_number": employee.registration_number,
                    "hour_bank": bool(employee.hour_bank),
                }
            )
        found.sort(key=lambda item: item["full_name"].casefold())
        return found

    def _chosen_closing_people(self, scope: Scope, end: date, raw) -> list[Employee]:
        if raw is None:
            people = []
            page = 1
            while True:
                rows, total = self.repo.list_employees(scope.tenant_id, ids=None, page=page, limit=100, equals={})
                people.extend(person for person in rows if person.admission_date <= end)
                if not rows or page * 100 >= total:
                    break
                page += 1
        else:
            if not raw:
                raise AppError(400, "Selecione quem entra no fechamento")
            people = []
            seen: set[int] = set()
            for item in raw:
                employee = self._employee(scope, int(item))
                self._visible(scope, employee.id)
                if employee.admission_date > end:
                    raise AppError(400, f"{employee.full_name} ainda não estava admitido neste período")
                if employee.id in seen:
                    continue
                seen.add(employee.id)
                people.append(employee)
        if not people:
            raise AppError(400, "Selecione quem entra no fechamento")
        return people

    def _closing_conflict(self, tenant_id: int, start: date, end: date, employee_ids: set[int]) -> list[int]:
        blocked: set[int] = set()
        for row in self.repo.overlapping_closings(tenant_id, start, end):
            if row.status == "cancelled":
                continue
            members = set(self.repo.member_ids(row.id))
            if not members:
                blocked.update(employee_ids)
            else:
                blocked.update(members & employee_ids)
        return sorted(blocked)

    def _closing_bounds(self, data: dict) -> tuple[date, date]:
        start = data.get("starts_on")
        end = data.get("ends_on")
        if start is None:
            year = data.get("year")
            month = data.get("month")
            if year is None or month is None:
                raise AppError(400, "Informe o período")
            start = date(int(year), int(month), 1)
            if int(month) == 12:
                end = date(int(year), 12, 31)
            else:
                end = date(int(year), int(month) + 1, 1) - timedelta(days=1)
        else:
            end = end or start
        if end < start:
            raise AppError(400, "O fim precisa ser igual ou posterior ao início")
        return start, end

    def _required_note(self, data: dict) -> str:
        note = self._note(data.get("note"))
        if not note:
            raise AppError(400, "Informe a observação")
        return note

    def _assert_can_close(self, scope: Scope, start: date, end: date, employee_ids: set[int] | None = None) -> None:
        def included(employee_id: int) -> bool:
            return not employee_ids or employee_id in employee_ids

        waiting: set[int] = set()
        for request in self.repo.pending_overlapping(scope.tenant_id, start, end):
            finish = request.ends_on or request.starts_on
            if request.starts_on <= end and finish >= start and included(request.employee_id):
                waiting.add(request.employee_id)
        if waiting:
            raise AppError(409, "Há solicitação pendente no período", sorted(waiting))
        incomplete: set[int] = set()
        owns = self._scratch is None
        outer = self._scratch_scope() if owns else None
        try:
            page = 1
            while True:
                rows, total = self.repo.list_employees(scope.tenant_id, ids=None, page=page, limit=100, equals={})
                for employee in rows:
                    if not included(employee.id) or employee.admission_date > end:
                        continue
                    first = employee.admission_date if employee.admission_date > start else start
                    for day in self._day_results(scope, employee, first, end):
                        if day["incomplete"]:
                            incomplete.add(employee.id)
                            break
                if page * 100 >= total or not rows:
                    break
                page += 1
        finally:
            if owns:
                self._end_scratch(outer)
        if incomplete:
            raise AppError(409, "Há ponto incompleto no período", sorted(incomplete))
        conflict: set[int] = set()
        for occurrence in self.repo.blocking_occurrences(scope.tenant_id, start, end):
            if included(occurrence.employee_id) and self._conflict_in_closing(scope, occurrence, start, end):
                conflict.add(occurrence.employee_id)
        if conflict:
            raise AppError(409, "Há conflito entre abono ou atestado e marcação no período", sorted(conflict))

    def _conflict_in_closing(self, scope: Scope, occurrence, start: date, end: date) -> bool:
        if occurrence.starts_at is not None and occurrence.ends_at is not None:
            if not (start <= occurrence.starts_on <= end):
                return False
            return self._period_has_punch(
                scope,
                occurrence.employee_id,
                occurrence.starts_on,
                occurrence.ends_on,
                occurrence.starts_at,
                occurrence.ends_at,
            )
        overlap_start = occurrence.starts_on if occurrence.starts_on > start else start
        overlap_end = occurrence.ends_on if occurrence.ends_on < end else end
        if overlap_end < overlap_start:
            return False
        return self._period_has_punch(scope, occurrence.employee_id, overlap_start, overlap_end, None, None)

    def _row(self, model, scope: Scope, row_id: int):
        row = self.repo.get_row(model, scope.tenant_id, row_id)
        if row is None:
            raise AppError(404, "Registro não encontrado")
        return row

    def _employee(self, scope: Scope, employee_id: int) -> Employee:
        return self._row(Employee, scope, employee_id)

    def _staff(self, scope: Scope) -> None:
        self._known(scope)
        if scope.role not in {"admin", "manager"}:
            raise AppError(403, "Sem permissão")

    def _admin(self, scope: Scope) -> None:
        self._known(scope)
        if scope.role != "admin":
            raise AppError(403, "Sem permissão")

    def _known(self, scope: Scope) -> None:
        if scope.tenant_id is None or scope.role not in {"admin", "manager", "member"}:
            raise AppError(403, "Sem permissão")

    def _email(self, value) -> str | None:
        if value is None or not str(value).strip():
            return None
        text = str(value).strip().lower()
        if "@" not in text or text.startswith("@") or text.endswith("@") or len(text) > 255:
            raise AppError(400, "E-mail inválido")
        return text

    def _note(self, value) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        return text or None

    def _punch_day(self, value: datetime) -> date:
        return value.astimezone(BR).date()

    def _filter_day(self, value) -> date:
        if isinstance(value, datetime):
            return value.astimezone(BR).date()
        if isinstance(value, date):
            return value
        try:
            return date.fromisoformat(str(value).strip()[:10])
        except ValueError as error:
            raise AppError(400, "Data inválida") from error
