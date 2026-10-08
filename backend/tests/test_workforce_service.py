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
    Holiday,
    HourBankEntry,
    Job,
    Journey,
    Occurrence,
    Punch,
    RequestEvent,
    RequestPunch,
    Sector,
    Team,
    TimeRequest,
    Unit,
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
            if row.valid and start <= row.occurred_at < end
        )

    def punch_counts(self, tenant_id: int, start: datetime, end: datetime):
        counts: dict[int, int] = {}
        for row in self._of(Punch, tenant_id):
            if row.valid and start <= row.occurred_at < end:
                counts[row.employee_id] = counts.get(row.employee_id, 0) + 1
        return counts

    def valid_punches_between(self, tenant_id: int, employee_id: int, start: datetime, end: datetime):
        found = [
            row
            for row in self._of(Punch, tenant_id)
            if row.employee_id == employee_id and row.valid and start <= row.occurred_at < end
        ]
        found.sort(key=lambda item: (item.occurred_at, item.id))
        return found

    def vigencies_between(self, tenant_id: int, employee_id: int, kind: str, start: date, end: date):
        found = [
            row
            for row in self._of(EmployeeVigency, tenant_id)
            if row.employee_id == employee_id
            and row.kind == kind
            and row.valid_from <= end
            and (row.valid_to is None or row.valid_to >= start)
        ]
        found.sort(key=lambda item: (item.valid_from, item.id))
        return found

    def holidays_between(self, tenant_id: int, start: date, end: date):
        return [
            row
            for row in self._of(Holiday, tenant_id)
            if start <= row.holiday_date <= end
        ]

    def occurrences_between(self, tenant_id: int, employee_id: int, start: date, end: date):
        found = [
            row
            for row in self._of(Occurrence, tenant_id)
            if row.employee_id == employee_id and row.starts_on <= end and row.ends_on >= start
        ]
        found.sort(key=lambda item: item.id)
        return found

    def hour_bank_entries_for(self, tenant_id: int, employee_id: int):
        found = [
            row
            for row in self._of(HourBankEntry, tenant_id)
            if row.employee_id == employee_id
        ]
        found.sort(key=lambda item: (item.entry_on, item.id))
        return found

    def request_punches_for(self, request_ids: list[int]):
        found: dict[int, list] = {}
        rows = [row for row in self.rows if isinstance(row, RequestPunch) and row.request_id in request_ids]
        rows.sort(key=lambda item: (item.position, item.id))
        for row in rows:
            found.setdefault(row.request_id, []).append(row)
        return found

    def count_requests(self, tenant_id: int, *, kind: str, status: str) -> int:
        return sum(1 for row in self._of(TimeRequest, tenant_id) if row.kind == kind and row.status == status)

    def closing_for(self, tenant_id: int, year: int, month: int):
        for row in self._of(Closing, tenant_id):
            if int(row.year) == year and int(row.month) == month:
                return row
        return None

    def closing_overlapping(self, tenant_id: int, start: date, end: date):
        for row in self._of(Closing, tenant_id):
            if row.starts_on <= end and row.ends_on >= start:
                return row
        return None

    def closed_covering(self, tenant_id: int, day: date):
        for row in self._of(Closing, tenant_id):
            if row.status == "closed" and row.starts_on <= day <= row.ends_on:
                return row
        return None

    def pending_overlapping(self, tenant_id: int, start: date, end: date):
        found = []
        for row in self._of(TimeRequest, tenant_id):
            if row.status != "pending" or row.starts_on is None:
                continue
            finish = row.ends_on or row.starts_on
            if row.starts_on <= end and finish >= start:
                found.append(row)
        return found

    def blocking_occurrences(self, tenant_id: int, start: date, end: date):
        return [
            row
            for row in self._of(Occurrence, tenant_id)
            if row.kind in {"allowance", "certificate"} and row.starts_on <= end and row.ends_on >= start
        ]

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


def scope(person_id: int, role: str) -> Scope:
    return Scope(person_id=person_id, tenant_id=1, role=role)


def at(hour: int, minute: int, day: int = 6) -> datetime:
    return datetime(2026, 10, day, hour, minute, tzinfo=BR)


def adjustment(moments: list[datetime], note: str | None = None) -> dict:
    return {
        "kind": "adjustment",
        "reason_id": None,
        "note": note,
        "starts_on": None,
        "ends_on": None,
        "occurred_at": None,
        "punches": moments,
    }


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


def test_ajuste_pendente_guarda_o_dia_sem_alterar_marcacao():
    workforce, repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    workforce.create_punch(admin(), {"employee_id": person["id"], "occurred_at": at(8, 0), "note": None})
    created = workforce.create_request(admin(), adjustment([at(8, 5), at(12, 0), at(13, 0), at(18, 0)]))
    assert created["punches"] == [at(8, 5), at(12, 0), at(13, 0), at(18, 0)]
    assert created["status"] == "pending"
    punches = [row for row in repo.rows if isinstance(row, Punch)]
    assert len(punches) == 1
    assert punches[0].valid is True
    assert punches[0].occurred_at == at(8, 0).astimezone(ZoneInfo("UTC"))


def test_aprovacao_substitui_as_marcacoes_validas_do_dia():
    workforce, repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    other = workforce.create_employee(admin(), employee_payload("10987654321", None))
    morning = workforce.create_punch(admin(), {"employee_id": person["id"], "occurred_at": at(8, 0), "note": None})
    leaving = workforce.create_punch(admin(), {"employee_id": person["id"], "occurred_at": at(17, 0), "note": None})
    previous_day = workforce.create_punch(admin(), {"employee_id": person["id"], "occurred_at": at(8, 0, day=5), "note": None})
    neighbor = workforce.create_punch(admin(), {"employee_id": other["id"], "occurred_at": at(8, 0), "note": None})
    created = workforce.create_request(admin(), adjustment([at(8, 12), at(12, 2), at(13, 1), at(18, 4)], "Esqueci a saída"))
    workforce.decide_request(admin(), created["id"], {"status": "approved", "decision_note": None})
    assert morning.valid is False and morning.voided_at == NOW
    assert leaving.valid is False and leaving.voided_at == NOW
    assert previous_day.valid is True and neighbor.valid is True
    current = [row for row in repo.rows if isinstance(row, Punch) and row.employee_id == person["id"] and row.valid]
    assert sorted(row.occurred_at for row in current) == [
        at(8, 0, day=5).astimezone(ZoneInfo("UTC")),
        at(8, 12).astimezone(ZoneInfo("UTC")),
        at(12, 2).astimezone(ZoneInfo("UTC")),
        at(13, 1).astimezone(ZoneInfo("UTC")),
        at(18, 4).astimezone(ZoneInfo("UTC")),
    ]
    replaced = [row for row in current if row.occurred_at != previous_day.occurred_at]
    assert {row.source for row in replaced} == {"approved_request"}
    assert {row.request_id for row in replaced} == {created["id"]}
    audits = [row for row in repo.rows if isinstance(row, Audit) and row.action == "Correção de marcação"]
    assert len(audits) == 1 and audits[0].new_label == "solicitação"
    assert repo.count_model(Punch, tenant_id=1) == 8


