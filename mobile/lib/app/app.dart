import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme/app_theme.dart';
import '../features/app/data/punch_reminders.dart';
import '../features/auth/providers/auth_provider.dart';
import '../shared/widgets/global_loader.dart';
import 'router.dart';

class SistemapontoApp extends ConsumerWidget {
  const SistemapontoApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.listen(authProvider, (previous, next) {
      if (previous?.isAuthenticated == true && !next.isAuthenticated) {
        PunchReminders.instance.clear();
      }
    });
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'sistemaponto',
      theme: appTheme(),
      routerConfig: router,
      builder: (context, child) => GlobalLoader(child: child ?? const SizedBox.shrink()),
    );
  }
}
