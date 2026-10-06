import 'package:flutter_test/flutter_test.dart';
import 'package:sistemaponto/core/utils/digits.dart';

void main() {
  test('mantém só dígitos do CPF', () {
    expect(onlyDigits('123.456.789-00'), '12345678900');
  });
}
