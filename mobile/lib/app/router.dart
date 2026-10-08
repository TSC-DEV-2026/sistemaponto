import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/app/presentation/screens/account_screen.dart';
import '../features/app/presentation/screens/change_password_screen.dart';
import '../features/app/presentation/screens/home_screen.dart';
import '../features/app/presentation/screens/notices_screen.dart';
import '../features/app/presentation/screens/requests_screen.dart';
import '../features/app/presentation/screens/select_tenant_screen.dart';
import '../features/auth/presentation/screens/boot_screen.dart';
import '../features/auth/presentation/screens/forgot_password_screen.dart';
import '../features/auth/presentation/screens/login_screen.dart';
import '../features/auth/presentation/screens/register_screen.dart';
import '../features/auth/presentation/screens/reset_password_screen.dart';
import '../features/auth/providers/auth_provider.dart';
import '../shared/widgets/employee_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.onDispose(refresh.dispose);
  ref.listen<AuthState>(authProvider, (previous, next) {
    if (previous?.ready != next.ready ||
        previous?.accessToken != next.accessToken ||
        previous?.user?.activeTenant?.id != next.user?.activeTenant?.id) {
      refresh.value++;
    }
  });

  return GoRouter(
    initialLocation: '/boot',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final location = state.matchedLocation;
      const publicRoutes = {'/boot', '/login', '/register', '/forgot-password', '/reset-password'};
      if (!auth.ready) {
        return location == '/boot' ? null : '/boot';
      }
      if (location == '/boot') {
        return auth.isAuthenticated ? '/' : '/login';
      }
      final isPublic = publicRoutes.contains(location);
      if (!auth.isAuthenticated && !isPublic) {
        return '/login';
      }
      if (auth.isAuthenticated && isPublic) {
        return auth.user?.activeTenant == null ? '/select-tenant' : '/';
      }
      final needsTenant = auth.isAuthenticated && auth.user?.activeTenant == null;
      if (needsTenant && location != '/select-tenant') {
        return '/select-tenant';
      }
      if (!needsTenant && location == '/select-tenant') {
        return '/';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/boot', builder: (context, state) => const BootScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
      GoRoute(path: '/forgot-password', builder: (context, state) => const ForgotPasswordScreen()),
      GoRoute(path: '/reset-password', builder: (context, state) => const ResetPasswordScreen()),
      GoRoute(path: '/select-tenant', builder: (context, state) => const SelectTenantScreen()),
      ShellRoute(
        builder: (context, state, child) => EmployeeShell(child: child),
        routes: [
          GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
          GoRoute(path: '/requests', builder: (context, state) => const RequestsScreen()),
          GoRoute(path: '/notices', builder: (context, state) => const NoticesScreen()),
          GoRoute(path: '/account', builder: (context, state) => const AccountScreen()),
          GoRoute(path: '/change-password', builder: (context, state) => const ChangePasswordScreen()),
        ],
      ),
    ],
  );
});
