import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../auth/providers/auth_provider.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final text = Theme.of(context).textTheme;
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text('sistemaponto', style: text.titleMedium),
          const SizedBox(height: 8),
          Text(user?.fullName ?? '', style: text.headlineSmall),
          const SizedBox(height: 4),
          Text(user?.activeTenant?.name ?? '', style: text.bodyMedium),
          const SizedBox(height: 24),
          const _Card(title: 'Meu ponto', text: 'Nenhuma marcação.'),
          const _Card(title: 'Minha jornada', text: 'Nenhuma jornada vigente.'),
          const _Card(title: 'Banco de horas', text: 'Nenhum saldo.'),
          const _Card(title: 'Ocorrências', text: 'Nenhuma ocorrência própria.'),
        ],
      ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.title, required this.text});

  final String title;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        title: Text(title),
        subtitle: Text(text),
      ),
    );
  }
}
