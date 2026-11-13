import base64
from datetime import datetime, timedelta, timezone

import pytest

from app.core.exceptions import AppError
from app.core.security import hash_secret
from app.models.workforce import ClockDevice, ClockDeviceGrant, ClockEnrollAttempt, ClockReleaseCode
from sqlalchemy.exc import IntegrityError

from app.services.clock_device_service import CODE_ALPHABET, ClockDeviceService
from app.services.workforce_service import Scope

NOW = datetime(2026, 11, 11, 18, 0, tzinfo=timezone.utc)
PHOTO = base64.b64encode(b"\xff\xd8\xffana").decode()
PHOTO_BYTES = b"\xff\xd8\xffana"


class Devices:
    def __init__(self) -> None:
        self.rows = []
        self.seq = 1

    def add(self, row):
        if getattr(row, "id", None) is None:
            row.id = self.seq
            self.seq += 1
        self.rows.append(row)
        return row

    def device_by_public_id(self, public_id: str):
        for row in self.rows:
            if isinstance(row, ClockDevice) and row.public_id == public_id:
                return row
        return None

    def code_exists(self, code_hash: str) -> bool:
        return any(isinstance(row, ClockReleaseCode) and row.code_hash == code_hash for row in self.rows)

    def abandon(self) -> None:
        return None

    def unused_codes(self, code_hash: str, now: datetime):
        return [
            row
            for row in self.rows
            if isinstance(row, ClockReleaseCode)
            and row.code_hash == code_hash
            and row.used_at is None
            and row.expires_at > now
        ]

    def active_grants_for_device(self, device_id: int):
        return [
            row
            for row in self.rows
            if isinstance(row, ClockDeviceGrant) and row.device_id == device_id and row.revoked_at is None
        ]

    def active_grant(self, device_id: int, tenant_id: int):
        found = [row for row in self.active_grants_for_device(device_id) if row.tenant_id == tenant_id]
        return found[0] if found else None

    def list_active_grants(self, tenant_id: int, page: int, limit: int, public_id: str | None):
        rows = []
        for grant in self.rows:
            if not isinstance(grant, ClockDeviceGrant) or grant.tenant_id != tenant_id or grant.revoked_at is not None:
                continue
            device = next(item for item in self.rows if isinstance(item, ClockDevice) and item.id == grant.device_id)
            if public_id and device.public_id != public_id:
                continue
            rows.append((grant, device))
        rows.sort(key=lambda item: item[0].id, reverse=True)
        start = (page - 1) * limit
        return rows[start : start + limit], len(rows)

    def get_active_grant(self, tenant_id: int, grant_id: int):
        for grant, device in self.list_active_grants(tenant_id, 1, 100, None)[0]:
            if grant.id == grant_id:
                return grant, device
        return None

    def recent_failures(self, public_id: str, since: datetime) -> int:
        return sum(
            1
            for row in self.rows
            if isinstance(row, ClockEnrollAttempt) and row.public_id == public_id and row.failed_at >= since
        )


class Companies:
    def __init__(self) -> None:
        self.faces = {}
        self.qrs = {}
        self.flags = {}
        self.embeddings = {}
        self.blocked = set()
        self.commits = []

    def assert_usable(self, scope: Scope) -> None:
        if scope.tenant_id in self.blocked:
            raise AppError(403, "O uso está bloqueado por inadimplência.")

    def device_method_flags(self, tenant_id: int) -> dict:
        return self.flags.get(tenant_id, {"face": False, "qr": False})

    def device_embeddings(self, tenant_id: int):
        return self.embeddings.get(tenant_id, [])

    def device_face_candidate(self, tenant_id: int, image: bytes):
        return self.faces.get((tenant_id, image))

    def device_qr_candidates(self, tenant_id: int, content: str):
        return list(self.qrs.get((tenant_id, content), []))

    def commit_device_face(self, tenant_id: int, employee_id: int, data: dict, image: bytes):
        self.commits.append(("face", tenant_id, employee_id))
        return {"id": len(self.commits), "employee_id": employee_id, "source": "face", "occurred_at": data["occurred_at"], "request_id": None, "note": None, "valid": True, "voided_at": None, "channel": data.get("channel"), "created_at": NOW}

    def commit_device_qr(self, tenant_id: int, employee_id: int, data: dict, qr_image: bytes, selfie_image: bytes):
        self.commits.append(("qr", tenant_id, employee_id))
        return {"id": len(self.commits), "employee_id": employee_id, "source": "qr", "occurred_at": data["occurred_at"], "request_id": None, "note": None, "valid": True, "voided_at": None, "channel": None, "created_at": NOW}


def build():
    companies = Companies()
    service = ClockDeviceService(Devices(), companies, clock=lambda: NOW)
    return service, companies


def admin(tenant_id: int = 4) -> Scope:
    return Scope(person_id=7, tenant_id=tenant_id, role="admin")


def pair(service: ClockDeviceService, tenant_id: int, public_id: str = "recept-01") -> dict:
    issued = service.issue_code(admin(tenant_id))
    return service.enroll(public_id, issued["code"])