def test_recusa_mantem_as_marcacoes_que_valem():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    original = workforce.create_punch(admin(), {"employee_id": person["id"], "occurred_at": at(8, 0), "note": None})
    created = workforce.create_request(admin(), adjustment([at(9, 0)]))
    workforce.decide_request(admin(), created["id"], {"status": "rejected", "decision_note": None})
    assert original.valid is True
    assert original.voided_at is None


def test_correcao_manual_do_administrador_segue_a_mesma_troca():
    workforce, repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    original = workforce.create_punch(
        scope(7, "member"),
        {"employee_id": person["id"], "occurred_at": at(8, 0, day=7), "note": None},
    )
    with pytest.raises(AppError) as denied:
        workforce.correct_punches(
            scope(7, "manager"),
            {"employee_id": person["id"], "punches": [at(8, 30, day=7), at(18, 0, day=7)], "note": None},
        )
    assert denied.value.status_code == 403
    assert original.valid is True
    corrected = workforce.correct_punches(
        admin(),
        {"employee_id": person["id"], "punches": [at(8, 30, day=7), at(18, 0, day=7)], "note": "Ajuste de gestão"},
    )
    assert corrected["origin"] == "manual"
    assert corrected["day"] == date(2026, 10, 7)
    assert [row.source for row in corrected["punches"]] == ["manual", "manual"]
    assert all(row.valid for row in corrected["punches"])
    assert original.valid is False
    assert workforce.dashboard(admin())["punches_today"] == 2
    audits = [row for row in repo.rows if isinstance(row, Audit) and row.action == "Correção de marcação"]
    assert audits[-1].new_label == "manual"


def test_periodo_fechado_bloqueia_ajuste_e_correcao():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    original = workforce.create_punch(admin(), {"employee_id": person["id"], "occurred_at": at(8, 0), "note": None})
    workforce.create_punch(admin(), {"employee_id": person["id"], "occurred_at": at(18, 0), "note": None})
    opened = workforce.create_closing(admin(), {"year": 2026, "month": 10, "note": None})
    workforce.update_closing(admin(), opened["id"], {"status": "closed", "note": None})
    with pytest.raises(AppError) as approval:
        workforce.create_request(admin(), adjustment([at(9, 0)]))
    with pytest.raises(AppError) as correction:
        workforce.correct_punches(admin(), {"employee_id": person["id"], "punches": [at(9, 30)], "note": None})
    assert approval.value.status_code == 409
    assert correction.value.status_code == 409
    assert original.valid is True


def test_ajuste_rejeita_dia_misturado_e_horario_repetido():
    workforce, _repo = service()
    workforce.create_employee(admin(), employee_payload())
    with pytest.raises(AppError) as mixed:
        workforce.create_request(admin(), adjustment([at(8, 0), at(8, 0, day=7)]))
    with pytest.raises(AppError) as repeated:
        workforce.create_request(admin(), adjustment([at(8, 0), at(8, 0)]))
    assert mixed.value.status_code == 400
    assert repeated.value.status_code == 400


def test_gestor_aprova_a_propria_equipe_e_o_administrador_qualquer_uma():
    workforce, repo = service()
    for person_id, role in ((8, "manager"), (9, "member"), (10, "member")):
        access = Membership(person_id=person_id, tenant_id=1, role=role)
        access.id = repo.seq
        repo.seq += 1
        repo.memberships.append(access)
    leader = workforce.create_employee(admin(), employee_payload("11111111111", 8))
    mate = workforce.create_employee(admin(), employee_payload("22222222222", 9))
    outsider = workforce.create_employee(admin(), employee_payload("33333333333", 10))
    unit = workforce.create_named(Unit, admin(), {"name": "Matriz"})
    sector = workforce.create_named(Sector, admin(), {"name": "Operação", "unit_id": unit.id})
    team_a = workforce.create_named(Team, admin(), {"name": "A", "sector_id": sector.id})
    team_b = workforce.create_named(Team, admin(), {"name": "B", "sector_id": sector.id})
    for person, team in ((leader, team_a), (mate, team_a), (outsider, team_b)):
        workforce.create_vigency(
            admin(),
            {
                "employee_id": person["id"],
                "kind": "team",
                "reference_id": team.id,
                "label": None,
                "valid_from": date(2026, 10, 1),
                "note": None,
            },
        )
    own = workforce.create_request(scope(8, "manager"), adjustment([at(8, 0)]))
    with pytest.raises(AppError) as own_decision:
        workforce.decide_request(scope(8, "manager"), own["id"], {"status": "approved", "decision_note": None})
    assert own_decision.value.status_code == 403
    mate_request = workforce.create_request(scope(9, "member"), adjustment([at(9, 0)]))
    approved = workforce.decide_request(scope(8, "manager"), mate_request["id"], {"status": "approved", "decision_note": None})
    assert approved["status"] == "approved"
    outside = workforce.create_request(scope(10, "member"), adjustment([at(10, 0)]))
    with pytest.raises(AppError) as other_team:
        workforce.decide_request(scope(8, "manager"), outside["id"], {"status": "rejected", "decision_note": None})
    assert other_team.value.status_code == 403
    decided = workforce.decide_request(admin(), outside["id"], {"status": "approved", "decision_note": None})
    assert decided["status"] == "approved"
    assert decided["decided_by_person_id"] == 7


def period(kind: str, **extra) -> dict:
    body = {
        "kind": kind,
        "reason_id": None,
        "note": None,
        "starts_on": date(2026, 10, 6),
        "ends_on": None,
        "occurred_at": None,
        "starts_at": None,
        "ends_at": None,
        "cid": None,
        "crm": None,
        "doctor_name": None,
        "photo_key": None,
        "punches": None,
    }
    body.update(extra)
    return body


