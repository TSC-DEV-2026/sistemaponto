import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_theme.dart';

void showPunchToast(BuildContext context, {required String message, required bool ok, bool stored = false}) {
  final colors = Theme.of(context).extension<FeedbackColors>();
  final scheme = Theme.of(context).colorScheme;
  final background = !ok
      ? colors?.danger ?? scheme.error
      : stored
          ? colors?.warning ?? scheme.primary
          : colors?.success ?? scheme.primary;
  final foreground = !ok
      ? colors?.onDanger ?? scheme.onError
      : stored
          ? colors?.onWarning ?? scheme.onSurface
          : colors?.onSuccess ?? scheme.onPrimary;
  final icon = !ok
      ? LucideIcons.circleAlert
      : stored
          ? LucideIcons.clock
          : LucideIcons.circleCheck;
  final messenger = ScaffoldMessenger.of(context);
  messenger.hideCurrentSnackBar();
  messenger.showSnackBar(
    SnackBar(
      backgroundColor: background,
      behavior: SnackBarBehavior.floating,
      duration: const Duration(seconds: 4),
      content: Row(
        children: [
          Icon(icon, color: foreground),
          const SizedBox(width: 12),
          Expanded(child: Text(message, style: TextStyle(color: foreground))),
        ],
      ),
    ),
  );
}
