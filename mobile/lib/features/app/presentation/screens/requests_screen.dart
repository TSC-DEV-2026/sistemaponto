import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../../shared/providers/loader_provider.dart';
import '../../../../shared/widgets/busy_button.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../data/format.dart';
import '../../data/page_items.dart';

class RequestsScreen extends ConsumerStatefulWidget {
  const RequestsScreen({super.key});

  @override
  ConsumerState<RequestsScreen> createState() => _RequestsScreenState();
}

class _RequestsScreenState extends ConsumerState<RequestsScreen> {
  List<Map<String, dynamic>> _items = [];
  String? _error;
  bool _canRequest = false;

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(_load);
  }

  Future<void> _load() async {
    final client = ref.read(apiClientProvider);
    ref.read(loaderProvider.notifier).state = true;
    setState(() => _error = null);
    try {
      var canRequest = false;
      final personId = ref.read(authProvider).user?.personId;
      if (personId != null) {
        final people = await client.get('/api/v1/employees', query: {'person_id': personId, 'limit': 1});
        final rows = pageItems(people);
        canRequest = rows.isNotEmpty && rows.first['situation'] != 'dismissed';
      }
      final page = await client.get('/api/v1/requests', query: {'page': 1, 'limit': 50});
      if (!mounted) {
        return;
      }
      setState(() {
        _items = pageItems(page);
        _canRequest = canRequest;
      });
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _error = error.message);
    } finally {
      ref.read(loaderProvider.notifier).state = false;
    }
  }

  Future<void> _cancel(int id) async {
    final client = ref.read(apiClientProvider);
    ref.read(loaderProvider.notifier).state = true;
    setState(() => _error = null);
    try {
      await client.put('/api/v1/requests/$id', {'status': 'cancelled', 'decision_note': null});
      await _load();
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      ref.read(loaderProvider.notifier).state = false;
    }
  }

  Future<void> _openNew() async {
    final created = await context.push<bool>('/requests/new');
    if (created == true) {
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text('Solicitações', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          const Text('A solicitação pendente não altera o ponto.'),
          if (_canRequest) ...[
            const SizedBox(height: 16),
            BusyButton(onPressed: _openNew, label: 'Nova solicitação'),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 24),
          Text('Minhas solicitações', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          ..._items.map((item) {
            final punches = item['punches'];
            final moments = punches is List ? punches.map((value) => showWhen('$value')).where((value) => value.isNotEmpty).join(', ') : '';
            final status = '${item['status']}';
            final photo = item['photo_url'];
            final decision = '${item['decision_note'] ?? ''}';
            return ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text('${requestKindLabel[item['kind']] ?? item['kind']} · ${requestStatusLabel[status] ?? status}'),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${item['starts_on'] ?? ''} ${item['ends_on'] ?? ''}\n${item['note'] ?? ''}${moments.isEmpty ? '' : '\n$moments'}'
                    '${decision.isEmpty ? '' : '\n$decision'}',
                  ),
                  if (photo is String && photo.isNotEmpty)
                    Image.network(
                      photo,
                      height: 120,
                      errorBuilder: (context, error, stackTrace) => const Text('A foto do atestado não pôde ser exibida.'),
                    ),
                ],
              ),
              trailing: status == 'pending'
                  ? BusyButton(kind: BusyButtonKind.text, onPressed: () => _cancel(item['id'] as int), label: 'Cancelar')
                  : null,
            );
          }),
          if (_items.isEmpty) const Text('Nenhuma solicitação.'),
        ],
      ),
    );
  }
}
