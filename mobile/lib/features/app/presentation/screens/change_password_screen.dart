import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../../shared/providers/loader_provider.dart';
import '../../../../shared/widgets/secret_field.dart';
import '../../../auth/providers/auth_provider.dart';

class ChangePasswordScreen extends ConsumerStatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  ConsumerState<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends ConsumerState<ChangePasswordScreen> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  String _message = '';
  String _error = '';

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _error = '';
      _message = '';
    });
    if (_next.text != _confirm.text) {
      setState(() => _error = 'A confirmação não confere.');
      return;
    }
    ref.read(loaderProvider.notifier).state = true;
    try {
      await ref.read(authServiceProvider).changePassword(_current.text, _next.text);
      setState(() => _message = 'Senha alterada.');
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      ref.read(loaderProvider.notifier).state = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text('Trocar senha', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 24),
          SecretField(controller: _current, label: 'Senha atual'),
          const SizedBox(height: 12),
          SecretField(controller: _next, label: 'Nova senha'),
          const SizedBox(height: 12),
          SecretField(controller: _confirm, label: 'Confirmação'),
          if (_message.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(_message),
          ],
          if (_error.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(_error, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 16),
          FilledButton(onPressed: _submit, child: const Text('Salvar')),
        ],
      ),
    );
  }
}
