import 'package:flutter/services.dart';

import 'digits.dart';

class CpfInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final cursor = newValue.selection.isValid ? newValue.selection.extentOffset : newValue.text.length;
    final edit = maskCpfEdit(oldValue.text, newValue.text, cursor);
    return TextEditingValue(
      text: edit.text,
      selection: TextSelection.collapsed(offset: edit.caret),
    );
  }
}
