import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../../core/utils/digits.dart';
import '../../../../shared/providers/loader_provider.dart';
import '../../providers/auth_provider.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _name = TextEditingController();
  final _cpf = TextEditingController();
  final _email = TextEditingController();
  final _company = TextEditingController();
  final _password = TextEditingController();
  String _error = '';

  @override
  void dispose() {
    _name.dispose();
    _cpf.dispose();
    _email.dispose();
    _company.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = '');
    ref.read(loaderProvider.notifier).state = true;
    try {
      final issued = await ref.read(authServiceProvider).register(
            fullName: _name.text.trim(),
            cpf: onlyDigits(_cpf.text),
            email: _email.text.trim(),
            companyName: _company.text.trim(),
            password: _password.text,
          );
      if (issued.user.mustLogin || issued.accessToken == null) {
        if (mounted) {
          context.go('/login?notice=Entre com a senha que você já usa.');
        }
        return;
      }
      await ref.read(authProvider.notifier).adopt(issued);
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
            Text('Criar conta', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 24),
            TextField(controller: _name, decoration: const InputDecoration(labelText: 'Nome')),
            const SizedBox(height: 12),
            TextField(
              controller: _cpf,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'CPF'),
            ),
            const SizedBox(height: 12),
            TextField(controller: _email, decoration: const InputDecoration(labelText: 'E-mail')),
            const SizedBox(height: 12),
            TextField(controller: _company, decoration: const InputDecoration(labelText: 'Empresa')),
            const SizedBox(height: 12),
            TextField(
              controller: _password,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Senha'),
            ),
            if (_error.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(_error, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 16),
            FilledButton(onPressed: _submit, child: const Text('Cadastrar')),
            TextButton(onPressed: () => context.go('/login'), child: const Text('Já tenho conta')),
          ],
        ),
      ),
    );
  }
}