def certificate(**extra) -> dict:
    body = period("certificate", cid="A00", crm="12345", doctor_name="Dra. Luz")
    body.update(extra)
    return body


def test_pedido_pendente_de_abono_nao_cria_ocorrencia():
    workforce, repo = service()
    workforce.create_employee(admin(), employee_payload())
    created = workforce.create_request(admin(), period("allowance"))
    assert created["status"] == "pending"
    assert repo.count_model(Occurrence, tenant_id=1) == 0


def test_aprovacao_de_afastamento_e_ferias_grava_origem_solicitacao():
    workforce, repo = service()
    workforce.create_employee(admin(), employee_payload())
    leave = workforce.create_request(admin(), period("leave", ends_on=date(2026, 10, 8)))
    workforce.decide_request(admin(), leave["id"], {"status": "approved", "decision_note": None})
    vacation = workforce.create_request(admin(), period("vacation"))
    workforce.decide_request(admin(), vacation["id"], {"status": "approved", "decision_note": None})
    rows = [row for row in repo.rows if isinstance(row, Occurrence)]
    assert {row.kind for row in rows} == {"leave", "vacation"}
    assert {row.source for row in rows} == {"approved_request"}
    assert all(row.warning is None for row in rows)


def test_atestado_entra_e_avisa_quando_ha_marcacao_no_periodo():
    workforce, repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    workforce.create_punch(admin(), {"employee_id": person["id"], "occurred_at": at(8, 0), "note": None})
    created = workforce.create_request(admin(), certificate())
    assert repo.count_model(Occurrence, tenant_id=1) == 0
    workforce.decide_request(admin(), created["id"], {"status": "approved", "decision_note": None})
    row = next(item for item in repo.rows if isinstance(item, Occurrence))
    assert row.source == "approved_request"
    assert row.cid == "A00" and row.crm == "12345" and row.doctor_name == "Dra. Luz"
    assert row.photo_key is None
    assert row.warning == "período abonado conflita com registro de ponto"


def test_horario_parcial_ignora_marcacao_invalida_e_fora_da_faixa():
    workforce, repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    early = workforce.create_punch(admin(), {"employee_id": person["id"], "occurred_at": at(8, 0), "note": None})
    created = workforce.create_request(admin(), adjustment([at(18, 0)]))
    workforce.decide_request(admin(), created["id"], {"status": "approved", "decision_note": None})
    assert early.valid is False
    hours = workforce.create_request(
        admin(),
        certificate(starts_at=at(8, 0), ends_at=at(9, 0)),
    )
    workforce.decide_request(admin(), hours["id"], {"status": "approved", "decision_note": None})
    warned = [row for row in repo.rows if isinstance(row, Occurrence) and row.kind == "certificate"]
    assert warned[0].warning is None
    assert warned[0].starts_at == at(8, 0).astimezone(ZoneInfo("UTC"))


def test_atestado_exige_medico_e_rejeita_foto_de_outro_tipo():
    workforce, _repo = service()
    workforce.create_employee(admin(), employee_payload())
    with pytest.raises(AppError) as missing:
        workforce.create_request(admin(), period("certificate", cid="A00"))
    with pytest.raises(AppError) as photo:
        workforce.create_request(admin(), period("allowance", photo_key="1/certificates/foto.jpg"))
    assert missing.value.status_code == 400
    assert photo.value.status_code == 400


def test_gestor_lanca_os_quatro_na_propria_equipe():
    workforce, repo = service()
    for person_id, role in ((8, "manager"), (9, "member"), (10, "member")):
        access = Membership(person_id=person_id, tenant_id=1, role=role)
        access.id = repo.seq
        repo.seq += 1
        repo.memberships.append(access)
    leader = workforce.create_employee(admin(), employee_payload("11111111111", 8))
    mate = workforce.create_employee(admin(), employee_payload("22222222222", 9))
    outsider = workforce.create_employee(admin(), employee_payload("33333333333", 10))
    unit = workforce.create_named(Unit, admin(), {"name": "Matriz"})
    sector = workforce.create_named(Sector, admin(), {"name": "Operação", "unit_id": unit.id})
    team_a = workforce.create_named(Team, admin(), {"name": "A", "sector_id": sector.id})
    team_b = workforce.create_named(Team, admin(), {"name": "B", "sector_id": sector.id})
    for person, team in ((leader, team_a), (mate, team_a), (outsider, team_b)):
        workforce.create_vigency(
            admin(),
            {
                "employee_id": person["id"],
                "kind": "team",
                "reference_id": team.id,
                "label": None,
                "valid_from": date(2026, 10, 1),
                "note": None,
            },
        )
    launched = workforce.create_occurrence(
        scope(8, "manager"),
        {
            "employee_id": mate["id"],
            "kind": "allowance",
            "starts_on": date(2026, 10, 6),
            "ends_on": None,
            "starts_at": None,
            "ends_at": None,
            "reason_id": None,
            "note": None,
            "cid": None,
            "crm": None,
            "doctor_name": None,
            "photo_key": None,
        },
    )
    assert launched.source == "manual"
    manual = workforce.create_occurrence(
        admin(),
        {
            "employee_id": outsider["id"],
            "kind": "vacation",
            "starts_on": date(2026, 10, 6),
            "ends_on": date(2026, 10, 10),
            "starts_at": None,
            "ends_at": None,
            "reason_id": None,
            "note": None,
            "cid": None,
            "crm": None,
            "doctor_name": None,
            "photo_key": None,
        },
    )
    assert manual.source == "manual"
    with pytest.raises(AppError) as other_team:
        workforce.create_occurrence(
            scope(8, "manager"),
            {
                "employee_id": outsider["id"],
                "kind": "leave",
                "starts_on": date(2026, 10, 6),
                "ends_on": None,
                "starts_at": None,
                "ends_at": None,
                "reason_id": None,
                "note": None,
                "cid": None,
                "crm": None,
                "doctor_name": None,
                "photo_key": None,
            },
        )
    with pytest.raises(AppError) as member:
        workforce.create_occurrence(
            scope(9, "member"),
            {
                "employee_id": mate["id"],
                "kind": "allowance",
                "starts_on": date(2026, 10, 5),
                "ends_on": None,
                "starts_at": None,
                "ends_at": None,
                "reason_id": None,
                "note": None,
                "cid": None,
                "crm": None,
                "doctor_name": None,
                "photo_key": None,
            },
        )
    assert other_team.value.status_code == 403
    assert member.value.status_code == 403


