import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../../core/utils/digits.dart';
import '../../../../shared/providers/loader_provider.dart';
import '../../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _cpf = TextEditingController();
  final _password = TextEditingController();
  String _error = '';

  @override
  void dispose() {
    _cpf.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = '');
    ref.read(loaderProvider.notifier).state = true;
    try {
      final issued = await ref.read(authServiceProvider).login(onlyDigits(_cpf.text), _password.text);
      await ref.read(authProvider.notifier).adopt(issued);
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      ref.read(loaderProvider.notifier).state = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final notice = GoRouterState.of(context).uri.queryParameters['notice'];
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text('sistemaponto', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text('Entrar', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 24),
            TextField(
              controller: _cpf,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'CPF'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _password,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Senha'),
            ),
            if ((notice ?? '').isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(notice!),
            ],
            if (_error.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(_error, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _submit,
              icon: const Icon(LucideIcons.logIn),
              label: const Text('Entrar'),
            ),
            TextButton(onPressed: () => context.go('/forgot-password'), child: const Text('Esqueci a senha')),
            TextButton(onPressed: () => context.go('/register'), child: const Text('Criar conta')),
          ],
        ),
      ),
    );
  }
}
