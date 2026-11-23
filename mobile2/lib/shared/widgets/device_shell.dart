import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

class DeviceShell extends StatelessWidget {
  const DeviceShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final path = GoRouterState.of(context).uri.path;
    final index = path.startsWith('/organization') ? 1 : 0;
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) {
          const routes = ['/', '/organization'];
          context.go(routes[value]);
        },
        destinations: const [
          NavigationDestination(icon: Icon(LucideIcons.house), label: 'Início'),
          NavigationDestination(icon: Icon(LucideIcons.building2), label: 'Organização'),
        ],
      ),
    );
  }
}