def work_journey(workforce: WorkforceService, employee_id: int, name: str = "Comercial"):
    journey = workforce.create_named(
        Journey,
        admin(),
        {
            "name": name,
            "morning_start": "08:00",
            "morning_end": "12:00",
            "afternoon_start": "13:00",
            "afternoon_end": "17:48",
            "note": None,
        },
    )
    workforce.create_vigency(
        admin(),
        {
            "employee_id": employee_id,
            "kind": "journey",
            "reference_id": journey.id,
            "label": None,
            "valid_from": date(2026, 10, 1),
            "note": None,
        },
    )
    return journey


def mark(workforce: WorkforceService, employee_id: int, day: int, *clocks: tuple[int, int]):
    rows = []
    for hour, minute in clocks:
        rows.append(
            workforce.create_punch(
                admin(),
                {"employee_id": employee_id, "occurred_at": at(hour, minute, day), "note": None},
            )
        )
    return rows


def day_result(result: dict, day: date) -> dict:
    return next(item for item in result["items"] if item["work_date"] == day)


def test_periodo_fechado_bloqueia_o_lancamento_manual():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    opened = workforce.create_closing(admin(), {"year": 2026, "month": 10, "note": None})
    workforce.update_closing(admin(), opened["id"], {"status": "closed", "note": None})
    with pytest.raises(AppError) as caught:
        workforce.create_occurrence(
            admin(),
            {
                "employee_id": person["id"],
                "kind": "certificate",
                "starts_on": date(2026, 10, 6),
                "ends_on": None,
                "starts_at": None,
                "ends_at": None,
                "reason_id": None,
                "note": None,
                "cid": "A00",
                "crm": "12345",
                "doctor_name": "Dra. Luz",
                "photo_key": None,
            },
        )
    assert caught.value.status_code == 409


def test_apuracao_usa_so_marcacao_valida_e_ignora_pedido_pendente():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    work_journey(workforce, person["id"])
    kept = mark(workforce, person["id"], 6, (8, 0), (12, 0), (13, 0), (17, 48))
    extra = workforce.create_punch(admin(), {"employee_id": person["id"], "occurred_at": at(9, 0), "note": None})
    extra.valid = False
    workforce.create_request(admin(), adjustment([at(10, 0)]))
    result = workforce.time_results(admin(), person["id"], date(2026, 10, 6), date(2026, 10, 6))
    row = result["items"][0]
    assert row["worked_minutes"] == 8 * 60 + 48
    assert row["expected_minutes"] == 8 * 60 + 48
    assert row["overtime_minutes"] == 0
    assert row["absence"] is False
    assert row["incomplete"] is False
    assert all(item.valid for item in kept)


def test_tolerancia_perdoa_dez_minutos_e_desconta_o_atraso_inteiro():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    work_journey(workforce, person["id"])
    mark(workforce, person["id"], 6, (8, 10), (12, 0), (13, 0), (17, 48))
    mark(workforce, person["id"], 7, (8, 11), (12, 0), (13, 0), (17, 48))
    result = workforce.time_results(admin(), person["id"], date(2026, 10, 6), date(2026, 10, 7))
    forgiven = day_result(result, date(2026, 10, 6))
    late = day_result(result, date(2026, 10, 7))
    assert forgiven["delay_minutes"] == 0
    assert forgiven["worked_minutes"] == 8 * 60 + 48
    assert late["delay_minutes"] == 11
    assert late["worked_minutes"] == 8 * 60 + 48 - 11
    assert late["incomplete"] is False


def test_saida_antecipada_desconta_e_hora_extra_e_o_excedente():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    work_journey(workforce, person["id"])
    mark(workforce, person["id"], 6, (8, 0), (12, 0), (13, 0), (17, 18))
    mark(workforce, person["id"], 7, (8, 0), (12, 0), (13, 0), (18, 18))
    result = workforce.time_results(admin(), person["id"], date(2026, 10, 6), date(2026, 10, 7))
    early = day_result(result, date(2026, 10, 6))
    extra = day_result(result, date(2026, 10, 7))
    assert early["early_leave_minutes"] == 30
    assert early["worked_minutes"] == 8 * 60 + 18
    assert early["overtime_minutes"] == 0
    assert extra["overtime_minutes"] == 30
    assert extra["worked_minutes"] == 9 * 60 + 18
    assert extra["early_leave_minutes"] == 0


def test_intervalo_menor_avisa_e_a_marcacao_permanece():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    work_journey(workforce, person["id"])
    rows = mark(workforce, person["id"], 6, (8, 0), (12, 0), (12, 40), (17, 48))
    result = workforce.time_results(admin(), person["id"], date(2026, 10, 6), date(2026, 10, 6))
    assert result["items"][0]["warnings"] == ["intervalo menor do que o previsto"]
    assert result["items"][0]["incomplete"] is False
    assert all(row.valid for row in rows)


def test_feriado_trabalhado_vira_hora_extra_e_noturno_fica_no_horario():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    work_journey(workforce, person["id"])
    workforce.create_named(Holiday, admin(), {"name": "Segunda", "holiday_date": date(2026, 10, 5), "note": None})
    workforce.create_named(Holiday, admin(), {"name": "Terca", "holiday_date": date(2026, 10, 6), "note": None})
    mark(workforce, person["id"], 5, (22, 0), (23, 0))
    mark(workforce, person["id"], 6, (22, 0))
    mark(workforce, person["id"], 7, (5, 0), (12, 0))
    result = workforce.time_results(admin(), person["id"], date(2026, 10, 5), date(2026, 10, 6))
    same_day = day_result(result, date(2026, 10, 5))
    crossed = day_result(result, date(2026, 10, 6))
    assert same_day["holiday"] is True
    assert same_day["overtime_minutes"] == 60
    assert same_day["night_minutes"] == 60
    assert same_day["night_additional_minutes"] == 12
    assert same_day["absence"] is False
    assert same_day["incomplete"] is False
    assert crossed["overtime_minutes"] == 7 * 60
    assert crossed["night_minutes"] == 7 * 60
    assert crossed["night_additional_minutes"] == 84
    assert crossed["incomplete"] is False
    morning = workforce.time_results(admin(), person["id"], date(2026, 10, 7), date(2026, 10, 7))
    assert morning["items"][0]["worked_minutes"] == 0


