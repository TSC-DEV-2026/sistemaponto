from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from app.core.billing import MAX_CAPACITY, MIN_CAPACITY, PRICE_CENTS, monthly_amount, prorate
from app.core.cpf import normalize_cpf
from app.core.fiscal_file import parse_afd, render_aej, render_afd, render_payroll
from app.core.hour_bank import add_months, project_balance
from app.core.time_result import settle_day
from app.core.exceptions import AppError
from app.core.notices import PHRASES
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
    AUDIT_ACTION,
    BR,
    CERTIFICATE_CONFLICT,
    MANUAL_OCCURRENCE_KINDS,
    OCCURRENCE_FOR_REQUEST,
    REASON_FOR_REQUEST,
    REASON_KINDS,
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
from app.models.workforce import (
    Audit,
    Charge,
    Closing,
    ClosingEvent,
    CostCenter,
    Employee,
    EmployeeVigency,
    FiscalFile,
    Holiday,
    HourBankEntry,
    NoticeEmail,
    NotificationPreference,
    Job,
    Journey,
    LaborAgreement,
    LaborUnion,
    Notification,
    Occurrence,
    Punch,
    PunchRule,
    Reason,
    RequestEvent,
    RequestPunch,
    Sector,
    Subscription,
    Team,
    TimeRequest,
    Unit,
)
from app.repositories.workforce_repository import WorkforceRepository
from app.services.storage_service import StorageService

UNIQUE_MODELS = {
    Job,
    CostCenter,
    Unit,
    Sector,
    Team,
    Journey,
    LaborUnion,
    LaborAgreement,
    PunchRule,
    Reason,
}
REF_MODELS = {
    "job": Job,
    "journey": Journey,
    "cost_center": CostCenter,
    "unit": Unit,
    "sector": Sector,
    "team": Team,
    "union": LaborUnion,
    "manager": Employee,
}
KIND_FIELD = {
    "status": "situation",
    "job": "job_label",
    "journey": "journey_label",
    "cost_center": "cost_center_label",
    "unit": "unit_label",
    "sector": "sector_label",
    "team": "team_label",
    "union": "union_label",
    "manager": "manager_label",
}


@dataclass
class Scope:
    person_id: int
    tenant_id: int
    role: str


