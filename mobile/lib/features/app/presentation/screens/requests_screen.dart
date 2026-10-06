import 'package:flutter/material.dart';

class RequestsScreen extends StatelessWidget {
  const RequestsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text('Solicitações', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(
            'Enviar não altera o ponto. A decisão fica na gestão.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          const _Status(label: 'Pendentes', value: '0'),
          const _Status(label: 'Aprovadas', value: '0'),
          const _Status(label: 'Recusadas', value: '0'),
          const _Status(label: 'Canceladas', value: '0'),
          const SizedBox(height: 16),
          const _Kind(title: 'Ajuste de ponto'),
          const _Kind(title: 'Abono'),
          const _Kind(title: 'Atestado'),
        ],
      ),
    );
  }
}

class _Status extends StatelessWidget {
  const _Status({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return ListTile(title: Text(label), trailing: Text(value));
  }
}

class _Kind extends StatelessWidget {
  const _Kind({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(title: Text(title), subtitle: const Text('Nenhuma solicitação.')),
    );
  }
}
