from datetime import date, datetime, time, timedelta

from app.core.workforce import BR

TOLERANCE_MINUTES = 10
MINIMUM_BREAK_MINUTES = 60
NIGHT_START = time(22, 0)
NIGHT_END = time(5, 0)
NIGHT_PERCENT = 20
INTERVAL_WARNING = "intervalo menor do que o previsto"


def _minutes(start: datetime, end: datetime) -> int:
    if end <= start:
        return 0
    return int((end - start).total_seconds() // 60)


def _clock(day: date, value: str | None) -> datetime | None:
    if value is None or not str(value).strip():
        return None
    hour, minute = (int(part) for part in str(value).split(":"))
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=BR)


def night_minutes(start: datetime, end: datetime) -> int:
    start = start.astimezone(BR)
    end = end.astimezone(BR)
    total = 0
    current = start.date() - timedelta(days=1)
    while current <= end.date():
        window_start = datetime.combine(current, NIGHT_START, tzinfo=BR)
        window_end = datetime.combine(current + timedelta(days=1), NIGHT_END, tzinfo=BR)
        begin = start if start > window_start else window_start
        finish = end if end < window_end else window_end
        total += _minutes(begin, finish)
        current += timedelta(days=1)
    return total


def schedule_for(journey, day: date) -> dict:
    if journey is None:
        return {"start": None, "end": None, "expected": 0, "break_minutes": 0}
    morning_start = _clock(day, journey.morning_start)
    morning_end = _clock(day, journey.morning_end)
    afternoon_start = _clock(day, journey.afternoon_start)
    afternoon_end = _clock(day, journey.afternoon_end)
    expected = _minutes(morning_start, morning_end) if morning_start and morning_end else 0
    expected += _minutes(afternoon_start, afternoon_end) if afternoon_start and afternoon_end else 0
    break_minutes = 0
    if morning_end is not None and afternoon_start is not None:
        scheduled = _minutes(morning_end, afternoon_start)
        if scheduled:
            break_minutes = max(scheduled, MINIMUM_BREAK_MINUTES)
    return {
        "start": morning_start or afternoon_start,
        "end": afternoon_end or morning_end,
        "expected": expected,
        "break_minutes": break_minutes,
    }


def _pairs(moments: list[datetime]) -> tuple[int, int, int | None]:
    worked = 0
    night = 0
    for index in range(0, len(moments) - 1, 2):
        start = moments[index]
        end = moments[index + 1]
        worked += _minutes(start, end)
        night += night_minutes(start, end)
    if len(moments) >= 3:
        return worked, night, _minutes(moments[1], moments[2])
    if len(moments) == 2:
        return worked, night, 0
    return worked, night, None


def settle_day(
    *,
    work_date: date,
    moments: list[datetime],
    counted: int,
    journey,
    holiday: bool,
    vacation: bool,
    leave: bool,
    full_allowance: bool,
    full_certificate: bool,
    extra_warnings: list[str],
) -> dict:
    workday = work_date.weekday() < 5
    schedule = schedule_for(journey, work_date) if workday else {"start": None, "end": None, "expected": 0, "break_minutes": 0}
    worked, night, actual_break = _pairs(moments)
    excused = holiday or vacation or leave or full_allowance or full_certificate
    absence = workday and counted == 0 and not excused
    incomplete = workday and counted % 2 == 1 and not excused
    expected = 0
    delay = 0
    early = 0
    overtime = 0
    if holiday:
        overtime = worked
    elif not workday or vacation or leave:
        expected = 0
    elif full_allowance or full_certificate:
        expected = schedule["expected"]
    else:
        expected = schedule["expected"]
        if schedule["start"] is not None and moments:
            late = _minutes(schedule["start"], moments[0])
            if 0 < late <= TOLERANCE_MINUTES:
                worked += late
            elif late > TOLERANCE_MINUTES:
                delay = late
        if schedule["end"] is not None and len(moments) >= 2 and len(moments) % 2 == 0:
            early = _minutes(moments[-1], schedule["end"])
        overtime = max(0, worked - expected)
    warnings: list[str] = []
    if (
        workday
        and not holiday
        and not vacation
        and not leave
        and schedule["break_minutes"]
        and actual_break is not None
        and actual_break < schedule["break_minutes"]
    ):
        warnings.append(INTERVAL_WARNING)
    for text in extra_warnings:
        if text not in warnings:
            warnings.append(text)
    return {
        "work_date": work_date,
        "expected_minutes": expected,
        "worked_minutes": worked,
        "delay_minutes": delay,
        "early_leave_minutes": early,
        "overtime_minutes": overtime,
        "night_minutes": night,
        "night_additional_minutes": night * NIGHT_PERCENT // 100,
        "absence": absence,
        "incomplete": incomplete,
        "holiday": holiday,
        "warnings": warnings,
    }
