import 'package:flutter_test/flutter_test.dart';
import 'package:sistemaponto_relogio/features/device/data/face_decision.dart';

void main() {
  test('uma empresa segue e as outras bloqueiam', () {
    expect(offlineFaceBlock(1), isNull);
    expect(offlineFaceBlock(0), 'O rosto não foi reconhecido.');
    expect(offlineFaceBlock(2), 'O rosto foi reconhecido em mais de uma empresa.');
  });
}
