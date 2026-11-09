from dataclasses import dataclass
from datetime import date, datetime, timedelta

from app.core.exceptions import AppError
from app.core.workforce import BR, assert_clock

ORIGIN = date(1900, 1, 1)
WEEK = 7


@dataclass
class SpanSpec:
    starts_at: str
    ends_at: str


@dataclass
class DaySpec:
    position: int
    off: bool
    spans: list[SpanSpec]


@dataclass
class JourneySpec:
    kind: str
    flexible: bool
    tolerance_minutes: int
    weekly_minutes: int | None
    days: list[DaySpec]
    valid_from: date

    @property
    def length(self) -> int:
        return len(self.days)


def nearest_minute(value: float) -> int:
    if value >= 0:
        return int(value + 0.5)
    return int(value - 0.5)


def minutes_of(clock: str) -> int:
    hour, minute = (int(part) for part in clock.split(":"))
    return hour * 60 + minute


def span_minutes(start: str, end: str) -> int:
    begin = minutes_of(start)
    finish = minutes_of(end)
    if finish <= begin:
        finish += 24 * 60
    return finish - begin


def cycle_position(day: date, anchor: date, start_day: int, length: int) -> int:
    if length < 1:
        return 1
    return (start_day - 1 + (day - anchor).days) % length + 1


def week_monday(day: date) -> date:
    return day - timedelta(days=day.weekday())


def legacy_days(morning_start: str | None, morning_end: str | None, afternoon_start: str | None, afternoon_end: str | None) -> list[DaySpec]:
    days: list[DaySpec] = []
    for position in range(1, WEEK + 1):
        spans: list[SpanSpec] = []
        if position < 6:
            if morning_start and morning_end:
                spans.append(SpanSpec(morning_start, morning_end))
            if afternoon_start and afternoon_end:
                spans.append(SpanSpec(afternoon_start, afternoon_end))
        days.append(DaySpec(position=position, off=position >= 6, spans=spans))
    return days


def legacy_spec(morning_start, morning_end, afternoon_start, afternoon_end, valid_from: date = ORIGIN) -> JourneySpec:
    return JourneySpec(
        kind="programada",
        flexible=False,
        tolerance_minutes=10,
        weekly_minutes=None,
        days=legacy_days(morning_start, morning_end, afternoon_start, afternoon_end),
        valid_from=valid_from,
    )


def parse_duration(value: str) -> int:
    text = str(value).strip()
    parts = text.split(":")
    if len(parts) != 2 or not parts[0].isdigit() or not parts[1].isdigit() or len(parts[1]) != 2:
        raise AppError(400, "Carga inválida")
    hours = int(parts[0])
    minutes = int(parts[1])
    if hours > 168 or minutes > 59:
        raise AppError(400, "Carga inválida")
    total = hours * 60 + minutes
    if total <= 0:
        raise AppError(400, "Informe a carga da semana")
    return total


def _spans_from(raw) -> list[SpanSpec]:
    spans: list[SpanSpec] = []
    previous_end = -1
    overnight = False
    for item in raw or []:
        if overnight:
            raise AppError(400, "O turno que passa da meia-noite encerra o dia")
        start = assert_clock(item.get("starts_at") if isinstance(item, dict) else getattr(item, "starts_at", None))
        end = assert_clock(item.get("ends_at") if isinstance(item, dict) else getattr(item, "ends_at", None))
        if start is None or end is None:
            raise AppError(400, "Informe a entrada e a saída")
        begin = minutes_of(start)
        finish = minutes_of(end)
        if finish <= begin:
            finish += 24 * 60
            overnight = True
        if begin < previous_end:
            raise AppError(400, "Os horários se sobrepõem")
        previous_end = finish
        spans.append(SpanSpec(start, end))
    return spans


def parse_days(raw_days) -> list[DaySpec]:
    if not raw_days:
        raise AppError(400, "Informe os dias da jornada")
    days: list[DaySpec] = []
    for index, item in enumerate(raw_days, start=1):
        off = bool(item.get("off") if isinstance(item, dict) else getattr(item, "off", False))
        spans = _spans_from(item.get("spans") if isinstance(item, dict) else getattr(item, "spans", []))
        if off and spans:
            raise AppError(400, "Folga não tem horário")
        if not off and not spans:
            raise AppError(400, "Dia de trabalho precisa de entrada e saída")
        days.append(DaySpec(position=index, off=off, spans=spans))
    return days


def same_content(left: JourneySpec, right: JourneySpec) -> bool:
    if (
        left.kind != right.kind
        or left.flexible != right.flexible
        or left.tolerance_minutes != right.tolerance_minutes
        or left.weekly_minutes != right.weekly_minutes
        or len(left.days) != len(right.days)
    ):
        return False
    for day, other in zip(left.days, right.days):
        if day.off != other.off or len(day.spans) != len(other.spans):
            return False
        for span, another in zip(day.spans, other.spans):
            if span.starts_at != another.starts_at or span.ends_at != another.ends_at:
                return False
    return True


def clocks_of(spec: JourneySpec) -> tuple[str | None, str | None, str | None, str | None]:
    for day in spec.days:
        if day.off:
            continue
        morning = day.spans[0] if day.spans else None
        afternoon = day.spans[1] if len(day.spans) > 1 else None
        return (
            None if morning is None else morning.starts_at,
            None if morning is None else morning.ends_at,
            None if afternoon is None else afternoon.starts_at,
            None if afternoon is None else afternoon.ends_at,
        )
    return None, None, None, None


def day_view(spec: JourneySpec) -> list[dict]:
    return [
        {
            "position": day.position,
            "off": day.off,
            "spans": [{"starts_at": span.starts_at, "ends_at": span.ends_at} for span in day.spans],
        }
        for day in spec.days
    ]


def _at(day: date, value: str) -> datetime:
    hour, minute = (int(part) for part in value.split(":"))
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=BR)


def schedule_of(spec: JourneySpec, day: date, anchor: date, start_day: int) -> dict:
    if spec.kind == "livre":
        return {"mode": "livre", "workday": False, "start": None, "end": None, "expected": 0, "break_minutes": 0, "flexible": False, "tolerance": 10}
    if spec.kind == "carga":
        return {"mode": "carga", "workday": False, "start": None, "end": None, "expected": 0, "break_minutes": 0, "flexible": False, "tolerance": 10}
    position = cycle_position(day, anchor, start_day, spec.length)
    chosen = spec.days[position - 1]
    if chosen.off or not chosen.spans:
        return {
            "mode": "programada",
            "workday": not chosen.off and bool(not chosen.spans),
            "start": None,
            "end": None,
            "expected": 0,
            "break_minutes": 0,
            "flexible": spec.flexible,
            "tolerance": spec.tolerance_minutes,
        }
    start = _at(day, chosen.spans[0].starts_at)
    last = chosen.spans[-1]
    end_day = day + timedelta(days=1) if minutes_of(last.ends_at) <= minutes_of(last.starts_at) else day
    end = _at(end_day, last.ends_at)
    expected = sum(span_minutes(span.starts_at, span.ends_at) for span in chosen.spans)
    break_minutes = 0
    if len(chosen.spans) >= 2:
        gap = minutes_of(chosen.spans[1].starts_at) - minutes_of(chosen.spans[0].ends_at)
        if gap > 0:
            break_minutes = max(gap, 60)
    return {
        "mode": "programada",
        "workday": True,
        "start": start,
        "end": end,
        "expected": expected,
        "break_minutes": break_minutes,
        "flexible": spec.flexible,
        "tolerance": spec.tolerance_minutes,
    }
