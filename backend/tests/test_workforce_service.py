from datetime import date, datetime
from types import SimpleNamespace
from zoneinfo import ZoneInfo

import pytest

from app.core.exceptions import AppError
from app.core.workforce import previous_end
from app.models.membership import Membership
from app.models.workforce import (
    Audit,
    Closing,
    ClosingEvent,
    Employee,
    EmployeeVigency,
    Job,
    Occurrence,
    Punch,
    RequestEvent,
    TimeRequest,
)
from app.services.workforce_service import Scope, WorkforceService

BR = ZoneInfo("America/Sao_Paulo")
TODAY = date(2026, 10, 7)
NOW = datetime(2026, 10, 7, 15, 0, tzinfo=ZoneInfo("UTC"))


class Memory:
    def __init__(self, capacity: int) -> None:
        self.rows: list = []
        self.seq = 1
        self.tenant = SimpleNamespace(id=1, employee_capacity=capacity)
        self.memberships = [Membership(person_id=7, tenant_id=1, role="admin")]
        self.memberships[0].id = 1

    def add(self, row):
        if getattr(row, "id", None) is None:
            row.id = self.seq
            self.seq += 1
        if row not in self.rows:
            self.rows.append(row)
        return row

    def delete(self, row) -> None:
        self.rows = [item for item in self.rows if item is not row]

    def get_tenant(self, tenant_id: int):
        return self.tenant if tenant_id == 1 else None

    def membership(self, person_id: int, tenant_id: int):
        for row in self.memberships:
            if row.person_id == person_id and row.tenant_id == tenant_id:
                return row
        return None

    def admins(self, tenant_id: int):
        return [row for row in self.memberships if row.tenant_id == tenant_id and row.role == "admin"]

    def _of(self, model, tenant_id: int):
        return [row for row in self.rows if isinstance(row, model) and row.tenant_id == tenant_id]

    def list_rows(self, model, tenant_id: int, *, page: int, limit: int, equals: dict, descending: bool, employee_ids=None):
        if employee_ids is not None and len(employee_ids) == 0:
            return [], 0
        found = []
        for row in self._of(model, tenant_id):
            if employee_ids is not None and row.employee_id not in employee_ids:
                continue
            if all(getattr(row, key) == value for key, value in equals.items()):
                found.append(row)
        found.sort(key=lambda item: item.id, reverse=descending)
        total = len(found)
        start = (page - 1) * limit
        return found[start : start + limit], total

    def get_row(self, model, tenant_id: int, row_id: int):
        for row in self._of(model, tenant_id):
            if row.id == row_id:
                return row
        return None

    def name_taken(self, model, tenant_id: int, name: str, *, exclude_id: int | None, scope: dict) -> bool:
        for row in self._of(model, tenant_id):
            if exclude_id is not None and row.id == exclude_id:
                continue
            if row.name == name and all(getattr(row, key) == value for key, value in scope.items()):
                return True
        return False

    def count_model(self, model, **equals) -> int:
        total = 0
        for row in self.rows:
            if isinstance(row, model) and all(getattr(row, key) == value for key, value in equals.items()):
                total += 1
        return total

    def list_employees(self, tenant_id: int, *, ids, page: int, limit: int, equals: dict):
        return self.list_rows(Employee, tenant_id, page=page, limit=limit, equals=equals, descending=False, employee_ids=ids)

    def labels_on(self, employee_ids: list[int], day: date):
        found: dict[int, dict] = {}
        rows = [
            row
            for row in self.rows
            if isinstance(row, EmployeeVigency)
            and row.employee_id in employee_ids
            and row.valid_from <= day
            and (row.valid_to is None or row.valid_to >= day)
        ]
        rows.sort(key=lambda item: (item.valid_from, item.id))
        for row in rows:
            found.setdefault(row.employee_id, {})[row.kind] = row
        return found

    def open_vigency(self, employee_id: int, kind: str):
        for row in self.rows:
            if isinstance(row, EmployeeVigency) and row.employee_id == employee_id and row.kind == kind and row.valid_to is None:
                return row
        return None

    def applicable(self, employee_id: int, kind: str, day: date):
        rows = [
            row
            for row in self.rows
            if isinstance(row, EmployeeVigency)
            and row.employee_id == employee_id
            and row.kind == kind
            and row.valid_from <= day
            and (row.valid_to is None or row.valid_to >= day)
        ]
        rows.sort(key=lambda item: (item.valid_from, item.id))
        return rows[-1] if rows else None

    def employee_ids_for_team(self, tenant_id: int, team_id: int, day: date):
        return [
            row.employee_id
            for row in self.rows
            if isinstance(row, EmployeeVigency)
            and row.tenant_id == tenant_id
            and row.kind == "team"
            and row.reference_id == team_id
            and row.valid_from <= day
            and (row.valid_to is None or row.valid_to >= day)
        ]

    def count_active(self, tenant_id: int, day: date) -> int:
        ids = set()
        for row in self._of(EmployeeVigency, tenant_id):
            if row.kind != "status" or row.label != "active":
                continue
            current = row.valid_from <= day and (row.valid_to is None or row.valid_to >= day)
            scheduled = row.valid_to is None and row.valid_from > day
            if current or scheduled:
                ids.add(row.employee_id)
        return len(ids)

    def count_punches_between(self, tenant_id: int, start: datetime, end: datetime) -> int:
        return sum(
            1
            for row in self._of(Punch, tenant_id)
            if start <= row.occurred_at < end
        )

    def punch_counts(self, tenant_id: int, start: datetime, end: datetime):
        counts: dict[int, int] = {}
        for row in self._of(Punch, tenant_id):
            if start <= row.occurred_at < end:
                counts[row.employee_id] = counts.get(row.employee_id, 0) + 1
        return counts

    def count_requests(self, tenant_id: int, *, kind: str, status: str) -> int:
        return sum(1 for row in self._of(TimeRequest, tenant_id) if row.kind == kind and row.status == status)

    def closing_for(self, tenant_id: int, year: int, month: int):
        for row in self._of(Closing, tenant_id):
            if int(row.year) == year and int(row.month) == month:
                return row
        return None

    def events_for(self, request_ids: list[int]):
        found: dict[int, list] = {}
        for row in self.rows:
            if isinstance(row, RequestEvent) and row.request_id in request_ids:
                found.setdefault(row.request_id, []).append(row)
        return found

    def closing_events_for(self, closing_ids: list[int]):
        found: dict[int, list] = {}
        for row in self.rows:
            if isinstance(row, ClosingEvent) and row.closing_id in closing_ids:
                found.setdefault(row.closing_id, []).append(row)
        return found

    def reasons_active(self, tenant_id: int, kind: str) -> int:
        return 0