def test_abono_aprovado_tira_a_falta_e_o_pendente_nao():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    work_journey(workforce, person["id"])
    before = workforce.time_results(admin(), person["id"], date(2026, 10, 5), date(2026, 10, 6))
    assert day_result(before, date(2026, 10, 6))["absence"] is True
    pending = workforce.create_request(admin(), period("allowance"))
    waiting = workforce.time_results(admin(), person["id"], date(2026, 10, 6), date(2026, 10, 6))
    assert waiting["items"][0]["absence"] is True
    workforce.decide_request(admin(), pending["id"], {"status": "approved", "decision_note": None})
    workforce.create_occurrence(
        admin(),
        {
            "employee_id": person["id"],
            "kind": "allowance",
            "starts_on": date(2026, 10, 7),
            "ends_on": None,
            "starts_at": at(8, 0, 7),
            "ends_at": at(9, 0, 7),
            "reason_id": None,
            "note": None,
            "cid": None,
            "crm": None,
            "doctor_name": None,
            "photo_key": None,
        },
    )
    result = workforce.time_results(admin(), person["id"], date(2026, 10, 5), date(2026, 10, 7))
    assert day_result(result, date(2026, 10, 5))["absence"] is True
    assert day_result(result, date(2026, 10, 6))["absence"] is False
    assert day_result(result, date(2026, 10, 6))["incomplete"] is False
    assert day_result(result, date(2026, 10, 7))["absence"] is True


def test_ponto_incompleto_e_as_excecoes_do_dia():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    work_journey(workforce, person["id"])
    mark(workforce, person["id"], 1, (8, 0))
    mark(workforce, person["id"], 2, (8, 0))
    mark(workforce, person["id"], 3, (8, 0))
    mark(workforce, person["id"], 5, (8, 0))
    mark(workforce, person["id"], 6, (8, 0))
    mark(workforce, person["id"], 7, (8, 0))
    for kind, day in (("vacation", date(2026, 10, 1)), ("leave", date(2026, 10, 2)), ("allowance", date(2026, 10, 5))):
        workforce.create_occurrence(
            admin(),
            {
                "employee_id": person["id"],
                "kind": kind,
                "starts_on": day,
                "ends_on": None,
                "starts_at": None,
                "ends_at": None,
                "reason_id": None,
                "note": None,
                "cid": None,
                "crm": None,
                "doctor_name": None,
                "photo_key": None,
            },
        )
    workforce.create_occurrence(
        admin(),
        {
            "employee_id": person["id"],
            "kind": "certificate",
            "starts_on": date(2026, 10, 7),
            "ends_on": None,
            "starts_at": None,
            "ends_at": None,
            "reason_id": None,
            "note": None,
            "cid": "A00",
            "crm": "12345",
            "doctor_name": "Dra. Luz",
            "photo_key": None,
        },
    )
    workforce.create_occurrence(
        admin(),
        {
            "employee_id": person["id"],
            "kind": "certificate",
            "starts_on": date(2026, 10, 6),
            "ends_on": None,
            "starts_at": at(8, 0),
            "ends_at": at(9, 0),
            "reason_id": None,
            "note": None,
            "cid": "A00",
            "crm": "12345",
            "doctor_name": "Dra. Luz",
            "photo_key": None,
        },
    )
    result = workforce.time_results(admin(), person["id"], date(2026, 10, 1), date(2026, 10, 7))
    assert day_result(result, date(2026, 10, 1))["incomplete"] is False
    assert day_result(result, date(2026, 10, 2))["incomplete"] is False
    assert day_result(result, date(2026, 10, 3))["incomplete"] is False
    assert day_result(result, date(2026, 10, 3))["absence"] is False
    assert day_result(result, date(2026, 10, 5))["incomplete"] is False
    assert day_result(result, date(2026, 10, 5))["absence"] is False
    opened = day_result(result, date(2026, 10, 6))
    assert opened["incomplete"] is True
    assert opened["absence"] is False
    assert "período abonado conflita com registro de ponto" in opened["warnings"]
    closed = day_result(result, date(2026, 10, 7))
    assert closed["incomplete"] is False
    assert "período abonado conflita com registro de ponto" in closed["warnings"]


def test_jornada_vigente_muda_o_previsto_do_dia():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    work_journey(workforce, person["id"])
    short = workforce.create_named(
        Journey,
        admin(),
        {
            "name": "Manha",
            "morning_start": "08:00",
            "morning_end": "12:00",
            "afternoon_start": None,
            "afternoon_end": None,
            "note": None,
        },
    )
    workforce.create_vigency(
        admin(),
        {
            "employee_id": person["id"],
            "kind": "journey",
            "reference_id": short.id,
            "label": None,
            "valid_from": date(2026, 10, 7),
            "note": None,
        },
    )
    mark(workforce, person["id"], 6, (8, 0), (12, 0), (13, 0), (17, 48))
    mark(workforce, person["id"], 7, (8, 0), (12, 0))
    result = workforce.time_results(admin(), person["id"], date(2026, 10, 6), date(2026, 10, 7))
    assert day_result(result, date(2026, 10, 6))["expected_minutes"] == 8 * 60 + 48
    assert day_result(result, date(2026, 10, 7))["expected_minutes"] == 4 * 60
    assert day_result(result, date(2026, 10, 7))["worked_minutes"] == 4 * 60
    assert day_result(result, date(2026, 10, 7))["warnings"] == []


def test_apuracao_recusa_periodo_invertido_e_funcionario_de_outra_pessoa():
    workforce, repo = service()
    access = Membership(person_id=9, tenant_id=1, role="member")
    access.id = repo.seq
    repo.seq += 1
    repo.memberships.append(access)
    own = workforce.create_employee(admin(), employee_payload("22222222222", 9))
    other = workforce.create_employee(admin(), employee_payload())
    with pytest.raises(AppError) as inverted:
        workforce.time_results(admin(), own["id"], date(2026, 10, 7), date(2026, 10, 6))
    with pytest.raises(AppError) as hidden:
        workforce.time_results(scope(9, "member"), other["id"], date(2026, 10, 6), date(2026, 10, 6))
    assert inverted.value.status_code == 400
    assert hidden.value.status_code == 404


