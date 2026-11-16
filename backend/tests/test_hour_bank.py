from datetime import date

from app.core.hour_bank import balance_minutes_by_day, project_balance


def test_saldo_do_dia_segue_a_mesma_projecao():
    events = [
        (date(2026, 10, 1), 1, "credit", 120),
        (date(2026, 10, 1), 2, "debit", 30),
        (date(2026, 10, 3), 3, "overtime", 40),
        (date(2026, 10, 4), 4, "absence", 10),
        (date(2026, 10, 5), 5, "credit", 15),
    ]
    days = [date(2026, 9, 30), date(2026, 10, 1), date(2026, 10, 2), date(2026, 10, 4), date(2026, 10, 6)]
    found = balance_minutes_by_day(events, days)
    for day in days:
        prefix = [event for event in events if event[0] <= day]
        assert found[day] == project_balance(prefix, day)["balance_minutes"]