def service(capacity: int = 10) -> tuple[WorkforceService, Memory]:
    repo = Memory(capacity)
    return WorkforceService(repo, today=lambda: TODAY, clock=lambda: NOW), repo


def admin() -> Scope:
    return Scope(person_id=7, tenant_id=1, role="admin")


def employee_payload(cpf: str = "12345678901", person_id: int | None = 7):
    return {
        "full_name": "Ana Lima",
        "cpf": cpf,
        "email": None,
        "person_id": person_id,
        "admission_date": date(2026, 10, 1),
        "note": None,
    }


def test_vigencia_anterior_termina_no_dia_previo():
    assert previous_end(date(2026, 1, 1), date(2026, 9, 1)) == date(2026, 8, 31)


def test_capacidade_bloqueia_o_funcionario_extra():
    workforce, _repo = service(1)
    workforce.create_employee(admin(), employee_payload())
    with pytest.raises(AppError) as caught:
        workforce.create_employee(admin(), employee_payload("10987654321", None))
    assert caught.value.status_code == 409


def test_desligamento_libera_a_vaga():
    workforce, _repo = service(1)
    first = workforce.create_employee(admin(), employee_payload("12345678901", None))
    workforce.create_vigency(
        admin(),
        {"employee_id": first["id"], "kind": "status", "reference_id": None, "label": "dismissed", "valid_from": TODAY, "note": None},
    )
    second = workforce.create_employee(admin(), employee_payload("10987654321", None))
    assert second["situation"] == "active"


