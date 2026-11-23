import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../../shared/providers/loader_provider.dart';
import '../../../../shared/widgets/busy_button.dart';
import '../../../../shared/widgets/panel_spinner.dart';
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
  bool _loading = true;
  int _page = 1;
  int _total = 0;
  String _kind = '';
  static const _limit = 20;

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(_load);
  }

  Future<void> _load() async {
    final client = ref.read(apiClientProvider);
    ref.read(loaderProvider.notifier).state = true;
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      final notices = await client.get('/api/v1/notices', query: {'page': _page, 'limit': _limit});
      final preferences = await client.get('/api/v1/notice-preferences', query: {'page': 1, 'limit': 100, if (_kind.isNotEmpty) 'kind': _kind});
      setState(() {
        _items = pageItems(notices);
        _total = notices['total'] is int ? notices['total'] as int : 0;
        _preferences = pageItems(preferences);
      });
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
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

  String _channel(String kind) {
    for (final row in _preferences) {
      if (row['kind'] == kind) {
        final channel = row['channel'];
        if (channel == 'system' || channel == 'email' || channel == 'both') return channel;
      }
    }
    return 'both';
  }

  Map<String, dynamic>? _preference(String kind) {
    for (final row in _preferences) {
      if (row['kind'] == kind) return row;
    }
    return null;
  }

  Future<void> _mark(int id) async {
    final client = ref.read(apiClientProvider);
    setState(() => _error = null);
    try {
      await client.put('/api/v1/notices/$id', {'read': true});
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
        await client.put('/api/v1/notice-preferences/${row['id']}', {'enabled': next});
      } else if (!next) {
        await client.post('/api/v1/notice-preferences', {'kind': kind, 'enabled': false, 'channel': 'both'});
      }
      await _load();
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    }
  }

  Future<void> _setChannel(String kind, String channel) async {
    final client = ref.read(apiClientProvider);
    setState(() => _error = null);
    try {
      final row = _preference(kind);
      if (row != null) {
        await client.put('/api/v1/notice-preferences/${row['id']}', {'enabled': true, 'channel': channel});
      } else {
        await client.post('/api/v1/notice-preferences', {'kind': kind, 'enabled': true, 'channel': channel});
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
          const Text('Cada aviso pode ir pelo sistema, pelo e-mail ou pelos dois. Sem escolha gravada, os dois ficam ligados.'),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _kind,
            decoration: const InputDecoration(labelText: 'Tipo'),
            items: [
              const DropdownMenuItem(value: '', child: Text('Todos')),
              ...employeeNoticeLabel.entries.map((item) => DropdownMenuItem(value: item.key, child: Text(item.value))),
            ],
            onChanged: (value) {
              setState(() {
                _kind = value ?? '';
                _page = 1;
              });
              _load();
            },
          ),
          ...employeeNoticeLabel.entries.where((item) => _kind.isEmpty || item.key == _kind).map(
            (item) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(item.value),
                  value: _enabled(item.key),
                  onChanged: (value) => _setEnabled(item.key, value),
                ),
                if (_enabled(item.key))
                  DropdownButton<String>(
                    value: _channel(item.key),
                    isExpanded: true,
                    items: const [
                      DropdownMenuItem(value: 'system', child: Text('Sistema')),
                      DropdownMenuItem(value: 'email', child: Text('E-mail')),
                      DropdownMenuItem(value: 'both', child: Text('Os dois')),
                    ],
                    onChanged: (value) {
                      if (value != null) _setChannel(item.key, value);
                    },
                  ),
              ],
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
              trailing: read ? const Text('Lida') : BusyButton(kind: BusyButtonKind.text, onPressed: () => _mark(item['id'] as int), label: 'Marcar lida'),
            );
          }),
          if (_loading && _items.isEmpty)
            const PanelSpinner()
          else if (_items.isEmpty)
            const Text('Nenhum aviso.'),
          if (_total > 0) ...[
            const SizedBox(height: 12),
            Text('Página $_page de ${(_total / _limit).ceil()} ($_total ${_total == 1 ? 'item' : 'itens'})'),
            Row(
              children: [
                TextButton(
                  onPressed: _page <= 1
                      ? null
                      : () {
                          setState(() => _page -= 1);
                          _load();
                        },
                  child: const Text('Anterior'),
                ),
                TextButton(
                  onPressed: _page * _limit >= _total
                      ? null
                      : () {
                          setState(() => _page += 1);
                          _load();
                        },
                  child: const Text('Próxima'),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
