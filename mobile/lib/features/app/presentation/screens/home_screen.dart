import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../data/page_items.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  Map<String, dynamic>? employee;
  List<Map<String, dynamic>> punches = [];
  List<Map<String, dynamic>> occurrences = [];
  String? error;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    Future.microtask(load);
  }

  Future<void> load() async {
    final user = ref.read(authProvider).user;
    if (user == null) {
      setState(() => loading = false);
      return;
    }
    try {
      final client = ref.read(apiClientProvider);
      final page = await client.get('/api/v1/employees', query: {
        'person_id': user.personId,
        'page': 1,
        'limit': 1,
      });
      final people = pageItems(page);
      if (people.isEmpty) {
        setState(() {
          employee = null;
          punches = [];
          occurrences = [];
          loading = false;
          error = null;
        });
        return;
      }
      final current = people.first;
      final id = current['id'];
      final marks = await client.get('/api/v1/punches', query: {'employee_id': id, 'page': 1, 'limit': 20});
      final events = await client.get('/api/v1/occurrences', query: {'employee_id': id, 'page': 1, 'limit': 20});
      if (!mounted) {
        return;
      }
      setState(() {
        employee = current;
        punches = pageItems(marks);
        occurrences = pageItems(events);
        loading = false;
        error = null;
      });
    } on ApiException catch (caught) {
      if (!mounted) {
        return;
      }
      setState(() {
        error = caught.message;
        loading = false;
      });
    }
  }

  Future<void> punch() async {
    final current = employee;
    if (current == null) {
      return;
    }
    setState(() => error = null);
    try {
      await ref.read(apiClientProvider).post('/api/v1/punches', {
        'employee_id': current['id'],
        'occurred_at': DateTime.now().toUtc().toIso8601String(),
        'note': null,
      });
      await load();
    } on ApiException catch (caught) {
      if (!mounted) {
        return;
      }
      setState(() => error = caught.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final text = Theme.of(context).textTheme;
    final current = employee;
    final situation = current?['situation'] == 'dismissed' ? 'Desligado' : 'Ativo';
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
          if (loading) const LinearProgressIndicator(),
          if (error != null) Text(error!, style: text.bodyMedium),
          if (!loading && current == null)
            const _Card(
              title: 'Meu vínculo',
              text: 'Seu acesso ainda não está ligado a um funcionário. A gestão faz isso em Pessoas, com o person id.',
            ),
          if (current != null) ...[
            _Card(title: 'Situação', text: '$situation · ${current['job_label'] ?? 'Sem cargo'}'),
            _Card(title: 'Minha jornada', text: current['journey_label']?.toString() ?? 'Nenhuma jornada vigente.'),
            _Card(
              title: 'Meu ponto',
              text: punches.isEmpty
                  ? 'Nenhuma marcação.'
                  : punches.map((item) => item['occurred_at']?.toString() ?? '').join('\n'),
            ),
            _Card(
              title: 'Ocorrências',
              text: occurrences.isEmpty ? 'Nenhuma ocorrência própria.' : '${occurrences.length} ocorrência(s).',
            ),
            const _Card(
              title: 'Banco de horas',
              text: 'O saldo não é calculado. As regras de crédito e débito ainda não foram definidas.',
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: current['situation'] == 'dismissed' ? null : punch,
              child: const Text('Registrar marcação'),
            ),
          ],
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
