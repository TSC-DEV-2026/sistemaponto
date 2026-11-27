String dayStamp(DateTime day) {
  final month = day.month.toString().padLeft(2, '0');
  final date = day.day.toString().padLeft(2, '0');
  return '${day.year}-$month-$date';
}

DateTime monthStart(DateTime day) => DateTime(day.year, day.month, 1);

DateTime monthEnd(DateTime day) => DateTime(day.year, day.month + 1, 0);

String stampAt(DateTime day, int hour, int minute) {
  final local = DateTime(day.year, day.month, day.day, hour, minute);
  return local.toUtc().toIso8601String();
}

String showDay(String? value) {
  final parsed = DateTime.tryParse(value ?? '');
  if (parsed == null) {
    return '';
  }
  final local = parsed.toLocal();
  final month = local.month.toString().padLeft(2, '0');
  final date = local.day.toString().padLeft(2, '0');
  return '$date/$month/${local.year}';
}

String showWhen(String? iso) {
  final parsed = DateTime.tryParse(iso ?? '');
  if (parsed == null) {
    return '';
  }
  final local = parsed.toLocal();
  final hour = local.hour.toString().padLeft(2, '0');
  final minute = local.minute.toString().padLeft(2, '0');
  final clock = '$hour:$minute';
  final day = DateTime(local.year, local.month, local.day);
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  if (day == today) {
    return 'Hoje $clock';
  }
  if (day == today.subtract(const Duration(days: 1))) {
    return 'Ontem $clock';
  }
  return '${showDay(iso)} $clock';
}

String showClock(String? iso) {
  final parsed = DateTime.tryParse(iso ?? '');
  if (parsed == null) {
    return '';
  }
  final local = parsed.toLocal();
  return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
}

String showMinutes(Object? value) {
  final minutes = value is int ? value : int.tryParse('$value') ?? 0;
  final sign = minutes < 0 ? '-' : '';
  final absolute = minutes.abs();
  final hours = (absolute ~/ 60).toString().padLeft(2, '0');
  final rest = (absolute % 60).toString().padLeft(2, '0');
  return '$sign$hours:$rest';
}

const requestKindLabel = {
  'adjustment': 'Ajuste',
  'allowance': 'Abono',
  'certificate': 'Atestado',
  'leave': 'Afastamento',
  'vacation': 'Férias',
};

const requestStatusLabel = {
  'pending': 'Pendente',
  'approved': 'Aprovada',
  'rejected': 'Recusada',
  'cancelled': 'Cancelada',
};

const punchSourceLabel = {
  'employee': 'Botão',
  'admin': 'Manual',
  'manual': 'Manual',
  'approved_request': 'Solicitação',
  'afd': 'Arquivo',
  'qr': 'QR Code',
  'face': 'Rosto',
};

const employeeNoticeLabel = {
  'request_approved': 'Sua solicitação foi aprovada.',
  'request_rejected': 'Sua solicitação foi recusada.',
  'request_cancelled': 'Sua solicitação foi cancelada.',
  'incomplete_punch': 'Há um dia com quantidade ímpar de marcações.',
};
