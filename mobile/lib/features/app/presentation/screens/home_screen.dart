import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../../data/network/dio_client.dart';
import '../../../../shared/providers/loader_provider.dart';
import '../../../../shared/widgets/busy_button.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../data/clock_flow.dart';
import '../../data/format.dart';
import '../../data/page_items.dart';
import 'face_camera_screen.dart';
import 'qr_punch_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  Map<String, dynamic>? _employee;
  Map<String, dynamic>? _journey;
  Map<String, dynamic>? _bank;
  List<Map<String, dynamic>> _punches = [];
  List<Map<String, dynamic>> _days = [];
  String? _error;
  String? _message;
  bool _missing = false;

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(_load);
  }

  Future<void> _load() async {
    final personId = ref.read(authProvider).user?.personId;
    if (personId == null) {
      setState(() => _missing = true);
      return;
    }
    final client = ref.read(apiClientProvider);
    ref.read(loaderProvider.notifier).state = true;
    setState(() => _error = null);
    try {
      final people = await client.get('/api/v1/employees', query: {'person_id': personId, 'limit': 1});
      final rows = pageItems(people);
      if (rows.isEmpty) {
        setState(() {
          _employee = null;
          _missing = true;
        });
        return;
      }
      final employee = rows.first;
      final id = employee['id'];
      final today = DateTime.now();
      final results = await Future.wait([
        client.get('/api/v1/punches', query: {'employee_id': id, 'limit': 100}),
        client.get('/api/v1/time-results', query: {
          'employee_id': id,
          'starts_on': dayStamp(monthStart(today)),
          'ends_on': dayStamp(monthEnd(today)),
        }),
        client.get('/api/v1/hour-bank', query: {'employee_id': id}),
        client.get('/api/v1/employee-vigencies', query: {'employee_id': id, 'kind': 'journey', 'limit': 20}),
      ]);
      setState(() {
        _employee = employee;
        _missing = false;
        _punches = pageItems(results[0]);
        _days = pageItems({'items': results[1]['items']});
        _bank = results[2];
      });
      await _loadJourney(client, pageItems(results[3]), today);
      if ('${employee['clock_method'] ?? 'simple'}' == 'face') {
        await _prepareFace(client);
      }
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      ref.read(loaderProvider.notifier).state = false;
    }
  }

  Future<void> _loadJourney(ApiClient client, List<Map<String, dynamic>> vigencies, DateTime today) async {
    Map<String, dynamic>? current;
    DateTime? currentFrom;
    final day = DateTime(today.year, today.month, today.day);
    for (final row in vigencies) {
      final from = DateTime.tryParse('${row['valid_from']}');
      final until = row['valid_to'] == null ? null : DateTime.tryParse('${row['valid_to']}');
      final open = from != null && !from.isAfter(day) && (until == null || !until.isBefore(day));
      if (open && (currentFrom == null || from.isAfter(currentFrom))) {
        current = row;
        currentFrom = from;
      }
    }
    final reference = current?['reference_id'];
    if (reference == null) {
      setState(() => _journey = null);
      return;
    }
    try {
      final journey = await client.get('/api/v1/journeys/$reference');
      if (mounted) {
        setState(() => _journey = journey);
      }
    } on ApiException {
      if (mounted) {
        setState(() => _journey = null);
      }
    }
  }

  Future<void> _prepareFace(ApiClient client) async {
    final flow = ClockFlow(client);
    try {
      final sent = await flow.syncPending();
      if (sent > 0 && mounted) {
        setState(() => _message = 'Marcações offline enviadas.');
      }
    } on ApiException {
      return;
    }
    try {
      await flow.refreshFaces();
    } on ApiException {
      return;
    }
  }

  Future<void> _punchSimple() async {
    await _sendPunch('/api/v1/punches', {
      'employee_id': _employee!['id'],
      'occurred_at': DateTime.now().toUtc().toIso8601String(),
      'note': null,
    }, 'Marcação registrada.');
  }

  Future<void> _openQr() async {
    final message = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => QrPunchScreen(employeeId: _employee!['id'] as int)),
    );
    if (message == null || !mounted) {
      return;
    }
    setState(() => _message = message);
    await _load();
  }

  Future<void> _openFace() async {
    final path = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const FaceCameraScreen()),
    );
    if (path == null || !mounted) {
      return;
    }
    final client = ref.read(apiClientProvider);
    ref.read(loaderProvider.notifier).state = true;
    setState(() {
      _error = null;
      _message = null;
    });
    try {
      final message = await ClockFlow(client).punchFace(employeeId: _employee!['id'] as int, imagePath: path);
      setState(() => _message = message);
      await _load();
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      ref.read(loaderProvider.notifier).state = false;
    }
  }

  Future<void> _sendPunch(String path, Map<String, dynamic> body, String success) async {
    final client = ref.read(apiClientProvider);
    ref.read(loaderProvider.notifier).state = true;
    setState(() {
      _error = null;
      _message = null;
    });
    try {
      await client.post(path, body);
      setState(() => _message = success);
      await _load();
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      ref.read(loaderProvider.notifier).state = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final employee = _employee;
    final dismissed = employee?['situation'] == 'dismissed';
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text('Meu ponto', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          if (_missing)
            const Text('Seu acesso ainda não está ligado a um funcionário.')
          else if (employee != null) ...[
            Text('${employee['full_name']}'),
            Text('Situação: ${employee['situation'] == 'dismissed' ? 'Desligado' : 'Ativo'}'),
            Text('Jornada: ${employee['journey_label'] ?? 'Sem jornada vigente'}'),
            if (employee['unit_label'] != null) Text('Unidade: ${employee['unit_label']}'),
            if (_journey != null) Text(_journeyLine(_journey!)),
            const SizedBox(height: 16),
            Text('Registro: ${_clockLabel('${employee['clock_method'] ?? 'simple'}')}'),
            const SizedBox(height: 8),
            _clockButton(dismissed, '${employee['clock_method'] ?? 'simple'}'),
            const SizedBox(height: 24),
            Text('Banco de horas', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (employee['hour_bank'] == true && _bank != null) ...[
              Text('Saldo ${showMinutes(_bank!['balance_minutes'])}'),
              Text('Créditos ${showMinutes(_bank!['credit_minutes'])} · Débitos ${showMinutes(_bank!['debit_minutes'])}'),
              if ('${_bank!['warning'] ?? ''}'.isNotEmpty) Text('${_bank!['warning']}'),
              const Text('O adicional noturno fica separado do saldo. A quitação é feita na gestão.'),
            ] else
              const Text('Este cadastro não usa banco de horas.'),
            const SizedBox(height: 24),
            Text('Apuração do mês', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ..._days.map(_dayTile),
            const SizedBox(height: 16),
            Text('Marcações que valem', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ..._punches.where((punch) => punch['valid'] != false).map(_punchTile),
            if (_punches.every((punch) => punch['valid'] == false)) const Text('Nenhuma marcação válida.'),
            const SizedBox(height: 16),
            Text('Histórico', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ..._punches.where((punch) => punch['valid'] == false).map(_punchTile),
            if (_punches.every((punch) => punch['valid'] != false)) const Text('Nenhuma marcação antiga.'),
          ],
          if (_message != null) ...[
            const SizedBox(height: 16),
            Text(_message!),
          ],
          if (_error != null) ...[
            const SizedBox(height: 16),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
        ],
      ),
    );
  }

  Widget _clockButton(bool dismissed, String method) {
    if (method == 'qr') {
      return BusyButton(onPressed: dismissed ? null : _openQr, label: 'Registrar com QR');
    }
    if (method == 'face') {
      return BusyButton(onPressed: dismissed ? null : _openFace, label: 'Registrar com o rosto');
    }
    return BusyButton(onPressed: dismissed ? null : _punchSimple, label: 'Registrar marcação');
  }

  Widget _dayTile(Map<String, dynamic> day) {
    final warnings = day['warnings'];
    final lines = warnings is List ? warnings.map((item) => '$item').where((item) => item.isNotEmpty).toList() : <String>[];
    final extra = <String>[
      if ((day['delay_minutes'] ?? 0) != 0) 'Atraso ${showMinutes(day['delay_minutes'])}',
      if ((day['early_leave_minutes'] ?? 0) != 0) 'Saída antecipada ${showMinutes(day['early_leave_minutes'])}',
      if ((day['overtime_minutes'] ?? 0) != 0) 'Extra ${showMinutes(day['overtime_minutes'])}',
      if ((day['shortage_minutes'] ?? 0) != 0) 'Falta de horas ${showMinutes(day['shortage_minutes'])}',
      if ((day['night_additional_minutes'] ?? 0) != 0) 'Adicional noturno ${showMinutes(day['night_additional_minutes'])}',
      if (day['incomplete'] == true) 'Incompleto',
      if (day['absence'] == true) 'Falta',
      if (day['holiday'] == true) 'Feriado',
      ...lines,
    ];
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text('${day['work_date']}'),
      subtitle: Text(
        'Trabalhado ${showMinutes(day['worked_minutes'])} · Previsto ${showMinutes(day['expected_minutes'])}'
        '${extra.isEmpty ? '' : '\n${extra.join(' · ')}'}',
      ),
    );
  }

  Widget _punchTile(Map<String, dynamic> punch) {
    final valid = punch['valid'] != false;
    final source = punchSourceLabel['${punch['source']}'] ?? '${punch['source'] ?? ''}';
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(showWhen('${punch['occurred_at']}')),
      subtitle: Text(valid ? source : '$source · Não vale mais'),
    );
  }
}

String _clockLabel(String method) {
  if (method == 'qr') {
    return 'QR Code';
  }
  if (method == 'face') {
    return 'Reconhecimento facial';
  }
  return 'Simples';
}

String _journeyLine(Map<String, dynamic> journey) {
  String piece(String key) => '${journey[key] ?? ''}'.substring(0, '${journey[key] ?? ''}'.length >= 5 ? 5 : '${journey[key] ?? ''}'.length);
  return 'Escala ${piece('morning_start')}–${piece('morning_end')} e ${piece('afternoon_start')}–${piece('afternoon_end')}';
}
