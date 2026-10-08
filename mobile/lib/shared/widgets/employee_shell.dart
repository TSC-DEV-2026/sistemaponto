import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

class EmployeeShell extends StatelessWidget {
  const EmployeeShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final path = GoRouterState.of(context).uri.path;
    var index = 0;
    if (path.startsWith('/requests')) {
      index = 1;
    } else if (path.startsWith('/notices')) {
      index = 2;
    } else if (path.startsWith('/account') || path.startsWith('/change-password')) {
      index = 3;
    }
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) {
          const routes = ['/', '/requests', '/notices', '/account'];
          context.go(routes[value]);
        },
        destinations: const [
          NavigationDestination(icon: Icon(LucideIcons.house), label: 'Início'),
          NavigationDestination(icon: Icon(LucideIcons.inbox), label: 'Solicitações'),
          NavigationDestination(icon: Icon(LucideIcons.bell), label: 'Avisos'),
          NavigationDestination(icon: Icon(LucideIcons.keyRound), label: 'Conta'),
        ],
      ),
    );
  }
}
