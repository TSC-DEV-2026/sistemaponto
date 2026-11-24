"""Leiautes fiscais Portaria MTP 671 (AFD/AEJ) e exportação de totais da folha."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import date, datetime

from app.core.cpf import normalize_cpf
from app.core.exceptions import AppError
from app.core.payroll_events import TimeFormat, event_value
from app.core.workforce import BR, assert_aware

AFD_VERSION = "004"
AEJ_VERSION = "002"
PTRP_NAME = "sistemaponto"
PTRP_VERSION = "1.0.0"
SIGNATURE = "ASSINATURA_DIGITAL_EM_ARQUIVO_P7S"


@dataclass(frozen=True)
class EmployerInfo:
    document: str
    name: str
    id_type: str  # "1" CNPJ / "2" CPF


@dataclass(frozen=True)
class AfdPunch:
    cpf: str
    marked_at: datetime
    stored_at: datetime
    collector: str  # "01".."05"
    offline: bool


@dataclass(frozen=True)
class AejEmployee:
    link_id: int
    cpf: str
    name: str
    registration: str | None
    journey_code: str | None
    journey_minutes: int
    clocks: list[tuple[str, str]]  # (entrada hhmm, saida hhmm)


@dataclass(frozen=True)
class AejPunch:
    link_id: int
    marked_at: datetime
    mark_type: str  # E / S / D
    pair_seq: int
    source: str  # O I P X T
    journey_code: str | None
    reason: str | None


@dataclass(frozen=True)
class AejAbsence:
    link_id: int
    kind: str  # 1 DSR, 2 falta, 3 banco, 4 folga feriado
    day: date
    minutes: int | None
    bank_move: str | None  # 1 inclusão / 2 compensação


def pending(size: int) -> str:
    return "x" * size


def _crlf(lines: list[str]) -> str:
    return "\r\n".join(lines) + "\r\n"


def _dh(moment: datetime) -> str:
    local = moment.astimezone(BR)
    offset = local.strftime("%z")
    return f"{local.strftime('%Y-%m-%dT%H:%M')}:00{offset}"


def _date(value: date) -> str:
    return value.isoformat()


def _pad(value: str, size: int, *, numeric: bool = False) -> str:
    text = str(value or "")
    if len(text) > size:
        text = text[:size]
    if numeric:
        return text.rjust(size, "0")
    return text.ljust(size, " ")


def _digits(value: str | None) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def crc16_kermit(data: bytes) -> str:
    crc = 0x0000
    for byte in data:
        crc ^= byte
        for _ in range(8):
            if crc & 1:
                crc = (crc >> 1) ^ 0x8408
            else:
                crc >>= 1
    return f"{crc & 0xFFFF:04X}".lower()


def employer_from(document: str | None, name: str | None) -> EmployerInfo:
    digits = _digits(document)
    if len(digits) == 11:
        return EmployerInfo(document=_pad(digits, 14), name=(name or pending(150))[:150], id_type="2")
    if len(digits) == 14:
        return EmployerInfo(document=_pad(digits, 14), name=(name or pending(150))[:150], id_type="1")
    return EmployerInfo(document=pending(14), name=(name or pending(150))[:150], id_type="1")


def render_afd(
    *,
    employer: EmployerInfo,
    starts_on: date,
    ends_on: date,
    generated_at: datetime,
    punches: list[AfdPunch],
    maker_document: str | None = None,
) -> str:
    maker = _digits(maker_document)
    if len(maker) == 11:
        maker_type = "2"
        maker_id = _pad(maker, 14)
    elif len(maker) == 14:
        maker_type = "1"
        maker_id = _pad(maker, 14)
    else:
        maker_type = "1"
        maker_id = pending(14)
    header_body = (
        _pad("000000000", 9, numeric=True)
        + "1"
        + employer.id_type
        + _pad(employer.document, 14)
        + pending(14)
        + _pad(employer.name, 150)
        + pending(17)
        + _date(starts_on)
        + _date(ends_on)
        + _dh(generated_at)
        + AFD_VERSION
        + maker_type
        + maker_id
        + pending(30)
    )
    lines = [header_body + crc16_kermit(header_body.encode("latin-1", errors="replace"))]
    previous_hash = ""
    type7 = 0
    for index, punch in enumerate(punches, start=1):
        nsr = _pad(str(index), 9, numeric=True)
        cpf = _pad(_digits(punch.cpf) or pending(12), 12, numeric=True)
        collector = punch.collector if punch.collector in {"01", "02", "03", "04", "05"} else "05"
        online = "1" if punch.offline else "0"
        prefix = (
            nsr
            + "7"
            + _dh(punch.marked_at)
            + cpf
            + _dh(punch.stored_at)
            + collector
            + online
        )
        material = prefix + previous_hash
        digest = hashlib.sha256(material.encode("latin-1", errors="replace")).hexdigest()
        lines.append(prefix + digest)
        previous_hash = digest
        type7 += 1
    trailer = (
        "999999999"
        + _pad("0", 9, numeric=True)
        + _pad("0", 9, numeric=True)
        + _pad("0", 9, numeric=True)
        + _pad("0", 9, numeric=True)
        + _pad("0", 9, numeric=True)
        + _pad(str(type7), 9, numeric=True)
        + "9"
    )
    lines.append(trailer)
    lines.append(_pad(SIGNATURE, 100))
    return _crlf(lines)


def parse_afd(content: str) -> list[tuple[str, datetime]]:
    if len(content) > 500_000:
        raise AppError(400, "Arquivo longo demais")
    rows = [line.rstrip("\r") for line in content.splitlines() if line.strip()]
    if not rows:
        raise AppError(400, "Arquivo AFD inválido")
    first = rows[0]
    # Legado interno (antes da Portaria 671)
    if first == "AFD":
        return _parse_legacy_afd(rows[1:])
    if len(first) < 10 or first[9] != "1":
        raise AppError(400, "Arquivo AFD inválido")
    parsed: list[tuple[str, datetime]] = []
    for line in rows[1:]:
        if len(line) < 10:
            continue
        kind = line[9]
        if kind == "9":
            break
        if kind == "3":
            if len(line) < 46:
                raise AppError(400, "Arquivo AFD inválido")
            moment = _parse_dh(line[10:34])
            cpf = normalize_cpf(line[34:46][-11:])
            parsed.append((cpf, moment))
        elif kind == "7":
            if len(line) < 46:
                raise AppError(400, "Arquivo AFD inválido")
            moment = _parse_dh(line[10:34])
            cpf = normalize_cpf(line[34:46][-11:])
            parsed.append((cpf, moment))
    return parsed


def _parse_legacy_afd(rows: list[str]) -> list[tuple[str, datetime]]:
    parsed: list[tuple[str, datetime]] = []
    for line in rows:
        cpf, separator, moment = line.partition("|")
        if separator == "" or cpf == "" or moment == "" or "|" in moment:
            raise AppError(400, "Arquivo AFD inválido")
        try:
            parsed_moment = datetime.fromisoformat(moment)
        except ValueError:
            raise AppError(400, "Arquivo AFD inválido") from None
        parsed.append((normalize_cpf(cpf), assert_aware(parsed_moment)))
    return parsed


def _parse_dh(value: str) -> datetime:
    text = value.strip()
    try:
        return assert_aware(datetime.fromisoformat(text))
    except ValueError:
        raise AppError(400, "Arquivo AFD inválido") from None


def render_aej(
    *,
    employer: EmployerInfo,
    starts_on: date,
    ends_on: date,
    generated_at: datetime,
    employees: list[AejEmployee],
    punches: list[AejPunch],
    absences: list[AejAbsence],
    developer_document: str | None = None,
    developer_name: str | None = None,
    developer_email: str | None = None,
) -> str:
    lines: list[str] = []
    counts = {f"{n:02d}": 0 for n in range(1, 9)}

    def add(kind: str, fields: list[str]) -> None:
        lines.append("|".join([kind, *fields]))
        counts[kind] += 1

    add(
        "01",
        [
            employer.id_type,
            employer.document.strip() or pending(14),
            pending(14),
            pending(12),
            employer.name.strip() or pending(8),
            _date(starts_on),
            _date(ends_on),
            _dh(generated_at),
            AEJ_VERSION,
        ],
    )
    add("02", ["1", "3", pending(17)])
    journeys: dict[str, AejEmployee] = {}
    for employee in employees:
        add(
            "03",
            [
                str(employee.link_id),
                _pad(_digits(employee.cpf), 11, numeric=True) if _digits(employee.cpf) else pending(11),
                (employee.name or pending(8))[:150],
            ],
        )
        if employee.journey_code and employee.journey_code not in journeys:
            journeys[employee.journey_code] = employee
        if employee.registration:
            add("06", [str(employee.link_id), employee.registration[:30]])
        else:
            add("06", [str(employee.link_id), pending(8)])
    for code, employee in journeys.items():
        clocks = list(employee.clocks)
        while len(clocks) < 1:
            clocks.append((pending(4), pending(4)))
        fields = [code[:30], str(max(employee.journey_minutes, 0))]
        for entry, exit_at in clocks:
            fields.extend([_pad(entry, 4), _pad(exit_at, 4)])
        add("04", fields)
    for punch in punches:
        add(
            "05",
            [
                str(punch.link_id),
                _dh(punch.marked_at),
                "1",
                punch.mark_type,
                str(punch.pair_seq),
                punch.source,
                punch.journey_code or "",
                punch.reason or "",
            ],
        )
    for absence in absences:
        add(
            "07",
            [
                str(absence.link_id),
                absence.kind,
                _date(absence.day),
                "" if absence.minutes is None else str(absence.minutes),
                absence.bank_move or "",
            ],
        )
    maker = _digits(developer_document)
    if len(maker) == 11:
        maker_type = "2"
        maker_id = maker
    elif len(maker) == 14:
        maker_type = "1"
        maker_id = maker
    else:
        maker_type = "1"
        maker_id = pending(14)
    add(
        "08",
        [
            PTRP_NAME,
            PTRP_VERSION,
            maker_type,
            maker_id,
            (developer_name or pending(8))[:150],
            (developer_email or pending(8))[:50],
        ],
    )
    lines.append(
        "|".join(
            [
                "99",
                str(counts["01"]),
                str(counts["02"]),
                str(counts["03"]),
                str(counts["04"]),
                str(counts["05"]),
                str(counts["06"]),
                str(counts["07"]),
                str(counts["08"]),
            ]
        )
    )
    lines.append(_pad(SIGNATURE, 100))
    return _crlf(lines)


def render_payroll(
    rows: list[tuple[str, str, str]],
) -> str:
    """Cada linha: matrícula|código do evento|valor (ponto decimal)."""
    lines = [f"{registration}|{code}|{value}" for registration, code, value in rows]
    return _crlf(lines)


def payroll_lines(
    *,
    items: list[dict],
    events: list[dict],
    time_format: TimeFormat,
) -> list[tuple[str, str, str]]:
    lines: list[tuple[str, str, str]] = []
    for item in items:
        registration = str(item.get("registration_number") or item.get("cpf") or "").strip()
        if not registration:
            registration = pending(8)
        for event in events:
            system_event = str(event["system_event"])
            code = str(event["external_code"]).strip()
            fmt = event.get("time_format") or time_format
            value = event_value(system_event, item, fmt)
            if value is None:
                continue
            lines.append((registration, code, value))
    return lines
