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

  test('apagar um dígito no meio deixa o cursor nesse ponto', () {
    final edit = maskCpfEdit('123.456.789-00', '123.46.789-00', 5);
    expect(edit.text, '123.467.890-0');
    expect(edit.caret, 5);
  });

  test('apagar o ponto remove o dígito anterior e não manda o cursor para o fim', () {
    final edit = maskCpfEdit('123.456', '123456', 3);
    expect(edit.text, '124.56');
    expect(edit.caret, 2);
  });
}
