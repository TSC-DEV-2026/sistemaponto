import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../../shared/providers/loader_provider.dart';
import '../../providers/auth_provider.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _email = TextEditingController();
  String _message = '';
  String _error = '';

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _error = '';
      _message = '';
    });
    ref.read(loaderProvider.notifier).state = true;
    try {
      final message = await ref.read(authServiceProvider).forgotPassword(_email.text.trim());
      setState(() => _message = message);
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
            Text('Esqueci a senha', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 24),
            TextField(controller: _email, decoration: const InputDecoration(labelText: 'E-mail')),
            if (_message.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(_message),
            ],
            if (_error.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(_error, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 16),
            FilledButton(onPressed: _submit, child: const Text('Enviar')),
            TextButton(onPressed: () => context.go('/reset-password'), child: const Text('Já tenho o token')),
            TextButton(onPressed: () => context.go('/login'), child: const Text('Voltar')),
          ],
        ),
      ),
    );
  }
}
