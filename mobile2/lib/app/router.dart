import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/device/presentation/screens/boot_screen.dart';
import '../features/device/presentation/screens/home_screen.dart';
import '../features/device/presentation/screens/setup_screen.dart';
import '../features/device/providers/device_provider.dart';
import '../shared/widgets/device_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.onDispose(refresh.dispose);
  ref.listen<DeviceState>(deviceProvider, (previous, next) {
    if (previous?.ready != next.ready || previous?.paired != next.paired) {
      refresh.value++;
    }
  });

  return GoRouter(
    initialLocation: '/boot',
    refreshListenable: refresh,
    redirect: (context, state) {
      final device = ref.read(deviceProvider);
      final location = state.matchedLocation;
      if (!device.ready) {
        return location == '/boot' ? null : '/boot';
      }
      if (location == '/boot') {
        return device.paired ? '/' : '/setup';
      }
      if (!device.paired && location != '/setup') {
        return '/setup';
      }
      if (device.paired && location == '/setup') {
        return '/';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/boot', builder: (context, state) => const BootScreen()),
      GoRoute(path: '/setup', builder: (context, state) => const SetupScreen(adding: false)),
      ShellRoute(
        builder: (context, state, child) => DeviceShell(child: child),
        routes: [
          GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
          GoRoute(path: '/organization', builder: (context, state) => const SetupScreen(adding: true)),
        ],
      ),
    ],
  );
});
