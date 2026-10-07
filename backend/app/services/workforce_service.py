from dataclasses import dataclass
from datetime import date, datetime

from app.core.cpf import normalize_cpf
from app.core.exceptions import AppError
from app.core.workforce import (
    AUDIT_ACTION,
    BR,
    OCCURRENCE_FOR_REQUEST,
    REASON_FOR_REQUEST,
    REASON_KINDS,
    STATUS_LABELS,
    assert_aware,
    assert_clock,
    assert_not_future,
    assert_period,
    day_bounds,
    month_bounds,
    now_utc,
    previous_end,
    today_in_brazil,
)
from app.models.workforce import (
    Audit,
    Closing,
    ClosingEvent,
    CostCenter,
    Employee,
    EmployeeVigency,
    Holiday,
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
    Team,
    TimeRequest,
    Unit,
)
from app.repositories.workforce_repository import WorkforceRepository

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
        return self._scoped_list(scope, Occurrence, page, limit, equals)

    def get_occurrence(self, scope: Scope, row_id: int) -> Occurrence:
        row = self._row(Occurrence, scope, row_id)
        self._visible(scope, row.employee_id)
        return row

    def create_occurrence(self, scope: Scope, data: dict, *, source: str = "admin", request_id: int | None = None) -> Occurrence:
        if source == "admin":
            self._admin(scope)
        employee = self._employee(scope, int(data["employee_id"]))
        start = data["starts_on"]
        end = assert_period(start, data.get("ends_on"))
        self._assert_open(scope.tenant_id, start)
        self._assert_open(scope.tenant_id, end)
        reason_id = self._reason(scope, data["kind"] if data["kind"] in REASON_KINDS else None, data.get("reason_id"))
        row = self.repo.add(
            Occurrence(
                tenant_id=scope.tenant_id,
                employee_id=employee.id,
                kind=data["kind"],
                starts_on=start,
                ends_on=end,
                reason_id=reason_id,
                note=self._note(data.get("note")),
                source=source,
                request_id=request_id,
                created_at=self.clock(),
            )
        )
        self._audit(scope, employee.id, "occurrence", row.id, None, data["kind"], start)
        return row

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
        if kind == "adjustment":
            raw = data.get("punches")
            if not raw and data.get("occurred_at") is not None:
                raw = [data["occurred_at"]]
            day, moments = self._normalize_day(list(raw or []))
            start = day
            end = day
            occurred = moments[0] if len(moments) == 1 else None
            self._assert_open(scope.tenant_id, day)
        else:
            if data.get("punches"):
                raise AppError(400, "Marcações do dia só entram no ajuste")
            if start is None:
                raise AppError(400, "Informe o período")
            end = assert_period(start, end)
            self._assert_open(scope.tenant_id, start)
            self._assert_open(scope.tenant_id, end)
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
        self._notify(
            scope,
            employee,
            "request_created",
            "Solicitação enviada",
            "A solicitação está pendente e não altera o ponto.",
            include_admins=True,
        )
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
        title = {"approved": "Solicitação aprovada", "rejected": "Solicitação recusada", "cancelled": "Solicitação cancelada"}[status]
        body = {
            "approved": "A aprovação efetivou o registro correspondente. A apuração não foi recalculada.",
            "rejected": "O ponto existente foi mantido.",
            "cancelled": "O cancelamento não altera o ponto.",
        }[status]
        self._notify(scope, employee, f"request_{status}", title, body, include_admins=False)
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
        self._admin(scope)
        if self.repo.closing_for(scope.tenant_id, data["year"], data["month"]) is not None:
            raise AppError(409, "Esse período já existe")
        row = self.repo.add(
            Closing(
                tenant_id=scope.tenant_id,
                year=data["year"],
                month=data["month"],
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
        self._admin(scope)
        row = self._row(Closing, scope, row_id)
        if row.status == "closed":
            raise AppError(409, "Período fechado não é reaberto nem apagado.")
        if data["status"] != "closed":
            raise AppError(400, "Situação inválida")
        row.status = "closed"
        if "note" in data:
            row.note = self._note(data.get("note"))
        row.closed_at = self.clock()
        row.closed_by_person_id = scope.person_id
        self.repo.add(row)
        self.repo.add(
            ClosingEvent(
                tenant_id=scope.tenant_id,
                closing_id=row.id,
                kind="closed",
                note=row.note,
                person_id=scope.person_id,
                created_at=self.clock(),
            )
        )
        self._audit(scope, None, "closing", row.id, "open", "closed", date(row.year, row.month, 1))
        return self.get_closing(scope, row.id)

    def delete_closing(self, scope: Scope, row_id: int) -> None:
        self._admin(scope)
        row = self._row(Closing, scope, row_id)
        if row.status == "closed":
            raise AppError(409, "Período fechado não é reaberto nem apagado.")
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
            "open_closings": self.repo.count_model(Closing, tenant_id=scope.tenant_id, status="open"),
            "employee_capacity": tenant.employee_capacity,
        }

    def payroll(self, scope: Scope, year: int, month: int) -> dict:
        self._admin(scope)
        start, end = month_bounds(year, month)
        counts = self.repo.punch_counts(scope.tenant_id, start, end)
        items = []
        page = 1
        while True:
            rows, total = self.repo.list_employees(scope.tenant_id, ids=None, page=page, limit=100, equals={})
            items.extend(
                {"employee_id": row.id, "full_name": row.full_name, "punch_count": counts.get(row.id, 0)}
                for row in rows
            )
            if page * 100 >= total or not rows:
                break
            page += 1
        return {"year": year, "month": month, "items": items}

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
        if tenant is None:
            return
        active = self.repo.count_active(scope.tenant_id, self.today())
        if active >= tenant.employee_capacity:
            title = "Limite do plano atingido"
            body = "A capacidade de funcionários ativos foi atingida."
            kind = "plan_limit"
        elif tenant.employee_capacity > 1 and active == tenant.employee_capacity - 1:
            title = "Limite do plano próximo"
            body = "Resta 1 vaga de funcionário ativo."
            kind = "plan_limit_near"
        else:
            return
        self.repo.add(
            Notification(
                tenant_id=scope.tenant_id,
                person_id=scope.person_id,
                employee_id=None,
                kind=kind,
                title=title,
                body=body,
                read_at=None,
                created_at=self.clock(),
            )
        )

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
                "reason_id": row.reason_id,
                "note": row.note,
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

    def _can_punch(self, scope: Scope, employee: Employee, source: str | None) -> None:
        if source == "approved_request":
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

    def _notify(self, scope: Scope, employee: Employee, kind: str, title: str, body: str, *, include_admins: bool) -> None:
        sent: set[int] = set()
        if employee.person_id is not None:
            sent.add(employee.person_id)
            self._notice(scope, employee.person_id, employee.id, kind, title, body)
        if not include_admins:
            return
        for admin in self.repo.admins(scope.tenant_id):
            if admin.person_id in sent:
                continue
            sent.add(admin.person_id)
            self._notice(scope, admin.person_id, employee.id, kind, "Nova solicitação", body)

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
        elif kind == "closing":
            action = "Fechamento do período"
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
        closing = self.repo.closing_for(tenant_id, day.year, day.month)
        if closing is not None and closing.status == "closed":
            raise AppError(409, "Período fechado")

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