def test_consulta_de_agosto_usa_a_jornada_da_epoca():
    workforce, repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    first = workforce.create_named(Job, admin(), {"name": "Auxiliar"})
    second = workforce.create_named(Job, admin(), {"name": "Analista"})
    workforce.create_vigency(
        admin(),
        {"employee_id": person["id"], "kind": "job", "reference_id": first.id, "label": None, "valid_from": date(2026, 1, 1), "note": None},
    )
    workforce.create_vigency(
        admin(),
        {"employee_id": person["id"], "kind": "job", "reference_id": second.id, "label": None, "valid_from": date(2026, 9, 1), "note": None},
    )
    august = repo.applicable(person["id"], "job", date(2026, 8, 15))
    september = repo.applicable(person["id"], "job", date(2026, 9, 2))
    assert august is not None and august.label == "Auxiliar"
    assert september is not None and september.label == "Analista"


def test_solicitacao_pendente_nao_cria_marcacao():
    workforce, repo = service()
    workforce.create_employee(admin(), employee_payload())
    workforce.create_request(
        admin(),
        {
            "kind": "adjustment",
            "reason_id": None,
            "note": "Esqueci a saída",
            "starts_on": None,
            "ends_on": None,
            "occurred_at": datetime(2026, 10, 6, 21, 3, tzinfo=BR),
        },
    )
    assert repo.count_model(Punch, tenant_id=1) == 0


def test_aprovacao_de_ajuste_grava_a_marcacao():
    workforce, repo = service()
    workforce.create_employee(admin(), employee_payload())
    created = workforce.create_request(
        admin(),
        {
            "kind": "adjustment",
            "reason_id": None,
            "note": None,
            "starts_on": None,
            "ends_on": None,
            "occurred_at": datetime(2026, 10, 6, 21, 3, tzinfo=BR),
        },
    )
    workforce.decide_request(admin(), created["id"], {"status": "approved", "decision_note": None})
    assert repo.count_model(Punch, tenant_id=1) == 1
    assert repo.count_model(Occurrence, tenant_id=1) == 1
    punch = next(row for row in repo.rows if isinstance(row, Punch))
    assert punch.source == "approved_request"


def test_recusa_e_cancelamento_mantem_o_ponto():
    workforce, repo = service()
    workforce.create_employee(admin(), employee_payload())
    refused = workforce.create_request(
        admin(),
        {"kind": "allowance", "reason_id": None, "note": None, "starts_on": date(2026, 10, 6), "ends_on": None, "occurred_at": None},
    )
    workforce.decide_request(admin(), refused["id"], {"status": "rejected", "decision_note": "Sem documento"})
    cancelled = workforce.create_request(
        admin(),
        {"kind": "allowance", "reason_id": None, "note": None, "starts_on": date(2026, 10, 5), "ends_on": None, "occurred_at": None},
    )
    workforce.decide_request(admin(), cancelled["id"], {"status": "cancelled", "decision_note": None})
    assert repo.count_model(Punch, tenant_id=1) == 0
    assert repo.count_model(Occurrence, tenant_id=1) == 0


def test_periodo_fechado_bloqueia_marcacao():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    opened = workforce.create_closing(admin(), {"year": 2026, "month": 10, "note": None})
    workforce.update_closing(admin(), opened["id"], {"status": "closed", "note": None})
    with pytest.raises(AppError) as caught:
        workforce.create_punch(
            admin(),
            {"employee_id": person["id"], "occurred_at": datetime(2026, 10, 6, 12, 0, tzinfo=BR), "note": None},
        )
    assert caught.value.status_code == 409


def test_auditoria_registra_quem_alterou_o_cargo():
    workforce, repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    job = workforce.create_named(Job, admin(), {"name": "Auxiliar"})
    workforce.create_vigency(
        admin(),
        {"employee_id": person["id"], "kind": "job", "reference_id": job.id, "label": None, "valid_from": date(2026, 10, 1), "note": None},
    )
    audits = [row for row in repo.rows if isinstance(row, Audit)]
    assert any(row.action == "Alteração de cargo" and row.person_id == 7 for row in audits)
