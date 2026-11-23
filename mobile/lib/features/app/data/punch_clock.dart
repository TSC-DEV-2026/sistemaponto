class SpanClock {
  const SpanClock(this.startsAt, this.endsAt);

  final String startsAt;
  final String endsAt;
}

class DayClock {
  const DayClock({required this.off, required this.spans});

  final bool off;
  final List<SpanClock> spans;
}

class PunchReminder {
  const PunchReminder(this.at, this.clock);

  final DateTime at;
  final String clock;
}

const punchLead = Duration(minutes: 2);
const punchHorizon = 7;

int cyclePosition(DateTime day, DateTime anchor, int startDay, int length) {
  if (length < 1) {
    return 1;
  }
  final from = DateTime(anchor.year, anchor.month, anchor.day);
  final current = DateTime(day.year, day.month, day.day);
  return (startDay - 1 + current.difference(from).inDays) % length + 1;
}

List<PunchReminder> punchReminders({
  required String kind,
  required List<DayClock> days,
  required DateTime anchor,
  required int cycleDay,
  required DateTime now,
  int horizon = punchHorizon,
  Duration lead = punchLead,
}) {
  if (kind != 'programada' || days.isEmpty) {
    return const [];
  }
  final reminders = <PunchReminder>[];
  final seen = <DateTime>{};
  final start = DateTime(now.year, now.month, now.day);
  for (var offset = 0; offset < horizon; offset++) {
    final day = start.add(Duration(days: offset));
    final position = cyclePosition(day, anchor, cycleDay, days.length);
    final chosen = days[position - 1];
    if (chosen.off || chosen.spans.isEmpty) {
      continue;
    }
    for (final span in chosen.spans) {
      final begin = _clock(day, span.startsAt);
      var finish = _clock(day, span.endsAt);
      if (begin == null || finish == null) {
        continue;
      }
      if (!finish.isAfter(begin)) {
        finish = finish.add(const Duration(days: 1));
      }
      for (final moment in [begin, finish]) {
        final alarm = moment.subtract(lead);
        if (!alarm.isAfter(now) || !seen.add(alarm)) {
          continue;
        }
        reminders.add(PunchReminder(alarm, _label(moment)));
      }
    }
  }
  return reminders;
}

List<DayClock> daysFromJourney(Map<String, dynamic> journey) {
  final raw = journey['days'];
  if (raw is! List) {
    return const [];
  }
  final days = <({int position, DayClock day})>[];
  for (final item in raw) {
    if (item is! Map) {
      continue;
    }
    final spans = <SpanClock>[];
    final rawSpans = item['spans'];
    if (rawSpans is List) {
      for (final span in rawSpans) {
        if (span is! Map) {
          continue;
        }
        final start = span['starts_at'];
        final end = span['ends_at'];
        if (start is String && end is String) {
          spans.add(SpanClock(start, end));
        }
      }
    }
    final position = item['position'];
    days.add((
      position: position is int ? position : days.length + 1,
      day: DayClock(off: item['off'] == true, spans: spans),
    ));
  }
  days.sort((a, b) => a.position.compareTo(b.position));
  return [for (final item in days) item.day];
}

DateTime? _clock(DateTime day, String value) {
  final parts = value.split(':');
  if (parts.length < 2) {
    return null;
  }
  final hour = int.tryParse(parts[0]);
  final minute = int.tryParse(parts[1]);
  if (hour == null || minute == null) {
    return null;
  }
  return DateTime(day.year, day.month, day.day, hour, minute);
}

String _label(DateTime moment) {
  final hour = moment.hour.toString().padLeft(2, '0');
  final minute = moment.minute.toString().padLeft(2, '0');
  return '$hour:$minute';
}
