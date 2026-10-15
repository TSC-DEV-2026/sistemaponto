import 'package:flutter_test/flutter_test.dart';
import 'package:sistemaponto/core/utils/digits.dart';

void main() {
  test('mantém só dígitos do CPF', () {
    expect(onlyDigits('123.456.789-00'), '12345678900');
  });

  test('mascara o CPF enquanto digita e ignora o que passa de 11', () {
    expect(formatCpf('123'), '123');
    expect(formatCpf('1234'), '123.4');
    expect(formatCpf('12345678900'), '123.456.789-00');
    expect(formatCpf('12345678900123'), '123.456.789-00');
    expect(formatCpf('abc123.456'), '123.456');
  });
}
