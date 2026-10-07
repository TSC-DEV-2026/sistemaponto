from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.core.exceptions import AppError

BR = ZoneInfo("America/Sao_Paulo")

VIGENCY_KINDS = (
    "job",
    "journey",
    "cost_center",
    "unit",
    "sector",
    "team",
    "union",
    "manager",
    "status",
)
STATUS_LABELS = ("active", "dismissed")
REQUEST_KINDS = ("adjustment", "allowance", "certificate")
DECISIONS = ("approved", "rejected", "cancelled")
OCCURRENCE_KINDS = (
    "adjustment",
    "punch_entry",
    "absence",
    "certificate",
    "vacation",
    "allowance",
    "leave",
)
REASON_KINDS = ("adjustment", "absence", "allowance", "certificate")
PUNCH_SOURCES = ("employee", "admin", "approved_request")

REASON_FOR_REQUEST = {
    "adjustment": "adjustment",
    "allowance": "allowance",
    "certificate": "certificate",
}
OCCURRENCE_FOR_REQUEST = {
    "adjustment": "adjustment",
    "allowance": "allowance",
    "certificate": "certificate",
}
AUDIT_ACTION = {
    "job": "Alteração de cargo",
    "journey": "Alteração de jornada",
    "cost_center": "Alteração de centro de custo",
    "unit": "Alteração de unidade",
    "sector": "Alteração de setor",
    "team": "Alteração de equipe",
    "union": "Alteração de sindicato",
    "manager": "Alteração de gestor",
    "status": "Alteração de situação",
}


def today_in_brazil() -> date:
    return datetime.now(BR).date()


def now_utc() -> datetime:
    return datetime.now(BR).astimezone(ZoneInfo("UTC"))


def month_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    start = datetime(year, month, 1, tzinfo=BR)
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=BR)
    else:
        end = datetime(year, month + 1, 1, tzinfo=BR)
    return start, end


def day_bounds(day: date) -> tuple[datetime, datetime]:
    start = datetime(day.year, day.month, day.day, tzinfo=BR)
    return start, start + timedelta(days=1)


def previous_end(current_start: date, new_start: date) -> date:
    if new_start <= current_start:
        raise AppError(409, "A nova vigência precisa começar depois da atual")
    return new_start - timedelta(days=1)


def assert_clock(value: str | None) -> str | None:
    if value is None or not str(value).strip():
        return None
    text = str(value).strip()
    parts = text.split(":")
    if len(parts) != 2 or len(parts[0]) != 2 or len(parts[1]) != 2:
        raise AppError(400, "Horário inválido")
    if not parts[0].isdigit() or not parts[1].isdigit():
        raise AppError(400, "Horário inválido")
    hour = int(parts[0])
    minute = int(parts[1])
    if hour > 23 or minute > 59:
        raise AppError(400, "Horário inválido")
    return text


def assert_period(start: date, end: date | None) -> date:
    finish = end or start
    if finish < start:
        raise AppError(400, "O fim precisa ser igual ou posterior ao início")
    return finish


def assert_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        raise AppError(400, "Informe o horário com fuso")
    return value.astimezone(ZoneInfo("UTC"))


def assert_not_future(value: datetime, today: date) -> None:
    local_day = value.astimezone(BR).date()
    if local_day > today:
        raise AppError(400, "A marcação não pode ser futura")