def test_codigo_libera_uma_vez_e_guarda_so_o_hash():
    service, _companies = build()
    issued = service.issue_code(admin())
    digits = issued["code"].replace(" ", "")
    assert issued["code"].count(" ") == 2
    assert len(digits) == 9
    assert all(character in CODE_ALPHABET for character in digits)
    enrolled = service.enroll("recept-01", issued["code"])
    device = service.repo.device_by_public_id("recept-01")
    grant = service.repo.active_grant(device.id, 4)
    assert grant.token_hash == hash_secret(enrolled["key"])
    assert all(getattr(row, "code", None) != digits for row in service.repo.rows)
    with pytest.raises(AppError) as again:
        service.enroll("recept-01", digits)
    assert again.value.message == "O código não foi aceito."


def test_codigo_nao_repete_entre_organizacoes():
    service, _companies = build()
    service._new_code = lambda: "ABCDEFGHJ"
    first = service.issue_code(admin(4))
    pending = iter(["ABCDEFGHJ", "23456789A"])
    service._new_code = lambda: next(pending)
    second = service.issue_code(admin(9))
    assert first["code"].replace(" ", "") == "ABCDEFGHJ"
    assert second["code"].replace(" ", "") == "23456789A"
    enrolled = service.enroll("recept-01", "abc def ghj")
    assert enrolled["tenant_id"] == 4


def test_gravacao_repetida_gera_outro_codigo():
    service, _companies = build()
    pending = iter(["ABCDEFGHJ", "23456789A"])
    service._new_code = lambda: next(pending)
    original = service.repo.add

    def add(row):
        if isinstance(row, ClockReleaseCode) and row.code_hash == hash_secret("ABCDEFGHJ"):
            raise IntegrityError("dup", {}, Exception("dup"))
        return original(row)

    service.repo.add = add
    issued = service.issue_code(admin())
    assert issued["code"].replace(" ", "") == "23456789A"


def test_codigo_vencido_nao_libera():
    service, _companies = build()
    issued = service.issue_code(admin())
    service.clock = lambda: NOW + timedelta(minutes=11)
    with pytest.raises(AppError) as expired:
        service.enroll("recept-01", issued["code"])
    assert expired.value.message == "O código não foi aceito."


def test_rosto_de_uma_organizacao_registra_e_de_duas_nao():
    service, companies = build()
    wecan = pair(service, 4)
    ast = pair(service, 9)
    companies.faces[(4, PHOTO_BYTES)] = 15
    saved = service.punch_face(
        "recept-01",
        [wecan["key"], ast["key"]],
        {"image": PHOTO, "channel": "online", "occurred_at": NOW, "client_event_id": None},
    )
    assert saved["tenant_id"] == 4
    assert saved["punch"]["employee_id"] == 15
    companies.faces[(9, PHOTO_BYTES)] = 30
    with pytest.raises(AppError) as both:
        service.punch_face(
            "recept-01",
            [wecan["key"], ast["key"]],
            {"image": PHOTO, "channel": "online", "occurred_at": NOW, "client_event_id": None},
        )
    assert both.value.message == "O rosto foi reconhecido em mais de uma organização."
    assert [item for item in companies.commits if item[1] == 9] == []


def test_qr_com_duas_pessoas_nao_registra():
    service, companies = build()
    wecan = pair(service, 4)
    ast = pair(service, 9)
    companies.qrs[(4, "1|111|A")] = [3]
    companies.qrs[(9, "1|111|A")] = [8]
    with pytest.raises(AppError) as both:
        service.punch_qr(
            "recept-01",
            [wecan["key"], ast["key"]],
            {"content": "1|111|A", "qr_image": PHOTO, "selfie_image": PHOTO, "occurred_at": NOW},
        )
    assert both.value.message == "O QR Code não foi aceito."
    assert companies.commits == []
    companies.qrs[(9, "1|111|A")] = []
    saved = service.punch_qr(
        "recept-01",
        [wecan["key"], ast["key"]],
        {"content": "1|111|A", "qr_image": PHOTO, "selfie_image": PHOTO, "occurred_at": NOW},
    )
    assert saved["tenant_id"] == 4
    assert saved["punch"]["source"] == "qr"


def test_revogar_derruba_so_a_chave_da_organizacao():
    service, companies = build()
    wecan = pair(service, 4)
    ast = pair(service, 9)
    companies.flags[9] = {"face": True, "qr": False}
    listed, total = service.list_devices(admin(4), 1, 10, "recept-01")
    assert total == 1
    service.revoke(admin(4), listed[0]["id"])
    with pytest.raises(AppError) as gone:
        service.methods("recept-01", [wecan["key"]])
    assert gone.value.message == "Aparelho não liberado."
    methods = service.methods("recept-01", [ast["key"]])
    assert methods["tenant_ids"] == [9]
    assert methods["face"] is True
    assert methods["qr"] is False
    assert service.list_devices(admin(4), 1, 10, None)[1] == 0


def test_muitas_tentativas_travam_o_aparelho():
    service, _companies = build()
    issued = service.issue_code(admin())
    for _ in range(5):
        with pytest.raises(AppError) as wrong:
            service.enroll("recept-01", "000000")
        assert wrong.value.message == "O código não foi aceito."
    with pytest.raises(AppError) as locked:
        service.enroll("recept-01", issued["code"])
    assert locked.value.message == "Tente de novo em alguns minutos."
