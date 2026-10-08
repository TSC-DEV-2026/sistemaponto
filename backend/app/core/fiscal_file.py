from datetime import date, datetime

from app.core.cpf import normalize_cpf
from app.core.exceptions import AppError
from app.core.workforce import BR, assert_aware


def render_afd(rows: list[tuple[str, datetime]]) -> str:
    lines = ["AFD"]
    for cpf, moment in rows:
        lines.append(f"{cpf}|{_local(moment)}")
    return "\n".join(lines) + "\n"


def parse_afd(content: str) -> list[tuple[str, datetime]]:
    if len(content) > 500_000:
        raise AppError(400, "Arquivo longo demais")
    rows = [line.strip() for line in content.splitlines() if line.strip()]
    if not rows or rows[0] != "AFD":
        raise AppError(400, "Arquivo AFD inválido")
    parsed: list[tuple[str, datetime]] = []
    for line in rows[1:]:
        cpf, separator, moment = line.partition("|")
        if separator == "" or cpf == "" or moment == "" or "|" in moment:
            raise AppError(400, "Arquivo AFD inválido")
        try:
            parsed_moment = datetime.fromisoformat(moment)
        except ValueError:
            raise AppError(400, "Arquivo AFD inválido") from None
        parsed.append((normalize_cpf(cpf), assert_aware(parsed_moment)))
    return parsed


def render_aej(rows: list[tuple[str, date, int, int, int, int, list[datetime]]]) -> str:
    lines = ["AEJ"]
    for cpf, day, worked, overtime, night, shortage, moments in rows:
        punches = ",".join(_local(moment) for moment in moments)
        lines.append(f"{cpf}|{day.isoformat()}|{worked}|{overtime}|{night}|{shortage}|{punches}")
    return "\n".join(lines) + "\n"


def render_payroll(rows: list[tuple[str, int, int, int, int, int]]) -> str:
    lines = ["PAYROLL"]
    for cpf, worked, overtime, night, shortage, balance in rows:
        lines.append(f"{cpf}|{worked}|{overtime}|{night}|{shortage}|{balance}")
    return "\n".join(lines) + "\n"


def _local(moment: datetime) -> str:
    return moment.astimezone(BR).isoformat(timespec="seconds")