def admitted(day: date, cpf: str = "12345678901", person_id: int | None = 7) -> dict:
    payload = employee_payload(cpf, person_id)
    payload["admission_date"] = day
    return payload


def test_sem_banco_excedente_e_hora_extra_e_a_falta_de_tempo_desconta():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), admitted(date(2026, 10, 7)))
    work_journey(workforce, person["id"])
    mark(workforce, person["id"], 7, (8, 0), (12, 0), (13, 0), (18, 18))
    extra = workforce.time_results(admin(), person["id"], date(2026, 10, 7), date(2026, 10, 7))["items"][0]
    assert extra["overtime_minutes"] == 30
    assert extra["shortage_minutes"] == 0
    assert extra["bank_minutes"] == 0
    short = workforce.create_employee(admin(), admitted(date(2026, 10, 6), "10987654321", None))
    work_journey(workforce, short["id"], "Comercial 2")
    mark(workforce, short["id"], 6, (8, 0), (12, 0), (13, 0), (17, 18))
    missing = workforce.time_results(admin(), short["id"], date(2026, 10, 6), date(2026, 10, 6))["items"][0]
    assert missing["overtime_minutes"] == 0
    assert missing["shortage_minutes"] == 30
    assert missing["absence"] is False
    with pytest.raises(AppError) as blocked:
        workforce.create_hour_bank_entry(
            admin(),
            {"employee_id": person["id"], "kind": "credit", "minutes": 10, "entry_on": None, "note": None},
        )
    assert blocked.value.status_code == 409


def test_com_banco_o_excedente_soma_e_o_que_falta_compensa():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), admitted(date(2026, 10, 6)))
    workforce.update_employee(admin(), person["id"], {"hour_bank": True})
    work_journey(workforce, person["id"])
    mark(workforce, person["id"], 6, (8, 0), (12, 0), (13, 0), (18, 18))
    mark(workforce, person["id"], 7, (8, 0), (12, 0), (13, 0), (17, 38))
    result = workforce.time_results(admin(), person["id"], date(2026, 10, 6), date(2026, 10, 7))
    assert day_result(result, date(2026, 10, 6))["overtime_minutes"] == 0
    assert day_result(result, date(2026, 10, 6))["bank_minutes"] == 30
    assert day_result(result, date(2026, 10, 7))["bank_minutes"] == -10
    assert day_result(result, date(2026, 10, 7))["shortage_minutes"] == 0
    balance = workforce.hour_bank(admin(), person["id"])
    assert balance["balance_minutes"] == 20
    assert balance["credit_minutes"] == 30
    assert balance["debit_minutes"] == 10


def test_adicional_noturno_nao_entra_no_saldo():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), admitted(date(2026, 10, 7)))
    workforce.update_employee(admin(), person["id"], {"hour_bank": True})
    workforce.create_named(Holiday, admin(), {"name": "Hoje", "holiday_date": date(2026, 10, 7), "note": None})
    mark(workforce, person["id"], 7, (22, 0), (23, 0))
    day = workforce.time_results(admin(), person["id"], date(2026, 10, 7), date(2026, 10, 7))["items"][0]
    assert day["night_minutes"] == 60
    assert day["night_additional_minutes"] == 12
    assert day["overtime_minutes"] == 0
    assert day["bank_minutes"] == 60
    assert workforce.hour_bank(admin(), person["id"])["balance_minutes"] == 60


def test_quitacao_parcial_paga_hora_extra_ou_desconta_falta():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), admitted(date(2026, 10, 7)))
    workforce.update_employee(admin(), person["id"], {"hour_bank": True})
    work_journey(workforce, person["id"])
    mark(workforce, person["id"], 7, (8, 0), (12, 0), (13, 0), (18, 18))
    paid = workforce.create_hour_bank_entry(
        admin(),
        {"employee_id": person["id"], "kind": "settlement", "minutes": 10, "entry_on": None, "note": None},
    )
    assert paid.effect == "overtime"
    assert workforce.hour_bank(admin(), person["id"])["balance_minutes"] == 20
    assert workforce.hour_bank(admin(), person["id"])["paid_overtime_minutes"] == 10
    with pytest.raises(AppError) as too_much:
        workforce.create_hour_bank_entry(
            admin(),
            {"employee_id": person["id"], "kind": "settlement", "minutes": 21, "entry_on": None, "note": None},
        )
    assert too_much.value.status_code == 400
    negative = workforce.create_employee(admin(), admitted(date(2026, 10, 7), "10987654321", None))
    workforce.update_employee(admin(), negative["id"], {"hour_bank": True})
    work_journey(workforce, negative["id"], "Comercial 2")
    mark(workforce, negative["id"], 7, (8, 0), (12, 0), (13, 0), (17, 18))
    discounted = workforce.create_hour_bank_entry(
        admin(),
        {"employee_id": negative["id"], "kind": "settlement", "minutes": 10, "entry_on": date(2026, 10, 7), "note": None},
    )
    assert discounted.effect == "absence"
    balance = workforce.hour_bank(admin(), negative["id"])
    assert balance["balance_minutes"] == -20
    assert balance["discounted_absence_minutes"] == 10
    assert balance["warning"] is None


def test_lancamento_manual_e_aviso_de_expiracao():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), admitted(date(2026, 10, 7)))
    workforce.update_employee(admin(), person["id"], {"hour_bank": True})
    oldest = workforce.create_hour_bank_entry(
        admin(),
        {"employee_id": person["id"], "kind": "credit", "minutes": 40, "entry_on": date(2026, 4, 8), "note": None},
    )
    workforce.create_hour_bank_entry(
        admin(),
        {"employee_id": person["id"], "kind": "credit", "minutes": 15, "entry_on": date(2026, 9, 1), "note": None},
    )
    first = workforce.hour_bank(admin(), person["id"])
    assert first["balance_minutes"] == 55
    assert first["warning"] == "Saldo irá expirar em 1 dias"
    workforce.create_hour_bank_entry(
        admin(),
        {"employee_id": person["id"], "kind": "settlement", "minutes": 40, "entry_on": date(2026, 10, 7), "note": None},
    )
    left = (date(2027, 3, 1) - date(2026, 10, 7)).days
    second = workforce.hour_bank(admin(), person["id"])
    assert second["balance_minutes"] == 15
    assert second["warning"] == f"Saldo irá expirar em {left} dias"
    workforce.create_hour_bank_entry(
        admin(),
        {"employee_id": person["id"], "kind": "debit", "minutes": 5, "entry_on": date(2026, 10, 7), "note": None},
    )
    assert workforce.hour_bank(admin(), person["id"])["balance_minutes"] == 10
    created = workforce.hour_bank(admin(), person["id"])
    assert created["credit_minutes"] == 55
    assert created["debit_minutes"] == 5
    with pytest.raises(AppError) as kept:
        workforce.refuse_hour_bank_change(admin(), oldest.id)
    assert kept.value.status_code == 409


