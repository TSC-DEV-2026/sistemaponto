import calendar
from datetime import date

BANK_MONTHS = 6


def add_months(day: date, months: int) -> date:
    month_index = day.month - 1 + months
    year = day.year + month_index // 12
    month = month_index % 12 + 1
    last = calendar.monthrange(year, month)[1]
    return date(year, month, min(day.day, last))


def project_balance(events: list[tuple[date, int, str, int]], today: date) -> dict:
    lots: list[list] = []
    debt = 0
    credit_minutes = 0
    debit_minutes = 0
    paid_overtime_minutes = 0
    discounted_absence_minutes = 0

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
