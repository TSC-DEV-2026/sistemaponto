from datetime import date

PRICE_CENTS = 500
MIN_CAPACITY = 10
MAX_CAPACITY = 200


def monthly_amount(capacity: int) -> int:
    return capacity * PRICE_CENTS


def prorate(old_capacity: int, new_capacity: int, period_start: date, period_end: date, today: date) -> int:
    total = (period_end - period_start).days
    left = (period_end - today).days
    if total <= 0 or left <= 0 or new_capacity <= old_capacity:
        return 0
    if left > total:
        left = total
    return (new_capacity - old_capacity) * PRICE_CENTS * left // total