class WorkforceService:
    def __init__(self, repo: WorkforceRepository, *, today=today_in_brazil, clock=now_utc) -> None:
        self.repo = repo
        self.today = today
        self.clock = clock

    def list_named(self, model, scope: Scope, page: int, limit: int, equals: dict):
        self._known(scope)
        return self.repo.list_rows(model, scope.tenant_id, page=page, limit=limit, equals=equals, descending=False)

    def get_named(self, model, scope: Scope, row_id: int):
        self._known(scope)
        return self._row(model, scope, row_id)

    def create_named(self, model, scope: Scope, data: dict):
        self._admin(scope)
        payload = self._prepare_named(model, scope, data, current=None)
        self._unique_name(model, scope.tenant_id, payload, exclude_id=None)
        return self.repo.add(model(tenant_id=scope.tenant_id, **payload))

    def update_named(self, model, scope: Scope, row_id: int, data: dict):
        self._admin(scope)
        row = self._row(model, scope, row_id)
        payload = self._prepare_named(model, scope, data, current=row)
        if "name" in payload or any(key in payload for key in ("unit_id", "sector_id")):
            merged = {
                "name": payload.get("name", row.name),
                "unit_id": payload.get("unit_id", getattr(row, "unit_id", None)),
                "sector_id": payload.get("sector_id", getattr(row, "sector_id", None)),
                "kind": getattr(row, "kind", None),
            }
            self._unique_name(model, scope.tenant_id, merged, exclude_id=row.id)
        for key, value in payload.items():
            setattr(row, key, value)
        return self.repo.add(row)

    def delete_named(self, model, scope: Scope, row_id: int) -> None:
        self._admin(scope)
        row = self._row(model, scope, row_id)
        self._guard_catalog(model, row)
        self.repo.delete(row)

    def list_employees(self, scope: Scope, page: int, limit: int, equals: dict):
        self._known(scope)
        ids = self._visible_ids(scope)
        if "person_id" in equals and ids is not None:
            own = self.repo.list_employees(
                scope.tenant_id, ids=None, page=1, limit=1, equals={"person_id": equals["person_id"]}
            )[0]
            if not own or own[0].id not in ids:
                return [], 0
        return self.repo.list_employees(scope.tenant_id, ids=ids, page=page, limit=limit, equals=equals)

    def employees_out(self, rows: list[Employee]) -> list[dict]:
        labels = self.repo.labels_on([row.id for row in rows], self.today())
        return [self._employee_out(row, labels.get(row.id, {})) for row in rows]

    def get_employee(self, scope: Scope, employee_id: int) -> dict:
        self._known(scope)
        row = self._employee(scope, employee_id)
        self._visible(scope, row.id)
        labels = self.repo.labels_on([row.id], self.today())
        return self._employee_out(row, labels.get(row.id, {}))

    def create_employee(self, scope: Scope, data: dict) -> dict:
        self._admin(scope)
        payload = self._employee_payload(scope, data, current=None)
        self._assert_open(scope.tenant_id, payload["admission_date"])
        self._assert_capacity(scope)
        row = self.repo.add(Employee(tenant_id=scope.tenant_id, **payload))
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
        labels = self.repo.labels_on([row.id], self.today())
        return self._employee_out(row, labels.get(row.id, {}))

    def update_employee(self, scope: Scope, employee_id: int, data: dict) -> dict:
        self._admin(scope)
        row = self._employee(scope, employee_id)
        payload = self._employee_payload(scope, data, current=row)
        if "admission_date" in payload:
            self._assert_open(scope.tenant_id, payload["admission_date"])
        for key, value in payload.items():
            setattr(row, key, value)
        self.repo.add(row)
        labels = self.repo.labels_on([row.id], self.today())
        return self._employee_out(row, labels.get(row.id, {}))

    def delete_employee(self, scope: Scope, employee_id: int) -> None:
        self._admin(scope)
        row = self._employee(scope, employee_id)
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
        return self.repo.list_rows(
            EmployeeVigency, scope.tenant_id, page=page, limit=limit, equals=equals, descending=True
        )

    def get_vigency(self, scope: Scope, row_id: int) -> EmployeeVigency:
        self._known(scope)
        row = self._row(EmployeeVigency, scope, row_id)
        self._visible(scope, row.employee_id)
        return row

    def create_vigency(self, scope: Scope, data: dict) -> EmployeeVigency:
        self._admin(scope)
        employee = self._employee(scope, int(data["employee_id"]))
        kind = data["kind"]
        valid_from = data["valid_from"]
        self._assert_open(scope.tenant_id, valid_from)
        reference_id, label = self._vigency_target(scope, employee, kind, data, valid_from)
        if kind == "status" and label == "active" and not self._occupies(employee.id, self.today()):
            self._assert_capacity(scope)
        current = self.repo.open_vigency(employee.id, kind)
        if current is not None and current.valid_from == valid_from:
            previous = current.label
            current.reference_id = reference_id
            current.label = label
            current.note = self._note(data.get("note"))
            self.repo.add(current)
            self._audit(scope, employee.id, kind, current.id, previous, label, valid_from)
            return current
        if current is not None:
            end = previous_end(current.valid_from, valid_from)
            self._assert_open(scope.tenant_id, end)
            current.valid_to = end
            self.repo.add(current)
        row = self.repo.add(
            EmployeeVigency(
                tenant_id=scope.tenant_id,
                employee_id=employee.id,
                kind=kind,
                reference_id=reference_id,
                label=label,
                valid_from=valid_from,
                valid_to=None,
                note=self._note(data.get("note")),
            )
        )
        self._audit(scope, employee.id, kind, row.id, current.label if current else None, label, valid_from)
        return row

    def update_vigency(self, scope: Scope, row_id: int, data: dict) -> EmployeeVigency:
        self._admin(scope)
        row = self._row(EmployeeVigency, scope, row_id)
        self._assert_open(scope.tenant_id, row.valid_from)
        if "note" in data:
            row.note = self._note(data.get("note"))
            self.repo.add(row)
        return row

    def delete_vigency(self, scope: Scope, row_id: int) -> None:
        self._known(scope)
        self._row(EmployeeVigency, scope, row_id)
        raise AppError(409, "A vigência permanece no histórico.")

    def list_punches(self, scope: Scope, page: int, limit: int, equals: dict):
        return self._scoped_list(scope, Punch, page, limit, equals)

    def get_punch(self, scope: Scope, row_id: int) -> Punch:
        row = self._row(Punch, scope, row_id)
        self._visible(scope, row.employee_id)
        return row

    def create_punch(self, scope: Scope, data: dict, *, source: str | None = None, request_id: int | None = None) -> Punch:
        employee = self._employee(scope, int(data["employee_id"]))
        self._can_punch(scope, employee, source)
        occurred = assert_aware(data["occurred_at"])
        assert_not_future(occurred, self.today())
        self._assert_working(scope, employee)
        self._assert_open(scope.tenant_id, self._punch_day(occurred))
        row = self.repo.add(
            Punch(
                tenant_id=scope.tenant_id,
                employee_id=employee.id,
                occurred_at=occurred,
                source=source or self._punch_source(scope, employee),
                request_id=request_id,
                note=self._note(data.get("note")),
                valid=True,
                voided_at=None,
                created_at=self.clock(),
            )
        )
        self._audit(scope, employee.id, "punch", row.id, None, "Marcação", self._punch_day(occurred))
        return row

    def correct_punches(self, scope: Scope, data: dict) -> dict:
        self._admin(scope)
        employee = self._employee(scope, int(data["employee_id"]))
        day, moments = self._normalize_day(data["punches"])
        created = self._replace_day(
            scope,
            employee,
            day,
            moments,
            source="manual",
            request_id=None,
            note=self._note(data.get("note")),
            origin_label="manual",
        )
        return {"employee_id": employee.id, "day": day, "origin": "manual", "punches": created}

    def refuse_punch_change(self, scope: Scope, row_id: int) -> None:
        self.get_punch(scope, row_id)
        raise AppError(409, "Marcação registrada não é alterada nem apagada.")

    def list_occurrences(self, scope: Scope, page: int, limit: int, equals: dict):
        rows, total = self._scoped_list(scope, Occurrence, page, limit, equals)
        return [self._show_document(row) for row in rows], total

    def get_occurrence(self, scope: Scope, row_id: int) -> Occurrence:
        row = self._row(Occurrence, scope, row_id)
        self._visible(scope, row.employee_id)
        return self._show_document(row)

    def create_occurrence(self, scope: Scope, data: dict, *, source: str = "admin", request_id: int | None = None) -> Occurrence:
        employee = self._employee(scope, int(data["employee_id"]))
        kind = data["kind"]
        if source == "approved_request":
            origin = "approved_request"
        elif kind in MANUAL_OCCURRENCE_KINDS:
            self._can_launch(scope, employee)
            origin = "manual"
        else:
            self._admin(scope)
            origin = "admin"
        start, end, starts_at, ends_at = self._span(data)
        self._assert_span_open(scope.tenant_id, start, end)
        cid, crm, doctor = self._medical(kind, data)
        photo_key = self._photo_key(scope, kind, data.get("photo_key"))
        reason_id = self._reason(scope, kind if kind in REASON_KINDS else None, data.get("reason_id"))
        warning = None
        if kind == "certificate" and self._period_has_punch(scope, employee.id, start, end, starts_at, ends_at):
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
        self._admin(scope)
        row = self.get_occurrence(scope, row_id)
        self._assert_open(scope.tenant_id, row.starts_on)
        if "note" in data:
            row.note = self._note(data.get("note"))
            self.repo.add(row)
        return row

    def delete_occurrence(self, scope: Scope, row_id: int) -> None:
        self.get_occurrence(scope, row_id)
        raise AppError(409, "A ocorrência permanece no histórico.")

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
            self._assert_open(scope.tenant_id, day)
            self._medical(kind, data)
            self._photo_key(scope, kind, data.get("photo_key"))
        else:
            if data.get("punches"):
                raise AppError(400, "Marcações do dia só entram no ajuste")
            start, end, starts_at, ends_at = self._span(data)
            self._assert_span_open(scope.tenant_id, start, end)
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
        rows, total = self.repo.list_rows(Closing, scope.tenant_id, page=page, limit=limit, equals=equals, descending=True)
        events = self.repo.closing_events_for([row.id for row in rows])
        return [self._closing_out(row, events.get(row.id, [])) for row in rows], total

    def get_closing(self, scope: Scope, row_id: int) -> dict:
        self._known(scope)
        row = self._row(Closing, scope, row_id)
        events = self.repo.closing_events_for([row.id]).get(row.id, [])
        return self._closing_out(row, events)

    def create_closing(self, scope: Scope, data: dict) -> dict:
        self._can_manage_period(scope)
        start, end = self._closing_bounds(data)
        if (end - start).days + 1 > 366:
            raise AppError(400, "O fechamento aceita no máximo 366 dias")
        if self.repo.closing_overlapping(scope.tenant_id, start, end) is not None:
            raise AppError(409, "Esse período já existe")
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
        return self.get_closing(scope, row.id)

    def update_closing(self, scope: Scope, row_id: int, data: dict) -> dict:
        self._can_manage_period(scope)
        row = self._row(Closing, scope, row_id)
        status = data["status"]
        previous = row.status
        if status == "closed":
            if row.status != "open":
                raise AppError(409, "Só um período aberto pode ser fechado")
            self._assert_can_close(scope, row.starts_on, row.ends_on)
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
        elif status == "open":
            if row.status not in {"closed", "cancelled"}:
                raise AppError(409, "Só um período fechado ou cancelado pode ser reaberto")
            event_note = self._required_note(data)
            row.note = event_note
            row.status = "open"
            row.closed_at = None
            row.closed_by_person_id = None
        else:
            raise AppError(400, "Situação inválida")
        self.repo.add(row)
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
        if row.status != "open":
            raise AppError(409, "Período fechado ou cancelado permanece no histórico.")
        events = self.repo.closing_events_for([row.id]).get(row.id, [])
        for event in events:
            self.repo.delete(event)
        self.repo.delete(row)

    def list_notifications(self, scope: Scope, page: int, limit: int, equals: dict):
        self._known(scope)
        filters = dict(equals)
        if scope.role != "admin":
            filters["person_id"] = scope.person_id
        return self.repo.list_rows(
            Notification, scope.tenant_id, page=page, limit=limit, equals=filters, descending=True
        )

    def get_notification(self, scope: Scope, row_id: int) -> Notification:
        row = self._row(Notification, scope, row_id)
        if scope.role != "admin" and row.person_id != scope.person_id:
            raise AppError(404, "Registro não encontrado")
        return row

    def refuse_notification_create(self, scope: Scope) -> None:
        self._known(scope)
        raise AppError(409, "Notificação é gerada pelo sistema.")

    def update_notification(self, scope: Scope, row_id: int, data: dict) -> Notification:
        row = self.get_notification(scope, row_id)
        if data.get("read") is True:
            row.read_at = self.clock()
        elif data.get("read") is False:
            row.read_at = None
        return self.repo.add(row)

    def delete_notification(self, scope: Scope, row_id: int) -> None:
        self.get_notification(scope, row_id)
        raise AppError(409, "Notificação gerada permanece no histórico.")

    def list_audits(self, scope: Scope, page: int, limit: int, equals: dict):
        self._admin(scope)
        return self.repo.list_rows(Audit, scope.tenant_id, page=page, limit=limit, equals=equals, descending=True)

    def get_audit(self, scope: Scope, row_id: int) -> Audit:
        self._admin(scope)
        return self._row(Audit, scope, row_id)

    def refuse_audit_write(self, scope: Scope) -> None:
        self._admin(scope)
        raise AppError(409, "Auditoria é gerada pelo sistema.")

    def dashboard(self, scope: Scope) -> dict:
        self._known(scope)
        tenant = self.repo.get_tenant(scope.tenant_id)
        if tenant is None:
            raise AppError(404, "Empresa não encontrada")
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
        self._admin(scope)
        start = date(year, month, 1)
        if month == 12:
            end = date(year, 12, 31)
        else:
            end = date(year, month + 1, 1) - timedelta(days=1)
        return {"year": year, "month": month, "items": self._payroll_items(scope, start, end)}

    def list_fiscal_files(self, scope: Scope, page: int, limit: int, equals: dict):
        self._can_manage_period(scope)
        return self.repo.list_rows(FiscalFile, scope.tenant_id, page=page, limit=limit, equals=equals, descending=True)

    def get_fiscal_file(self, scope: Scope, row_id: int) -> FiscalFile:
        self._can_manage_period(scope)
        return self._row(FiscalFile, scope, row_id)

    def create_fiscal_file(self, scope: Scope, data: dict) -> FiscalFile:
        self._can_manage_period(scope)
        kind = data["kind"]
        start, end = self._closing_bounds(data)
        if (end - start).days + 1 > 366:
            raise AppError(400, "O arquivo aceita no máximo 366 dias")
        if kind == "aej" and self.repo.closed_exact(scope.tenant_id, start, end) is None:
            raise AppError(409, "A exportação de AEJ sai só de período fechado")
        if kind == "afd":
            content = render_afd(self._afd_rows(scope, start, end))
        elif kind == "aej":
            content = render_aej(self._aej_rows(scope, start, end))
        elif kind == "payroll":
            content = render_payroll(
                [
                    (
                        item["cpf"],
                        item["worked_minutes"],
                        item["overtime_minutes"],
                        item["night_additional_minutes"],
                        item["shortage_minutes"],
                        item["balance_minutes"],
                    )
                    for item in self._payroll_items(scope, start, end)
                ]
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
                created_at=self.clock(),
            )
        )
        self._audit(scope, None, "fiscal_file", row.id, None, kind, start)
        return row

    def import_afd(self, scope: Scope, content: str) -> dict:
        self._can_manage_period(scope)
        created = 0
        ignored = 0
        blocked = 0
        for cpf, moment in parse_afd(content):
            employee = self.repo.employee_by_cpf(scope.tenant_id, cpf)
            if employee is None:
                blocked += 1
                continue
            if self.repo.punch_at(scope.tenant_id, employee.id, moment) is not None:
                ignored += 1
                continue
            try:
                self.create_punch(
                    scope,
                    {"employee_id": employee.id, "occurred_at": moment, "note": None},
                    source="afd",
                )
            except AppError as error:
                if error.status_code in {400, 409}:
                    blocked += 1
                    continue
                raise
            created += 1
        return {"created": created, "ignored": ignored, "blocked": blocked}

    def refuse_fiscal_file_change(self, scope: Scope, row_id: int) -> None:
        self.get_fiscal_file(scope, row_id)
        raise AppError(409, "Arquivo fiscal permanece no histórico.")

    def time_results(self, scope: Scope, employee_id: int, starts_on: date, ends_on: date) -> dict:
        self._known(scope)
        if ends_on < starts_on:
            raise AppError(400, "O fim precisa ser igual ou posterior ao início")
        if (ends_on - starts_on).days + 1 > 62:
            raise AppError(400, "A apuração aceita no máximo 62 dias")
        employee = self._employee(scope, employee_id)
        self._visible(scope, employee.id)
        return {
            "employee_id": employee.id,
            "starts_on": starts_on,
            "ends_on": ends_on,
            "items": self._day_results(scope, employee, starts_on, ends_on),
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
    ) -> dict:
        self._can_manage_period(scope)
        name = REPORT_NAMES.get(kind)
        if name is None:
            raise AppError(400, "Relatório inválido")
        if ends_on < starts_on:
            raise AppError(400, "O fim precisa ser igual ou posterior ao início")
        if (ends_on - starts_on).days + 1 > 366:
            raise AppError(400, "O relatório aceita no máximo 366 dias")
        lines = self._report_lines(scope, kind, starts_on, ends_on, employee_id)
        start = (page - 1) * limit
        return {
            "kind": kind,
            "name": name,
            "starts_on": starts_on,
            "ends_on": ends_on,
            "items": lines[start : start + limit],
            "total": len(lines),
            "page": page,
            "limit": limit,
        }

    def _report_lines(
        self, scope: Scope, kind: str, starts_on: date, ends_on: date, employee_id: int | None
    ) -> list[dict]:
        people = self._report_people(scope, employee_id)
        if kind == "punch":
            lines = self._punch_lines(scope, people, starts_on, ends_on)
        elif kind == "journey":
            lines = self._journey_lines(scope, people, starts_on, ends_on)
        elif kind == "hour_bank":
            lines = self._bank_lines(scope, people, starts_on, ends_on)
        elif kind == "occurrence":
            lines = self._occurrence_lines(scope, people, starts_on, ends_on)
        else:
            lines = self._management_lines(scope, people, starts_on, ends_on, employee_id is None)
        return sorted(lines, key=lambda item: (item["occurred_on"], item["full_name"] or "", item["title"], item["detail"]))

    def _report_people(self, scope: Scope, employee_id: int | None) -> list[Employee]:
        ids = self._visible_ids(scope)
        if employee_id is not None:
            self._visible(scope, employee_id)
            ids = [employee_id]
        people: list[Employee] = []
        page = 1
        while True:
            rows, total = self.repo.list_employees(scope.tenant_id, ids=ids, page=page, limit=100, equals={})
            people.extend(rows)
            if not rows or page * 100 >= total:
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
                            f"trabalhadas {day['worked_minutes']} min; "
                            f"hora extra {day['overtime_minutes']} min; "
                            f"adicional noturno {day['night_additional_minutes']} min; "
                            f"falta {day['shortage_minutes']} min"
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
                        "title": vigency.label,
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
            movement = 0
            if start <= finish:
                movement = sum(day["bank_minutes"] for day in self._day_results(scope, employee, start, finish))
            projection = self._project_hour_bank(scope, employee, finish)
            detail = f"saldo {projection['balance_minutes']} min; movimento {movement} min"
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
                    entry_detail = f"{entry.minutes} min"
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

    def _day_results(self, scope: Scope, employee: Employee, starts_on: date, ends_on: date) -> list[dict]:
        start, _end = day_bounds(starts_on - timedelta(days=1))
        window_end = datetime.combine(ends_on + timedelta(days=1), time(5, 1), tzinfo=BR)
        punches = self.repo.valid_punches_between(scope.tenant_id, employee.id, start, window_end)
        by_day: dict[date, list] = {}
        for punch in punches:
            by_day.setdefault(punch.occurred_at.astimezone(BR).date(), []).append(punch)
        for rows in by_day.values():
            rows.sort(key=lambda row: (row.occurred_at, row.id))
        occurrences = self.repo.occurrences_between(scope.tenant_id, employee.id, starts_on, ends_on)
        holidays = {row.holiday_date for row in self.repo.holidays_between(scope.tenant_id, starts_on, ends_on)}
        vigencies = self.repo.vigencies_between(scope.tenant_id, employee.id, "journey", starts_on, ends_on)
        journeys: dict[int, Journey] = {}
        consumed: set[int] = set()
        previous = starts_on - timedelta(days=1)
        if len(by_day.get(previous, [])) % 2 == 1:
            self._take_night_exit(by_day, previous, consumed)
        items = []
        current = starts_on
        while current <= ends_on:
            calendar = by_day.get(current, [])
            working = [row for row in calendar if row.id not in consumed]
            moments = [row.occurred_at for row in working]
            if len(working) % 2 == 1:
                exit_at = self._take_night_exit(by_day, current, consumed)
                if exit_at is not None:
                    moments.append(exit_at)
            covering = [row for row in occurrences if row.starts_on <= current <= row.ends_on]
            items.append(
                settle_day(
                    work_date=current,
                    moments=moments,
                    counted=len(calendar),
                    journey=self._journey_on(scope, vigencies, journeys, current),
                    holiday=current in holidays,
                    vacation=any(row.kind == "vacation" for row in covering),
                    leave=any(row.kind == "leave" for row in covering),
                    full_allowance=any(self._full_day(row) for row in covering if row.kind == "allowance"),
                    full_certificate=any(self._full_day(row) for row in covering if row.kind == "certificate"),
                    extra_warnings=[row.warning for row in covering if row.warning],
                    uses_bank=bool(employee.hour_bank),
                )
            )
            current += timedelta(days=1)
        return items

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
        minutes = int(data["minutes"])
        entry_on = data.get("entry_on") or self.today()
        if entry_on > self.today():
            raise AppError(400, "A data não pode ser futura")
        self._assert_open(scope.tenant_id, entry_on)
        effect = None
        if kind == "settlement":
            balance = self._project_hour_bank(scope, employee)["balance_minutes"]
            if balance == 0:
                raise AppError(400, "Não há saldo para quitar")
            if minutes > abs(balance):
                raise AppError(400, "A quitação passa do saldo")
            effect = "overtime" if balance > 0 else "absence"
        row = self.repo.add(
            HourBankEntry(
                tenant_id=scope.tenant_id,
                employee_id=employee.id,
                kind=kind,
                minutes=minutes,
                effect=effect,
                note=self._note(data.get("note")),
                entry_on=entry_on,
                created_by_person_id=scope.person_id,
                created_at=self.clock(),
            )
        )
        return row

    def refuse_hour_bank_change(self, scope: Scope, row_id: int) -> None:
        self.get_hour_bank_entry(scope, row_id)
        raise AppError(409, "Lançamento de banco permanece no histórico.")

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
        if finish >= starts_on and employee.admission_date <= finish:
            day_start = employee.admission_date if employee.admission_date > starts_on else starts_on
            for day in self._day_results(scope, employee, day_start, finish):
                worked += day["worked_minutes"]
                overtime += day["overtime_minutes"]
                night += day["night_additional_minutes"]
                shortage += day["shortage_minutes"]
            if employee.hour_bank:
                balance = self._project_hour_bank(scope, employee, finish)["balance_minutes"]
        return {
            "employee_id": employee.id,
            "full_name": employee.full_name,
            "cpf": employee.cpf,
            "punch_count": punch_count,
            "worked_minutes": worked,
            "overtime_minutes": overtime,
            "night_additional_minutes": night,
            "shortage_minutes": shortage,
            "balance_minutes": balance,
        }

    def _afd_rows(self, scope: Scope, starts_on: date, ends_on: date) -> list[tuple[str, datetime]]:
        punches = self._punches_in(scope, starts_on, ends_on)
        employees: dict[int, Employee | None] = {}
        rows = []
        for punch in punches:
            if punch.employee_id not in employees:
                employees[punch.employee_id] = self.repo.get_row(Employee, scope.tenant_id, punch.employee_id)
            employee = employees[punch.employee_id]
            if employee is None:
                continue
            rows.append((employee.cpf, punch.occurred_at))
        return rows

    def _aej_rows(self, scope: Scope, starts_on: date, ends_on: date):
        finish = ends_on if ends_on <= self.today() else self.today()
        moments: dict[tuple[int, date], list[datetime]] = {}
        for punch in self._punches_in(scope, starts_on, ends_on):
            local = punch.occurred_at.astimezone(BR).date()
            moments.setdefault((punch.employee_id, local), []).append(punch.occurred_at)
        rows = []
        page = 1
        while True:
            employees, total = self.repo.list_employees(scope.tenant_id, ids=None, page=page, limit=100, equals={})
            for employee in employees:
                if finish < starts_on or employee.admission_date > finish:
                    continue
                day_start = employee.admission_date if employee.admission_date > starts_on else starts_on
                for day in self._day_results(scope, employee, day_start, finish):
                    punch_moments = moments.get((employee.id, day["work_date"]), [])
                    if (
                        not punch_moments
                        and day["worked_minutes"] == 0
                        and day["overtime_minutes"] == 0
                        and day["night_additional_minutes"] == 0
                        and day["shortage_minutes"] == 0
                    ):
                        continue
                    rows.append(
                        (
                            employee.cpf,
                            day["work_date"],
                            day["worked_minutes"],
                            day["overtime_minutes"],
                            day["night_additional_minutes"],
                            day["shortage_minutes"],
                            punch_moments,
                        )
                    )
            if page * 100 >= total or not employees:
                break
            page += 1
        return rows

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
        items = []
        if employee.admission_date <= limit:
            items = self._day_results(scope, employee, employee.admission_date, limit)
        events = []
        for day in items:
            if day["bank_minutes"] > 0:
                events.append((day["work_date"], 0, "credit", day["bank_minutes"]))
            elif day["bank_minutes"] < 0:
                events.append((day["work_date"], 0, "debit", -day["bank_minutes"]))
        for entry in self.repo.hour_bank_entries_for(scope.tenant_id, employee.id):
            if entry.entry_on > limit:
                continue
            if entry.kind == "settlement":
                events.append((entry.entry_on, entry.id, entry.effect, entry.minutes))
            else:
                events.append((entry.entry_on, entry.id, entry.kind, entry.minutes))
        return project_balance(events, limit)

    def _take_night_exit(self, by_day: dict, day: date, consumed: set[int]) -> datetime | None:
        following = by_day.get(day + timedelta(days=1), [])
        if not following or following[0].id in consumed:
            return None
        local = following[0].occurred_at.astimezone(BR)
        if (local.hour, local.minute) > (5, 0):
            return None
        consumed.add(following[0].id)
        return following[0].occurred_at

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

    def _prepare_named(self, model, scope: Scope, data: dict, current) -> dict:
        payload = {}
        if "name" in data and data["name"] is not None:
            name = str(data["name"]).strip()
            if not name:
                raise AppError(400, "Informe o nome")
            payload["name"] = name
        elif current is None:
            raise AppError(400, "Informe o nome")
        if model is Sector:
            unit_id = data.get("unit_id", getattr(current, "unit_id", None))
            if current is None or "unit_id" in data:
                self._row(Unit, scope, int(unit_id))
                payload["unit_id"] = int(unit_id)
        if model is Team:
            sector_id = data.get("sector_id", getattr(current, "sector_id", None))
            if current is None or "sector_id" in data:
                self._row(Sector, scope, int(sector_id))
                payload["sector_id"] = int(sector_id)
        if model is Journey:
            for key in ("morning_start", "morning_end", "afternoon_start", "afternoon_end"):
                if current is None or key in data:
                    payload[key] = assert_clock(data.get(key))
            if current is None or "note" in data:
                payload["note"] = self._note(data.get("note"))
        if model is LaborAgreement:
            if current is None or "union_id" in data:
                union_id = data.get("union_id")
                if union_id is not None:
                    self._row(LaborUnion, scope, int(union_id))
                payload["union_id"] = int(union_id) if union_id is not None else None
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
        if model is Holiday:
            if current is None or "holiday_date" in data:
                payload["holiday_date"] = data.get("holiday_date")
            if current is None or "note" in data:
                payload["note"] = self._note(data.get("note"))
        if model is PunchRule:
            if current is None or "note" in data:
                payload["note"] = self._note(data.get("note"))
        if model is Reason:
            if current is None:
                payload["kind"] = data["kind"]
                payload["active"] = bool(data.get("active", True))
            elif "active" in data and data["active"] is not None:
                payload["active"] = bool(data["active"])
        return payload

    def _unique_name(self, model, tenant_id: int, payload: dict, exclude_id: int | None) -> None:
        if model not in UNIQUE_MODELS or "name" not in payload:
            return
        scope = {}
        if model is Sector:
            scope["unit_id"] = payload["unit_id"]
        elif model is Team:
            scope["sector_id"] = payload["sector_id"]
        elif model is Reason:
            scope["kind"] = payload["kind"]
        if self.repo.name_taken(model, tenant_id, payload["name"], exclude_id=exclude_id, scope=scope):
            raise AppError(409, "Já existe um cadastro com esse nome")

    def _guard_catalog(self, model, row) -> None:
        checks = {
            Unit: (Sector, {"unit_id": row.id}, "Existem setores nesta unidade."),
            Sector: (Team, {"sector_id": row.id}, "Existem equipes neste setor."),
            LaborUnion: (LaborAgreement, {"union_id": row.id}, "Existem acordos neste sindicato."),
        }
        if model in checks:
            other, equals, message = checks[model]
            if self.repo.count_model(other, **equals):
                raise AppError(409, message)
        kind_by_model = {
            Job: "job",
            CostCenter: "cost_center",
            Unit: "unit",
            Sector: "sector",
            Team: "team",
            Journey: "journey",
            LaborUnion: "union",
        }
        kind = kind_by_model.get(model)
        if kind and self.repo.count_model(EmployeeVigency, kind=kind, reference_id=row.id):
            raise AppError(409, "O cadastro está no histórico de um funcionário.")
        if model is Reason and (
            self.repo.count_model(Occurrence, reason_id=row.id) or self.repo.count_model(TimeRequest, reason_id=row.id)
        ):
            raise AppError(409, "O motivo está em uso.")

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
                raise AppError(409, "CPF já cadastrado nesta empresa")
            payload["cpf"] = cpf
        if current is None or "email" in data:
            payload["email"] = self._email(data.get("email"))
        if current is None or "person_id" in data:
            person_id = data.get("person_id")
            if person_id is not None:
                if self.repo.membership(int(person_id), scope.tenant_id) is None:
                    raise AppError(400, "Esse acesso não está nesta empresa")
                taken, _total = self.repo.list_rows(
                    Employee,
                    scope.tenant_id,
                    page=1,
                    limit=1,
                    equals={"person_id": int(person_id)},
                    descending=False,
                )
                if taken and (current is None or taken[0].id != current.id):
                    raise AppError(409, "Esse acesso já está ligado a outro funcionário")
            payload["person_id"] = int(person_id) if person_id is not None else None
        if current is None or "admission_date" in data:
            if data.get("admission_date") is None:
                raise AppError(400, "Informe a admissão")
            payload["admission_date"] = data["admission_date"]
        if current is None or "note" in data:
            payload["note"] = self._note(data.get("note"))
        if current is None or "hour_bank" in data:
            payload["hour_bank"] = bool(data.get("hour_bank", False))
        return payload

    def _employee_out(self, row: Employee, labels: dict) -> dict:
        body = {
            "id": row.id,
            "full_name": row.full_name,
            "cpf": row.cpf,
            "email": row.email,
            "person_id": row.person_id,
            "admission_date": row.admission_date,
            "note": row.note,
            "hour_bank": bool(row.hour_bank),
        }
        for kind, field in KIND_FIELD.items():
            item = labels.get(kind)
            body[field] = item.label if item is not None else None
        return body

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
        self._match_structure(scope, employee.id, kind, target, valid_from)
        label = target.full_name if kind == "manager" else target.name
        return target.id, label

    def _match_structure(self, scope: Scope, employee_id: int, kind: str, target, valid_from: date) -> None:
        if kind == "sector":
            unit = self.repo.applicable(employee_id, "unit", valid_from)
            if unit is not None and unit.reference_id != target.unit_id:
                raise AppError(409, "O setor não pertence à unidade vigente")
        if kind == "team":
            sector = self.repo.applicable(employee_id, "sector", valid_from)
            if sector is not None and sector.reference_id != target.sector_id:
                raise AppError(409, "A equipe não pertence ao setor vigente")
        if kind == "unit":
            sector = self.repo.applicable(employee_id, "sector", valid_from)
            if sector is None or sector.reference_id is None:
                return
            current = self._row(Sector, scope, sector.reference_id)
            if current.unit_id != target.id:
                raise AppError(409, "A unidade não contém o setor vigente")

    def _occupies(self, employee_id: int, day: date) -> bool:
        current = self.repo.applicable(employee_id, "status", day)
        if current is not None and current.label == "active":
            return True
        opened = self.repo.open_vigency(employee_id, "status")
        return opened is not None and opened.label == "active" and opened.valid_from > day

    def _assert_capacity(self, scope: Scope) -> None:
        tenant = self.repo.get_tenant(scope.tenant_id)
        if tenant is None:
            raise AppError(404, "Empresa não encontrada")
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
        note: str | None,
        origin_label: str,
    ) -> list[Punch]:
        self._assert_working(scope, employee)
        self._assert_open(scope.tenant_id, day)
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
                {"employee_id": employee.id, "occurred_at": moment, "note": note},
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

    def _assert_span_open(self, tenant_id: int, start: date, end: date) -> None:
        day = start
        while day <= end:
            self._assert_open(tenant_id, day)
            day += timedelta(days=1)

    def _medical(self, kind: str, data: dict) -> tuple[str | None, str | None, str | None]:
        cid = self._bounded(data.get("cid"), 16)
        crm = self._bounded(data.get("crm"), 32)
        doctor = self._bounded(data.get("doctor_name"), 255)
        if kind != "certificate":
            if cid or crm or doctor:
                raise AppError(400, "CID, CRM e médico só entram no atestado")
            return None, None, None
        if not cid or not crm or not doctor:
            raise AppError(400, "Informe CID, CRM e o nome do médico")
        return cid, crm, doctor

    def _photo_key(self, scope: Scope, kind: str, value) -> str | None:
        if value is None or not str(value).strip():
            return None
        if kind != "certificate":
            raise AppError(400, "A foto só entra no atestado")
        key = str(value).strip()
        prefix = f"{scope.tenant_id}/certificates/"
        if not key.startswith(prefix) or ".." in key:
            raise AppError(400, "A foto não pertence a esta empresa")
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
            return StorageService().presign_get(key)
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

    def _can_punch(self, scope: Scope, employee: Employee, source: str | None) -> None:
        if source == "approved_request":
            return
        if source == "afd":
            self._can_manage_period(scope)
            return
        if scope.role == "admin":
            return
        if employee.person_id == scope.person_id:
            return
        raise AppError(403, "Sem permissão")

    def _punch_source(self, scope: Scope, employee: Employee) -> str:
        if employee.person_id == scope.person_id:
            return "employee"
        return "admin"

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
            team = self.repo.applicable(own, "team", self.today())
            if team is not None and team.reference_id is not None:
                ids = self.repo.employee_ids_for_team(scope.tenant_id, team.reference_id, self.today())
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
        }

    def list_notification_preferences(self, scope: Scope, page: int, limit: int, equals: dict):
        self._known(scope)
        filters = dict(equals)
        filters["person_id"] = scope.person_id
        return self.repo.list_rows(
            NotificationPreference, scope.tenant_id, page=page, limit=limit, equals=filters, descending=True
        )

    def get_notification_preference(self, scope: Scope, row_id: int) -> NotificationPreference:
        self._known(scope)
        row = self._row(NotificationPreference, scope, row_id)
        if row.person_id != scope.person_id:
            raise AppError(404, "Registro não encontrado")
        return row

    def create_notification_preference(self, scope: Scope, data: dict) -> NotificationPreference:
        self._known(scope)
        kind = str(data["kind"])
        if kind not in PHRASES:
            raise AppError(400, "Aviso inválido")
        if self.repo.preference_for(scope.tenant_id, scope.person_id, kind) is not None:
            raise AppError(409, "Esse aviso já está configurado")
        return self.repo.add(
            NotificationPreference(
                tenant_id=scope.tenant_id,
                person_id=scope.person_id,
                kind=kind,
                enabled=bool(data["enabled"]),
                created_at=self.clock(),
            )
        )

    def update_notification_preference(self, scope: Scope, row_id: int, data: dict) -> NotificationPreference:
        row = self.get_notification_preference(scope, row_id)
        if "enabled" in data and data["enabled"] is not None:
            row.enabled = bool(data["enabled"])
            self.repo.add(row)
        return row

    def delete_notification_preference(self, scope: Scope, row_id: int) -> None:
        row = self.get_notification_preference(scope, row_id)
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
            raise AppError(409, "A empresa já tem um plano")
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
        before = self.repo.count_model(Notification, tenant_id=scope.tenant_id)
        self._daily_incomplete(scope)
        self._daily_closing(scope)
        self._daily_trial(scope)
        self._plan_notice(scope)
        created = self.repo.count_model(Notification, tenant_id=scope.tenant_id) - before
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
            raise AppError(404, "Empresa não encontrada")
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
        if not self._notice_enabled(scope, person_id, kind):
            return
        if daily:
            start, end = day_bounds(self.today())
            if self.repo.notice_between(scope.tenant_id, person_id, kind, start, end) is not None:
                return
        self._notice(scope, person_id, employee_id, kind, phrase, phrase)
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

    def _notice_enabled(self, scope: Scope, person_id: int, kind: str) -> bool:
        row = self.repo.preference_for(scope.tenant_id, person_id, kind)
        if row is None:
            return True
        return bool(row.enabled)

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
        if team is None or team.reference_id is None:
            return found
        member_ids = set(self.repo.employee_ids_for_team(scope.tenant_id, team.reference_id, self.today()))
        for manager in self.repo.role_memberships(scope.tenant_id, "manager"):
            row = self.repo.employee_by_person(scope.tenant_id, manager.person_id)
            if row is not None and row.id in member_ids and manager.person_id not in found:
                found.append(manager.person_id)
        return found

    def _daily_incomplete(self, scope: Scope) -> None:
        start = date(self.today().year, self.today().month, 1)
        found = False
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
                self._assert_can_close(scope, row.starts_on, row.ends_on)
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
            Notification(
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
        elif kind == "occurrence":
            action = "Registro de ocorrência"
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

    def _assert_open(self, tenant_id: int, day: date) -> None:
        if self.repo.closed_covering(tenant_id, day) is not None:
            raise AppError(409, "Período fechado")

    def _can_manage_period(self, scope: Scope) -> None:
        self._known(scope)
        if scope.role not in {"admin", "manager"}:
            raise AppError(403, "Sem permissão")

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
            raise AppError(400, "Informe o motivo")
        return note

    def _assert_can_close(self, scope: Scope, start: date, end: date) -> None:
        for request in self.repo.pending_overlapping(scope.tenant_id, start, end):
            finish = request.ends_on or request.starts_on
            if request.starts_on <= end and finish >= start:
                raise AppError(409, "Há solicitação pendente no período")
        page = 1
        while True:
            rows, total = self.repo.list_employees(scope.tenant_id, ids=None, page=page, limit=100, equals={})
            for employee in rows:
                if employee.admission_date > end:
                    continue
                first = employee.admission_date if employee.admission_date > start else start
                for day in self._day_results(scope, employee, first, end):
                    if day["incomplete"]:
                        raise AppError(409, "Há ponto incompleto no período")
            if page * 100 >= total or not rows:
                break
            page += 1
        for occurrence in self.repo.blocking_occurrences(scope.tenant_id, start, end):
            if self._conflict_in_closing(scope, occurrence, start, end):
                raise AppError(409, "Há conflito entre abono ou atestado e marcação no período")

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
