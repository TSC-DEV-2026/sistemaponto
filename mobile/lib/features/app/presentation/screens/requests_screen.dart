import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../data/page_items.dart';

class RequestsScreen extends ConsumerStatefulWidget {
  const RequestsScreen({super.key});

  @override
  ConsumerState<RequestsScreen> createState() => _RequestsScreenState();
}

class _RequestsScreenState extends ConsumerState<RequestsScreen> {
  final note = TextEditingController();
  List<Map<String, dynamic>> items = [];
  String kind = 'adjustment';
  String? error;
  DateTime when = DateTime.now();
  DateTime start = DateTime.now();

  @override
  void initState() {
    super.initState();
    Future.microtask(load);
  }

  @override
  void dispose() {
    note.dispose();
    super.dispose();
  }

  Future<void> load() async {
    try {
      final page = await ref.read(apiClientProvider).get('/api/v1/requests', query: {'page': 1, 'limit': 50});
      if (!mounted) {
        return;
      }
      setState(() {
        items = pageItems(page);
        error = null;
      });
    } on ApiException catch (caught) {
      if (!mounted) {
        return;
      }
      setState(() => error = caught.message);
    }
  }

  Future<void> submit() async {
    final body = <String, dynamic>{
      'kind': kind,
      'reason_id': null,
      'note': note.text.trim().isEmpty ? null : note.text.trim(),
      'starts_on': null,
      'ends_on': null,
      'occurred_at': null,
    };
    if (kind == 'adjustment') {
      body['occurred_at'] = when.toUtc().toIso8601String();
    } else {
      final day = '${start.year.toString().padLeft(4, '0')}-${start.month.toString().padLeft(2, '0')}-${start.day.toString().padLeft(2, '0')}';
      body['starts_on'] = day;
      body['ends_on'] = day;
    }
    try {
      await ref.read(apiClientProvider).post('/api/v1/requests', body);
      note.clear();
      await load();
    } on ApiException catch (caught) {
      if (!mounted) {
        return;
      }
      setState(() => error = caught.message);
    }
  }

  Future<void> cancel(int id) async {
    try {
      await ref.read(apiClientProvider).put('/api/v1/requests/$id', {'status': 'cancelled', 'decision_note': null});
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
    final labels = {'adjustment': 'Ajuste de ponto', 'allowance': 'Abono', 'certificate': 'Atestado'};
    final statuses = {'pending': 'Pendente', 'approved': 'Aprovada', 'rejected': 'Recusada', 'cancelled': 'Cancelada'};
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
          DropdownButton<String>(
            value: kind,
            isExpanded: true,
            items: labels.entries.map((entry) => DropdownMenuItem(value: entry.key, child: Text(entry.value))).toList(),
            onChanged: (value) {
              if (value != null) {
                setState(() => kind = value);
              }
            },
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () async {
              final picked = await showDatePicker(
                context: context,
                firstDate: DateTime(2020),
                lastDate: DateTime.now(),
                initialDate: kind == 'adjustment' ? when : start,
              );
              if (picked == null || !mounted) {
                return;
              }
              setState(() {
                if (kind == 'adjustment') {
                  when = DateTime(picked.year, picked.month, picked.day, when.hour, when.minute);
                } else {
                  start = picked;
                }
              });
            },
            child: Text(kind == 'adjustment' ? 'Data da marcação' : 'Data do período'),
          ),
          TextField(
            controller: note,
            decoration: const InputDecoration(labelText: 'Observação'),
          ),
          const SizedBox(height: 8),
          FilledButton(onPressed: submit, child: const Text('Enviar')),
          if (error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(error!)),
          const SizedBox(height: 16),
          ...items.map((item) {
            final status = item['status']?.toString() ?? '';
            final rawId = item['id'];
            final id = rawId is int ? rawId : (rawId is num ? rawId.toInt() : null);
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                title: Text(labels[item['kind']] ?? 'Solicitação'),
                subtitle: Text(statuses[status] ?? status),
                trailing: status == 'pending' && id != null
                    ? TextButton(onPressed: () => cancel(id), child: const Text('Cancelar'))
                    : null,
              ),
            );
          }),
          if (items.isEmpty) const Text('Nenhuma solicitação.'),
        ],
      ),
    );
  }
}
