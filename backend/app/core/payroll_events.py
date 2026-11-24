"""Catálogo de eventos da folha e formatação de valores para exportação."""

from typing import Literal

PAYROLL_SYSTEM_EVENTS = (
    "worked",
    "overtime",
    "night_additional",
    "shortage",
    "hour_bank_balance",
    "absence_days",
    "allowance_days",
    "vacation_days",
    "leave_days",
    "certificate_days",
)

PAYROLL_EVENT_LABELS = {
    "worked": "Horas trabalhadas",
    "overtime": "Horas extras",
    "night_additional": "Adicional noturno",
    "shortage": "Horas faltantes",
    "hour_bank_balance": "Saldo do banco de horas",
    "absence_days": "Dias de falta",
    "allowance_days": "Dias em abono",
    "vacation_days": "Dias de férias",
    "leave_days": "Dias de afastamento",
    "certificate_days": "Dias de atestado",
}

PAYROLL_HOUR_EVENTS = {
    "worked",
    "overtime",
    "night_additional",
    "shortage",
    "hour_bank_balance",
}

PAYROLL_DAY_EVENTS = {
    "absence_days",
    "allowance_days",
    "vacation_days",
    "leave_days",
    "certificate_days",
}

TimeFormat = Literal["centesimal", "sexagesimal"]


def format_minutes(minutes: int, time_format: TimeFormat) -> str:
    sign = "-" if minutes < 0 else ""
    total = abs(int(minutes))
    hours = total // 60
    rest = total % 60
    if time_format == "sexagesimal":
        return f"{sign}{hours}.{rest:02d}"
    return f"{sign}{hours + (rest / 60):.2f}"


def format_days(days: int) -> str:
    return f"{int(days)}.00"


def event_value(system_event: str, totals: dict, time_format: TimeFormat) -> str | None:
    if system_event in PAYROLL_HOUR_EVENTS:
        key = {
            "worked": "worked_minutes",
            "overtime": "overtime_minutes",
            "night_additional": "night_additional_minutes",
            "shortage": "shortage_minutes",
            "hour_bank_balance": "balance_minutes",
        }[system_event]
        minutes = int(totals.get(key) or 0)
        if minutes == 0:
            return None
        return format_minutes(minutes, time_format)
    if system_event in PAYROLL_DAY_EVENTS:
        key = system_event
        days = int(totals.get(key) or 0)
        if days == 0:
            return None
        return format_days(days)
    return None