def test_abono_e_ponto_incompleto_nao_movimentam_o_banco():
    workforce, _repo = service()
    excused = workforce.create_employee(admin(), admitted(date(2026, 10, 7)))
    workforce.update_employee(admin(), excused["id"], {"hour_bank": True})
    work_journey(workforce, excused["id"])
    workforce.create_occurrence(
        admin(),
        {
            "employee_id": excused["id"],
            "kind": "allowance",
            "starts_on": date(2026, 10, 7),
            "ends_on": None,
            "starts_at": None,
            "ends_at": None,
            "reason_id": None,
            "note": None,
            "cid": None,
            "crm": None,
            "doctor_name": None,
            "photo_key": None,
        },
    )
    assert workforce.hour_bank(admin(), excused["id"])["balance_minutes"] == 0
    opened = workforce.create_employee(admin(), admitted(date(2026, 10, 7), "10987654321", None))
    workforce.update_employee(admin(), opened["id"], {"hour_bank": True})
    work_journey(workforce, opened["id"], "Comercial 2")
    mark(workforce, opened["id"], 7, (8, 0))
    day = workforce.time_results(admin(), opened["id"], date(2026, 10, 7), date(2026, 10, 7))["items"][0]
    assert day["incomplete"] is True
    assert day["bank_minutes"] == 0
    assert workforce.hour_bank(admin(), opened["id"])["balance_minutes"] == 0


def test_gestor_lanca_na_equipe_e_periodo_fechado_bloqueia():
    workforce, repo = service()
    for person_id, role in ((8, "manager"), (9, "member"), (10, "member")):
        access = Membership(person_id=person_id, tenant_id=1, role=role)
        access.id = repo.seq
        repo.seq += 1
        repo.memberships.append(access)
    leader = workforce.create_employee(admin(), employee_payload("11111111111", 8))
    mate = workforce.create_employee(admin(), employee_payload("22222222222", 9))
    outsider = workforce.create_employee(admin(), employee_payload("33333333333", 10))
    for person in (mate, outsider):
        workforce.update_employee(admin(), person["id"], {"hour_bank": True})
    unit = workforce.create_named(Unit, admin(), {"name": "Matriz"})
    sector = workforce.create_named(Sector, admin(), {"name": "Operação", "unit_id": unit.id})
    team_a = workforce.create_named(Team, admin(), {"name": "A", "sector_id": sector.id})
    team_b = workforce.create_named(Team, admin(), {"name": "B", "sector_id": sector.id})
    for person, team in ((leader, team_a), (mate, team_a), (outsider, team_b)):
        workforce.create_vigency(
            admin(),
            {
                "employee_id": person["id"],
                "kind": "team",
                "reference_id": team.id,
                "label": None,
                "valid_from": date(2026, 10, 1),
                "note": None,
            },
        )
    launched = workforce.create_hour_bank_entry(
        scope(8, "manager"),
        {"employee_id": mate["id"], "kind": "credit", "minutes": 15, "entry_on": date(2026, 9, 15), "note": None},
    )
    assert launched.created_by_person_id == 8
    assert workforce.hour_bank(scope(9, "member"), mate["id"])["balance_minutes"] == 15
    with pytest.raises(AppError) as other_team:
        workforce.create_hour_bank_entry(
            scope(8, "manager"),
            {"employee_id": outsider["id"], "kind": "credit", "minutes": 5, "entry_on": None, "note": None},
        )
    with pytest.raises(AppError) as member:
        workforce.create_hour_bank_entry(
            scope(9, "member"),
            {"employee_id": mate["id"], "kind": "debit", "minutes": 5, "entry_on": None, "note": None},
        )
    assert other_team.value.status_code == 403
    assert member.value.status_code == 403
    with pytest.raises(AppError) as hidden:
        workforce.hour_bank(scope(9, "member"), outsider["id"])
    assert hidden.value.status_code == 404
    workforce.create_hour_bank_entry(
        admin(),
        {"employee_id": outsider["id"], "kind": "credit", "minutes": 20, "entry_on": date(2026, 9, 15), "note": None},
    )
    opened = workforce.create_closing(admin(), {"year": 2026, "month": 10, "note": None})
    workforce.update_closing(admin(), opened["id"], {"status": "closed", "note": None})
    with pytest.raises(AppError) as closed:
        workforce.create_hour_bank_entry(
            admin(),
            {"employee_id": outsider["id"], "kind": "credit", "minutes": 5, "entry_on": date(2026, 10, 7), "note": None},
        )
    assert closed.value.status_code == 409
    still_open = workforce.create_hour_bank_entry(
        admin(),
        {"employee_id": outsider["id"], "kind": "settlement", "minutes": 1, "entry_on": date(2026, 9, 20), "note": None},
    )
    assert still_open.effect == "overtime"


def test_pendencia_e_ponto_incompleto_impedem_o_fechamento():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    pending = workforce.create_request(admin(), period("allowance", starts_on=date(2026, 10, 5)))
    opened = workforce.create_closing(admin(), {"year": 2026, "month": 10, "note": None})
    with pytest.raises(AppError) as waiting:
        workforce.update_closing(admin(), opened["id"], {"status": "closed", "note": None})
    assert waiting.value.status_code == 409
    assert waiting.value.message == "Há solicitação pendente no período"
    workforce.decide_request(admin(), pending["id"], {"status": "rejected", "decision_note": None})
    workforce.create_punch(admin(), {"employee_id": person["id"], "occurred_at": at(8, 0), "note": None})
    with pytest.raises(AppError) as odd:
        workforce.update_closing(admin(), opened["id"], {"status": "closed", "note": None})
    assert odd.value.message == "Há ponto incompleto no período"
    workforce.create_punch(admin(), {"employee_id": person["id"], "occurred_at": at(18, 0), "note": None})
    closed = workforce.update_closing(admin(), opened["id"], {"status": "closed", "note": None})
    assert closed["status"] == "closed"
    assert closed["starts_on"] == date(2026, 10, 1)
    assert closed["ends_on"] == date(2026, 10, 31)


