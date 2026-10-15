String onlyDigits(String value) => value.replaceAll(RegExp(r'\D'), '');

String formatCpf(String value) {
  final digits = onlyDigits(value);
  final cut = digits.length > 11 ? digits.substring(0, 11) : digits;
  final buffer = StringBuffer();
  for (var i = 0; i < cut.length; i++) {
    if (i == 3 || i == 6) {
      buffer.write('.');
    }
    if (i == 9) {
      buffer.write('-');
    }
    buffer.write(cut[i]);
  }
  return buffer.toString();
}
