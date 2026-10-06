from datetime import datetime, timedelta, timezone

TRIAL_DAYS = 7
TRIAL_EMPLOYEE_CAPACITY = 10


def trial_window(now: datetime | None = None) -> tuple[datetime, datetime]:
    started = now or datetime.now(timezone.utc)
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    return started, started + timedelta(days=TRIAL_DAYS)
