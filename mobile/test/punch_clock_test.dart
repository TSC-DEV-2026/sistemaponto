import 'package:flutter_test/flutter_test.dart';
import 'package:sistemaponto/features/app/data/punch_clock.dart';

void main() {
  final week = [
    for (var index = 0; index < 7; index++)
      DayClock(
        off: index >= 5,
        spans: index >= 5
            ? const []
            : const [
                SpanClock('08:00', '12:00'),
                SpanClock('13:30', '17:30'),
              ],
      ),
  ];

  test('avisa dois minutos antes de cada ponta da escala', () {
    final reminders = punchReminders(
      kind: 'programada',
      days: week,
      anchor: DateTime(2026, 10, 5),
      cycleDay: 1,
      now: DateTime(2026, 10, 6, 7),
      horizon: 1,
    );
    expect(reminders.map((item) => item.clock).toList(), ['08:00', '12:00', '13:30', '17:30']);
    expect(reminders.map((item) => item.at).toList(), [
      DateTime(2026, 10, 6, 7, 58),
      DateTime(2026, 10, 6, 11, 58),
      DateTime(2026, 10, 6, 13, 28),
      DateTime(2026, 10, 6, 17, 28),
    ]);
  });

  test('pula o horário que já passou e o dia de folga', () {
    final reminders = punchReminders(
      kind: 'programada',
      days: week,
      anchor: DateTime(2026, 10, 5),
      cycleDay: 1,
      now: DateTime(2026, 10, 10, 8),
      horizon: 1,
    );
    expect(reminders, isEmpty);
  });

  test('jornada livre não gera aviso', () {
    final reminders = punchReminders(
      kind: 'livre',
      days: week,
      anchor: DateTime(2026, 10, 5),
      cycleDay: 1,
      now: DateTime(2026, 10, 6, 7),
    );
    expect(reminders, isEmpty);
  });

  test('saída depois da meia-noite avisa no dia seguinte', () {
    final reminders = punchReminders(
      kind: 'programada',
      days: const [
        DayClock(off: false, spans: [SpanClock('22:00', '05:00')]),
      ],
      anchor: DateTime(2026, 10, 6),
      cycleDay: 1,
      now: DateTime(2026, 10, 6, 20),
      horizon: 1,
    );
    expect(reminders.map((item) => item.at).toList(), [
      DateTime(2026, 10, 6, 21, 58),
      DateTime(2026, 10, 7, 4, 58),
    ]);
    expect(reminders.last.clock, '05:00');
  });
}
