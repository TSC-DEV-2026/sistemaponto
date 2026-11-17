import calendar
from datetime import date

BANK_MONTHS = 6


def add_months(day: date, months: int) -> date:
    month_index = day.month - 1 + months
    year = day.year + month_index // 12
    month = month_index % 12 + 1
    last = calendar.monthrange(year, month)[1]
    return date(year, month, min(day.day, last))


def _fold(events: list[tuple[date, int, str, int]]) -> tuple[list[list], int, int, int, int, int, list[tuple[date, int]]]:
    lots: list[list] = []
    debt = 0
    credit_minutes = 0
    debit_minutes = 0
    paid_overtime_minutes = 0
    discounted_absence_minutes = 0
    steps: list[tuple[date, int]] = []

    def consume(minutes: int) -> None:
        nonlocal debt
        left = minutes
        while left and lots:
            take = min(lots[0][1], left)
            lots[0][1] -= take
            left -= take
            if lots[0][1] == 0:
                lots.pop(0)
        debt += left

    for event_day, _order, kind, minutes in sorted(events, key=lambda item: (item[0], item[1])):
        if kind == "credit":
            credit_minutes += minutes
            if debt:
                take = min(debt, minutes)
                debt -= take
                minutes -= take
            if minutes:
                lots.append([event_day, minutes])
        elif kind == "debit":
            debit_minutes += minutes
            consume(minutes)
        elif kind == "overtime":
            paid_overtime_minutes += minutes
            consume(minutes)
        elif kind == "absence":
            discounted_absence_minutes += minutes
            debt = max(0, debt - minutes)
        elif kind == "balance":
            lots.clear()
            debt = 0
            if minutes > 0:
                lots.append([event_day, minutes])
            elif minutes < 0:
                debt = -minutes
        steps.append((event_day, sum(item[1] for item in lots) - debt))
    return lots, debt, credit_minutes, debit_minutes, paid_overtime_minutes, discounted_absence_minutes, steps


def project_balance(events: list[tuple[date, int, str, int]], today: date) -> dict:
    lots, debt, credit_minutes, debit_minutes, paid_overtime_minutes, discounted_absence_minutes, _steps = _fold(events)
    warning = None
    if lots:
        days_left = (add_months(lots[0][0], BANK_MONTHS) - today).days
        if days_left < 0:
            days_left = 0
        warning = f"Saldo irá expirar em {days_left} dias"
    return {
        "balance_minutes": sum(item[1] for item in lots) - debt,
        "credit_minutes": credit_minutes,
        "debit_minutes": debit_minutes,
        "paid_overtime_minutes": paid_overtime_minutes,
        "discounted_absence_minutes": discounted_absence_minutes,
        "warning": warning,
    }


def balance_minutes_by_day(events: list[tuple[date, int, str, int]], days: list[date]) -> dict[date, int]:
    _lots, _debt, _credit, _debit, _paid, _discounted, steps = _fold(events)
    found: dict[date, int] = {}
    cursor = 0
    balance = 0
    for day in sorted(set(days)):
        while cursor < len(steps) and steps[cursor][0] <= day:
            balance = steps[cursor][1]
            cursor += 1
        found[day] = balance
    return {day: found[day] for day in days}
