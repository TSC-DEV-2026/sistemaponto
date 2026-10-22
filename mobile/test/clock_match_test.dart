import 'package:flutter_test/flutter_test.dart';
import 'package:sistemaponto/face/blink_challenge.dart';
import 'package:sistemaponto/face/cosine_match.dart';

void main() {
  test('piscar os dois olhos passa e olho aberto parado não passa', () {
    final challenge = BlinkChallenge(
      forwardHold: const Duration(milliseconds: 100),
      blinkTimeout: const Duration(seconds: 2),
      reopenTimeout: const Duration(seconds: 2),
    );
    final start = DateTime(2026, 10, 22, 12);
    challenge.update(hasFace: true, leftOpen: 0.9, rightOpen: 0.9, now: start);
    final waiting = challenge.update(
      hasFace: true,
      leftOpen: 0.9,
      rightOpen: 0.9,
      now: start.add(const Duration(milliseconds: 150)),
    );
    expect(waiting.phase, BlinkPhase.blink);
    challenge.update(hasFace: true, leftOpen: 0.1, rightOpen: 0.1, now: start.add(const Duration(milliseconds: 200)));
    final passed = challenge.update(
      hasFace: true,
      leftOpen: 0.9,
      rightOpen: 0.9,
      now: start.add(const Duration(milliseconds: 250)),
    );
    expect(passed.phase, BlinkPhase.passed);
  });

  test('cosseno aceita o funcionário da sessão e recusa outro rosto', () {
    final ana = List<double>.filled(512, 0);
    ana[0] = 1;
    final other = List<double>.filled(512, 0);
    other[1] = 1;
    final registry = [FaceSample(employeeId: 7, embedding: ana)];
    expect(matchEmployee(query: ana, registry: registry, threshold: 0.40), 7);
    expect(matchEmployee(query: other, registry: registry, threshold: 0.40), isNull);
    expect(matchEmployee(query: ana, registry: const [], threshold: 0.40), isNull);
  });

  test('margem recusa dois rostos parecidos', () {
    final ana = List<double>.filled(512, 0);
    ana[0] = 1;
    final close = List<double>.filled(512, 0);
    close[0] = 0.99;
    close[1] = 0.14106735979665894;
    expect(
      matchEmployee(
        query: ana,
        registry: [
          FaceSample(employeeId: 7, embedding: ana),
          FaceSample(employeeId: 8, embedding: close),
        ],
        threshold: 0.40,
      ),
      isNull,
    );
  });
}
