String onlyDigits(String value) => value.replaceAll(RegExp(r'\D'), '');

class CpfEdit {
  const CpfEdit({required this.text, required this.caret});

  final String text;
  final int caret;
}

int offsetAfterDigits(String masked, int digitCount) {
  if (digitCount <= 0) return 0;
  var seen = 0;
  for (var index = 0; index < masked.length; index++) {
    final char = masked[index];
    if (char.compareTo('0') >= 0 && char.compareTo('9') <= 0) {
      seen++;
      if (seen == digitCount) return index + 1;
    }
  }
  return masked.length;
}

CpfEdit maskCpfEdit(String previous, String raw, int cursor) {
  final safeCursor = cursor < 0 ? 0 : (cursor > raw.length ? raw.length : cursor);
  var digits = onlyDigits(raw);
  if (digits.length > 11) digits = digits.substring(0, 11);
  var digitsBefore = onlyDigits(raw.substring(0, safeCursor)).length;
  if (digitsBefore > 11) digitsBefore = 11;

  if (onlyDigits(raw) == onlyDigits(previous) && raw.length < previous.length && previous.isNotEmpty) {
    final removedAt = safeCursor >= previous.length ? previous.length - 1 : safeCursor;
    final removed = previous[removedAt];
    final isDigit = removed.compareTo('0') >= 0 && removed.compareTo('9') <= 0;
    if (!isDigit) {
      final before = onlyDigits(previous.substring(0, removedAt)).length;
      if (before > 0) {
        final all = onlyDigits(previous);
        digits = all.substring(0, before - 1) + all.substring(before);
        if (digits.length > 11) digits = digits.substring(0, 11);
        digitsBefore = before - 1;
      }
    }
  }

  final text = formatCpf(digits);
  final caret = offsetAfterDigits(text, digitsBefore);
  return CpfEdit(text: text, caret: caret > text.length ? text.length : caret);
}

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
