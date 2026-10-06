import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../../shared/providers/loader_provider.dart';
import '../../../auth/providers/auth_provider.dart';

class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final tenants = user?.tenants ?? const [];
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text('Conta', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(user?.fullName ?? ''),
          Text(user?.email ?? ''),
          Text(user?.activeTenant?.name ?? ''),
          const SizedBox(height: 8),
          Text(
            user?.emailVerified == true ? 'E-mail confirmado.' : 'E-mail ainda não confirmado. O acesso não depende disso.',
          ),
          const SizedBox(height: 16),
          if (tenants.length > 1)
            ...tenants.map(
              (tenant) => ListTile(
                title: Text(tenant.name),
                trailing: tenant.id == user?.activeTenant?.id ? const Icon(LucideIcons.check) : null,
                onTap: tenant.id == user?.activeTenant?.id
                    ? null
                    : () async {
                        ref.read(loaderProvider.notifier).state = true;
                        try {
                          final issued = await ref.read(authServiceProvider).switchTenant(tenant.id);
                          await ref.read(authProvider.notifier).adopt(issued);
                        } on ApiException catch (error) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
                          }
                        } finally {
                          ref.read(loaderProvider.notifier).state = false;
                        }
                      },
              ),
            ),
          const SizedBox(height: 8),
          FilledButton.icon(
            onPressed: () => context.go('/change-password'),
            icon: const Icon(LucideIcons.keyRound),
            label: const Text('Trocar senha'),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () => ref.read(authProvider.notifier).logout(),
            icon: const Icon(LucideIcons.logOut),
            label: const Text('Sair'),
          ),
        ],
      ),
    );
  }
}
