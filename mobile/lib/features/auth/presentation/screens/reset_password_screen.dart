import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../../shared/providers/loader_provider.dart';
import '../../providers/auth_provider.dart';

class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  ConsumerState<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  final _token = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  String _error = '';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final token = GoRouterState.of(context).uri.queryParameters['token'];
    if (token != null && _token.text.isEmpty) {
      _token.text = token;
    }
  }

  @override
  void dispose() {
    _token.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = '');
    if (_password.text != _confirm.text) {
      setState(() => _error = 'A confirmação não confere.');
      return;
    }
    ref.read(loaderProvider.notifier).state = true;
    try {
      await ref.read(authServiceProvider).resetPassword(_token.text.trim(), _password.text);
      if (mounted) {
        context.go('/login?notice=Senha redefinida.');
      }
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      ref.read(loaderProvider.notifier).state = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text('Nova senha', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 24),
            TextField(controller: _token, decoration: const InputDecoration(labelText: 'Token')),
            const SizedBox(height: 12),
            TextField(
              controller: _password,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Nova senha'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _confirm,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Confirmação'),
            ),
            if (_error.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(_error, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 16),
            FilledButton(onPressed: _submit, child: const Text('Salvar')),
          ],
        ),
      ),
    );
  }
}
