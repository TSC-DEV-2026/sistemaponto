import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../../shared/providers/loader_provider.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../data/format.dart';
import '../../data/page_items.dart';

class NoticesScreen extends ConsumerStatefulWidget {
  const NoticesScreen({super.key});

  @override
  ConsumerState<NoticesScreen> createState() => _NoticesScreenState();
}

class _NoticesScreenState extends ConsumerState<NoticesScreen> {
  List<Map<String, dynamic>> _items = [];
  List<Map<String, dynamic>> _preferences = [];
  String? _error;

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
      final notices = await client.get('/api/v1/notifications', query: {'page': 1, 'limit': 100});
      final preferences = await client.get('/api/v1/notification-preferences', query: {'page': 1, 'limit': 100});
      setState(() {
        _items = pageItems(notices);
        _preferences = pageItems(preferences);
      });
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      ref.read(loaderProvider.notifier).state = false;
    }
  }

  bool _enabled(String kind) {
    for (final row in _preferences) {
      if (row['kind'] == kind) {
        return row['enabled'] != false;
      }
    }
    return true;
  }

  Future<void> _mark(int id) async {
    final client = ref.read(apiClientProvider);
    setState(() => _error = null);
    try {
      await client.put('/api/v1/notifications/$id', {'read': true});
      await _load();
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    }
  }

  Future<void> _setEnabled(String kind, bool next) async {
    final client = ref.read(apiClientProvider);
    setState(() => _error = null);
    try {
      Map<String, dynamic>? row;
      for (final item in _preferences) {
        if (item['kind'] == kind) {
          row = item;
        }
      }
      if (row != null) {
        await client.put('/api/v1/notification-preferences/${row['id']}', {'enabled': next});
      } else if (!next) {
        await client.post('/api/v1/notification-preferences', {'kind': kind, 'enabled': false});
      }
      await _load();
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text('Avisos', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          const Text('O texto no aplicativo é o mesmo do e-mail. Cada aviso seu pode ser desligado. Sem preferência gravada, ele fica ligado.'),
          const SizedBox(height: 16),
          ...employeeNoticeLabel.entries.map(
            (item) => SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(item.value),
              value: _enabled(item.key),
              onChanged: (value) => _setEnabled(item.key, value),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 16),
          Text('Recebidos', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          ..._items.map((item) {
            final read = item['read_at'] != null;
            return ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text('${item['body'] ?? ''}'),
              subtitle: Text(showWhen('${item['created_at']}')),
              trailing: read ? const Text('Lida') : TextButton(onPressed: () => _mark(item['id'] as int), child: const Text('Marcar lida')),
            );
          }),
          if (_items.isEmpty) const Text('Nenhum aviso.'),
        ],
      ),
    );
  }
}
