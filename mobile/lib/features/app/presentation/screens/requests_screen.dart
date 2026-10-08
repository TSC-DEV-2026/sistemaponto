import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../../shared/providers/loader_provider.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../data/format.dart';
import '../../data/page_items.dart';

class RequestsScreen extends ConsumerStatefulWidget {
  const RequestsScreen({super.key});

  @override
  ConsumerState<RequestsScreen> createState() => _RequestsScreenState();
}

class _RequestsScreenState extends ConsumerState<RequestsScreen> {
  final _note = TextEditingController();
  final _cid = TextEditingController();
  final _crm = TextEditingController();
  final _doctor = TextEditingController();
  List<Map<String, dynamic>> _items = [];
  List<Map<String, dynamic>> _reasons = [];
  String? _error;
  String _kind = 'adjustment';
  String _span = 'day';
  String? _reasonId;
  DateTime _start = DateTime.now();
  DateTime _end = DateTime.now();
  TimeOfDay _from = const TimeOfDay(hour: 8, minute: 0);
  TimeOfDay _until = const TimeOfDay(hour: 12, minute: 0);
  final List<TimeOfDay> _marks = [const TimeOfDay(hour: 8, minute: 0)];
  XFile? _photo;

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(_load);
  }

  @override
  void dispose() {
    _note.dispose();
    _cid.dispose();
    _crm.dispose();
    _doctor.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final client = ref.read(apiClientProvider);
    ref.read(loaderProvider.notifier).state = true;
    setState(() => _error = null);
    try {
      final page = await client.get('/api/v1/requests', query: {'page': 1, 'limit': 50});
      final reasons = await _loadReasons();
      setState(() {
        _items = pageItems(page);
        _reasons = reasons;
      });
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      ref.read(loaderProvider.notifier).state = false;
    }
  }

  Future<List<Map<String, dynamic>>> _loadReasons() async {
    const reasonKind = {'adjustment': 'adjustment', 'allowance': 'allowance', 'certificate': 'certificate'};
    final kind = reasonKind[_kind];
    if (kind == null) {
      return [];
    }
    final page = await ref.read(apiClientProvider).get('/api/v1/reasons', query: {'kind': kind, 'active': true, 'limit': 100});
    return pageItems(page);
  }

  Future<void> _changeKind(String kind) async {
    setState(() {
      _kind = kind;
      _reasonId = null;
      _reasons = [];
      _error = null;
    });
    try {
      final reasons = await _loadReasons();
      if (mounted) {
        setState(() => _reasons = reasons);
      }
    } on ApiException catch (error) {
      if (mounted) {
        setState(() => _error = error.message);
      }
    }
  }

  Future<void> _pickDay(bool start) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: start ? _start : _end,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );
    if (picked == null) {
      return;
    }
    setState(() {
      if (start) {
        _start = picked;
        if (_end.isBefore(picked)) {
          _end = picked;
        }
      } else {
        _end = picked;
      }
    });
  }

  Future<void> _pickMark(int index) async {
    final picked = await showTimePicker(context: context, initialTime: _marks[index]);
    if (picked == null) {
      return;
    }
    setState(() => _marks[index] = picked);
  }

  Future<void> _pickHour(bool start) async {
    final picked = await showTimePicker(context: context, initialTime: start ? _from : _until);
    if (picked == null) {
      return;
    }
    setState(() {
      if (start) {
        _from = picked;
      } else {
        _until = picked;
      }
    });
  }

  Future<void> _pickPhoto() async {
    final shot = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (shot != null) {
      setState(() => _photo = shot);
    }
  }

  Future<void> _submit() async {
    final client = ref.read(apiClientProvider);
    ref.read(loaderProvider.notifier).state = true;
    setState(() => _error = null);
    try {
      final body = <String, dynamic>{
        'kind': _kind,
        'reason_id': _reasonId == null ? null : int.parse(_reasonId!),
        'note': _note.text.trim().isEmpty ? null : _note.text.trim(),
      };
      if (_kind == 'adjustment') {
        final moments = _marks.map((mark) => stampAt(_start, mark.hour, mark.minute)).toList()..sort();
        body['starts_on'] = dayStamp(_start);
        body['ends_on'] = dayStamp(_start);
        body['punches'] = moments;
      } else {
        final sameDay = _span != 'days';
        body['starts_on'] = dayStamp(_start);
        body['ends_on'] = dayStamp(sameDay ? _start : _end);
        if (_span == 'hours') {
          body['starts_at'] = stampAt(_start, _from.hour, _from.minute);
          body['ends_at'] = stampAt(_start, _until.hour, _until.minute);
        }
      }
      if (_kind == 'certificate') {
        body['cid'] = _cid.text.trim();
        body['crm'] = _crm.text.trim();
        body['doctor_name'] = _doctor.text.trim();
        final photo = _photo;
        if (photo != null) {
          final bytes = await photo.readAsBytes();
          final type = photo.mimeType == 'image/png' ? 'image/png' : 'image/jpeg';
          final stored = await client.postFile('/api/v1/certificate-photos', photo.name, bytes, type);
          body['photo_key'] = stored['key'];
        }
      }
      await client.post('/api/v1/requests', body);
      _note.clear();
      _photo = null;
      await _load();
    } on ApiException catch (error) {
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

  @override
  Widget build(BuildContext context) {
    final certificate = _kind == 'certificate';
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text('Solicitações', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          const Text('A solicitação pendente não altera o ponto. O ajuste pede as marcações do dia. A foto do atestado é opcional.'),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _kind,
            decoration: const InputDecoration(labelText: 'Tipo'),
            items: requestKindLabel.entries.map((item) => DropdownMenuItem(value: item.key, child: Text(item.value))).toList(),
            onChanged: (value) {
              if (value != null) {
                _changeKind(value);
              }
            },
          ),
          const SizedBox(height: 12),
          if (_reasons.isNotEmpty)
            DropdownButtonFormField<String>(
              key: ValueKey(_kind),
              initialValue: _reasonId,
              decoration: const InputDecoration(labelText: 'Motivo'),
              items: _reasons.map((item) => DropdownMenuItem(value: '${item['id']}', child: Text('${item['name']}'))).toList(),
              onChanged: (value) => setState(() => _reasonId = value),
            ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(_kind == 'adjustment' ? 'Dia ${dayStamp(_start)}' : 'Início ${dayStamp(_start)}'),
            trailing: const Icon(LucideIcons.calendar),
            onTap: () => _pickDay(true),
          ),
          if (_kind == 'adjustment') ...[
            ..._marks.asMap().entries.map(
              (entry) => ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('Marcação ${entry.key + 1}: ${entry.value.format(context)}'),
                trailing: IconButton(
                  onPressed: _marks.length == 1 ? null : () => setState(() => _marks.removeAt(entry.key)),
                  icon: const Icon(LucideIcons.x),
                ),
                onTap: () => _pickMark(entry.key),
              ),
            ),
            TextButton(
              onPressed: _marks.length >= 20 ? null : () => setState(() => _marks.add(const TimeOfDay(hour: 18, minute: 0))),
              child: const Text('Adicionar marcação'),
            ),
          ] else ...[
            DropdownButtonFormField<String>(
              initialValue: _span,
              decoration: const InputDecoration(labelText: 'Período'),
              items: const [
                DropdownMenuItem(value: 'day', child: Text('Dia inteiro')),
                DropdownMenuItem(value: 'hours', child: Text('Algumas horas')),
                DropdownMenuItem(value: 'days', child: Text('Vários dias')),
              ],
              onChanged: (value) => setState(() => _span = value ?? 'day'),
            ),
            if (_span == 'days')
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('Fim ${dayStamp(_end)}'),
                trailing: const Icon(LucideIcons.calendar),
                onTap: () => _pickDay(false),
              ),
            if (_span == 'hours') ...[
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('Das ${_from.format(context)}'),
                onTap: () => _pickHour(true),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('Até ${_until.format(context)}'),
                onTap: () => _pickHour(false),
              ),
            ],
          ],
          if (certificate) ...[
            TextField(controller: _cid, decoration: const InputDecoration(labelText: 'CID')),
            TextField(controller: _crm, decoration: const InputDecoration(labelText: 'CRM')),
            TextField(controller: _doctor, decoration: const InputDecoration(labelText: 'Nome do médico')),
            const SizedBox(height: 8),
            OutlinedButton(onPressed: _pickPhoto, child: Text(_photo == null ? 'Foto do atestado (opcional)' : 'Foto selecionada')),
          ],
          TextField(controller: _note, decoration: const InputDecoration(labelText: 'Observação'), maxLines: 3),
          const SizedBox(height: 12),
          FilledButton(onPressed: _submit, child: const Text('Enviar solicitação')),
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
                  ? TextButton(onPressed: () => _cancel(item['id'] as int), child: const Text('Cancelar'))
                  : null,
            );
          }),
          if (_items.isEmpty) const Text('Nenhuma solicitação.'),
        ],
      ),
    );
  }
}