def test_conflito_impede_o_fechamento_e_intervalo_menor_nao():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    work_journey(workforce, person["id"])
    mark(workforce, person["id"], 6, (8, 0), (12, 0), (12, 40), (17, 48))
    warned = workforce.time_results(admin(), person["id"], date(2026, 10, 6), date(2026, 10, 6))["items"][0]
    assert warned["warnings"] == ["intervalo menor do que o previsto"]
    opened = workforce.create_closing(
        admin(),
        {"starts_on": date(2026, 10, 6), "ends_on": date(2026, 10, 6), "note": None},
    )
    closed = workforce.update_closing(admin(), opened["id"], {"status": "closed", "note": None})
    assert closed["status"] == "closed"
    other = workforce.create_employee(admin(), employee_payload("10987654321", None))
    workforce.create_punch(admin(), {"employee_id": other["id"], "occurred_at": at(8, 0, 5), "note": None})
    workforce.create_occurrence(
        admin(),
        {
            "employee_id": other["id"],
            "kind": "allowance",
            "starts_on": date(2026, 10, 5),
            "ends_on": None,
            "starts_at": None,
            "ends_at": None,
            "reason_id": None,
            "note": None,
            "cid": None,
            "crm": None,
            "doctor_name": None,
            "photo_key": None,
        },
    )
    blocked = workforce.create_closing(
        admin(),
        {"starts_on": date(2026, 10, 5), "ends_on": date(2026, 10, 5), "note": None},
    )
    with pytest.raises(AppError) as conflict:
        workforce.update_closing(admin(), blocked["id"], {"status": "closed", "note": None})
    assert conflict.value.message == "Há conflito entre abono ou atestado e marcação no período"


def test_ferias_e_fim_de_semana_nao_sao_ponto_incompleto():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    workforce.create_punch(admin(), {"employee_id": person["id"], "occurred_at": at(8, 0, 3), "note": None})
    weekend = workforce.create_closing(
        admin(),
        {"starts_on": date(2026, 10, 3), "ends_on": date(2026, 10, 3), "note": None},
    )
    assert workforce.update_closing(admin(), weekend["id"], {"status": "closed", "note": None})["status"] == "closed"
    workforce.create_punch(admin(), {"employee_id": person["id"], "occurred_at": at(8, 0, 5), "note": None})
    workforce.create_occurrence(
        admin(),
        {
            "employee_id": person["id"],
            "kind": "vacation",
            "starts_on": date(2026, 10, 5),
            "ends_on": None,
            "starts_at": None,
            "ends_at": None,
            "reason_id": None,
            "note": None,
            "cid": None,
            "crm": None,
            "doctor_name": None,
            "photo_key": None,
        },
    )
    holiday = workforce.create_closing(
        admin(),
        {"starts_on": date(2026, 10, 5), "ends_on": date(2026, 10, 5), "note": None},
    )
    assert workforce.update_closing(admin(), holiday["id"], {"status": "closed", "note": None})["status"] == "closed"


def test_cancelar_e_reabrir_exigem_motivo_e_liberam_o_periodo():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    opened = workforce.create_closing(admin(), {"year": 2026, "month": 10, "note": None})
    workforce.update_closing(admin(), opened["id"], {"status": "closed", "note": None})
    with pytest.raises(AppError) as missing:
        workforce.update_closing(admin(), opened["id"], {"status": "cancelled", "note": None})
    assert missing.value.status_code == 400
    cancelled = workforce.update_closing(admin(), opened["id"], {"status": "cancelled", "note": "Erro de competência"})
    assert cancelled["status"] == "cancelled"
    assert cancelled["events"][-1]["kind"] == "cancelled"
    workforce.create_punch(admin(), {"employee_id": person["id"], "occurred_at": at(8, 0), "note": None})
    workforce.create_punch(admin(), {"employee_id": person["id"], "occurred_at": at(18, 0), "note": None})
    with pytest.raises(AppError) as bare:
        workforce.update_closing(admin(), opened["id"], {"status": "open", "note": " "})
    assert bare.value.status_code == 400
    reopened = workforce.update_closing(admin(), opened["id"], {"status": "open", "note": "Corrigir o ponto"})
    assert reopened["status"] == "open"
    assert reopened["closed_at"] is None
    assert reopened["events"][-1]["kind"] == "reopened"
    again = workforce.update_closing(admin(), opened["id"], {"status": "closed", "note": None})
    assert again["status"] == "closed"
    with pytest.raises(AppError) as locked:
        workforce.create_punch(admin(), {"employee_id": person["id"], "occurred_at": at(12, 0), "note": None})
    assert locked.value.status_code == 409
    workforce.update_closing(admin(), opened["id"], {"status": "open", "note": "Segunda correção"})
    workforce.create_punch(admin(), {"employee_id": person["id"], "occurred_at": at(12, 0), "note": None})


def test_gestor_fecha_intervalo_e_membro_nao():
    workforce, _repo = service()
    person = workforce.create_employee(admin(), employee_payload())
    opened = workforce.create_closing(
        scope(8, "manager"),
        {"starts_on": date(2026, 10, 6), "ends_on": date(2026, 10, 7), "note": None},
    )
    workforce.update_closing(scope(8, "manager"), opened["id"], {"status": "closed", "note": None})
    with pytest.raises(AppError) as inside:
        workforce.create_punch(admin(), {"employee_id": person["id"], "occurred_at": at(8, 0, 6), "note": None})
    workforce.create_punch(admin(), {"employee_id": person["id"], "occurred_at": at(8, 0, 5), "note": None})
    assert inside.value.status_code == 409
    with pytest.raises(AppError) as member:
        workforce.create_closing(scope(9, "member"), {"year": 2026, "month": 9, "note": None})
    with pytest.raises(AppError) as overlap:
        workforce.create_closing(
            admin(),
            {"starts_on": date(2026, 10, 7), "ends_on": date(2026, 10, 8), "note": None},
        )
    assert member.value.status_code == 403
    assert overlap.value.status_code == 409
