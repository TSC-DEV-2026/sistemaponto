from datetime import date

from app.core.hour_bank import balance_minutes_by_day, project_balance


def test_lancamento_de_saldo_substitui_o_saldo_anterior():
    day = date(2026, 10, 31)
    positive = project_balance(
        [
            (date(2026, 10, 1), 0, "debit", 20 * 60),
            (day, 1, "balance", 50 * 60),
        ],
        day,
    )
    assert positive["balance_minutes"] == 50 * 60
    negative = project_balance([(day, 1, "balance", -50 * 60)], day)
    assert negative["balance_minutes"] == -50 * 60
    assert project_balance([(day, 1, "balance", 0)], day)["balance_minutes"] == 0


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
