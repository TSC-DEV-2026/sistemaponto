import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../../shared/providers/loader_provider.dart';
import '../../../auth/providers/auth_provider.dart';

class SelectTenantScreen extends ConsumerWidget {
  const SelectTenantScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tenants = ref.watch(authProvider).user?.tenants ?? const [];
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text('Escolher empresa', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 16),
            ...tenants.map(
              (tenant) => ListTile(
                title: Text(tenant.name),
                onTap: () async {
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
          ],
        ),
      ),
    );
  }
}
