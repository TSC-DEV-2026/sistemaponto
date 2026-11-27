import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../data/network/dio_client.dart';
import '../../../../shared/providers/loader_provider.dart';
import '../../../../shared/widgets/busy_button.dart';
import '../../../../shared/widgets/panel_spinner.dart';
import '../../../../shared/widgets/punch_toast.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../data/clock_flow.dart';
import '../../data/format.dart';
import '../../data/page_items.dart';
import '../../data/punch_reminders.dart';
import 'face_camera_screen.dart';
import 'qr_punch_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen>
    with SingleTickerProviderStateMixin {
  static const _tabs = [
    ('registro', 'Registro'),
    ('apuracao', 'Apuração do mês'),
    ('marcacoes', 'Marcações'),
    ('banco', 'Banco de horas'),
  ];

  static const _recentLimit = 5;

  late final TabController _tabController;
  Map<String, dynamic>? _employee;
  Map<String, dynamic>? _journey;
  Map<String, dynamic>? _bank;
  List<Map<String, dynamic>> _punches = [];
  List<Map<String, dynamic>> _recent = [];
  List<Map<String, dynamic>> _days = [];
  String _tab = 'registro';
  String? _profileError;
  String? _panelError;
  bool _profileLoading = true;
  bool _panelReady = true;
  bool _recentReady = false;
  bool _missing = false;
  int _panelTicket = 0;
  int _recentTicket = 0;
  int? _facePreparedFor;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    _tabController.addListener(_onTabTick);
    Future<void>.microtask(_load);
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabTick);
    _tabController.dispose();
    super.dispose();
  }

  void _onTabTick() {
    if (_tabController.indexIsChanging) {
      return;
    }
    final next = _tabs[_tabController.index].$1;
    if (next == _tab) {
      return;
    }
    _select(next);
  }

  Future<void> _load() async {
    final user = ref.read(authProvider).user;
    final personId = user?.personId;
    final tenantId = user?.activeTenant?.id;
    if (personId == null || tenantId == null) {
      if (!mounted) {
        return;
      }
      setState(() {
        _employee = null;
        _missing = false;
        _profileLoading = false;
        _profileError = user == null
            ? 'Sem conexão. A sessão continua neste aparelho.'
            : 'Seu acesso ainda não está ligado a um funcionário.';
      });
      return;
    }
    final store = ref.read(tokenStoreProvider);
    final cached = await store.readEmployee(tenantId);
    if (!mounted) {
      return;
    }
    if (cached != null) {
      setState(() {
        _employee = cached;
        _missing = false;
        _profileError = null;
      });
      _afterEmployee();
    }
    final client = ref.read(apiClientProvider);
    ref.read(loaderProvider.notifier).state = true;
    try {
      final people = await client.get(
        '/api/v1/employees',
        query: {'person_id': personId, 'limit': 1},
      );
      final rows = pageItems(people);
      if (!mounted) {
        return;
      }
      if (rows.isEmpty) {
        await store.forgetEmployee();
        if (!mounted) {
          return;
        }
        setState(() {
          _employee = null;
          _missing = true;
          _profileError = null;
        });
        return;
      }
      final employee = rows.first;
      await store.saveEmployee(tenantId, employee);
      if (!mounted) {
        return;
      }
      setState(() {
        _employee = employee;
        _missing = false;
        _profileError = null;
      });
      _afterEmployee();
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      if (_employee == null) {
        setState(() => _profileError = error.message);
      }
    } finally {
      if (mounted) {
        setState(() => _profileLoading = false);
      }
      ref.read(loaderProvider.notifier).state = false;
    }
  }

  void _afterEmployee() {
    unawaited(_loadJourney());
    unawaited(_loadRecent());
    final employee = _employee;
    if (employee == null) {
      return;
    }
    final id = _employeeId(employee);
    if ('${employee['clock_method'] ?? 'simple'}' != 'face' ||
        _facePreparedFor == id) {
      return;
    }
    _facePreparedFor = id;
    unawaited(_prepareFace());
  }

  Future<void> _loadRecent() async {
    final employee = _employee;
    if (employee == null) {
      return;
    }
    final ticket = ++_recentTicket;
    final client = ref.read(apiClientProvider);
    try {
      final page = await client.get(
        '/api/v1/punches',
        query: {
          'employee_id': _employeeId(employee),
          'limit': _recentLimit,
        },
      );
      if (!mounted || ticket != _recentTicket) {
        return;
      }
      setState(() {
        _recent = pageItems(page);
        _recentReady = true;
      });
    } on ApiException {
      if (mounted && ticket == _recentTicket) {
        setState(() => _recentReady = true);
      }
    }
  }

  Future<void> _loadJourney() async {
    final employee = _employee;
    if (employee == null) {
      return;
    }
    final client = ref.read(apiClientProvider);
    try {
      final page = await client.get(
        '/api/v1/employee-vigencies',
        query: {
          'employee_id': _employeeId(employee),
          'kind': 'journey',
          'limit': 20,
        },
      );
      if (!mounted) {
        return;
      }
      await _applyJourney(client, pageItems(page), DateTime.now());
    } on ApiException {
      if (mounted) {
        setState(() => _journey = null);
      }
    }
  }

  Future<void> _applyJourney(
    ApiClient client,
    List<Map<String, dynamic>> vigencies,
    DateTime today,
  ) async {
    Map<String, dynamic>? current;
    DateTime? currentFrom;
    final day = DateTime(today.year, today.month, today.day);
    for (final row in vigencies) {
      final from = DateTime.tryParse('${row['valid_from']}');
      final until = row['valid_to'] == null
          ? null
          : DateTime.tryParse('${row['valid_to']}');
      final open =
          from != null &&
          !from.isAfter(day) &&
          (until == null || !until.isBefore(day));
      if (open && (currentFrom == null || from.isAfter(currentFrom))) {
        current = row;
        currentFrom = from;
      }
    }
    final reference = current?['reference_id'];
    if (reference == null) {
      if (mounted) {
        setState(() => _journey = null);
      }
      unawaited(PunchReminders.instance.clear());
      return;
    }
    try {
      final journey = await client.get('/api/v1/journeys/$reference');
      if (!mounted) {
        return;
      }
      setState(() => _journey = journey);
      final cycle = current?['cycle_day'];
      final anchor = currentFrom ?? day;
      unawaited(
        PunchReminders.instance.sync(
          journey: journey,
          anchor: anchor,
          cycleDay: cycle is num ? cycle.toInt() : anchor.weekday,
        ),
      );
    } on ApiException {
      if (mounted) {
        setState(() => _journey = null);
      }
    }
  }

  Future<void> _prepareFace() async {
    final client = ref.read(apiClientProvider);
    final flow = ClockFlow(client);
    try {
      final sent = await flow.syncPending();
      if (sent > 0 && mounted) {
        showPunchToast(context, message: 'Marcações offline enviadas.', ok: true);
        unawaited(_loadRecent());
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

  Future<void> _loadPanel() async {
    final employee = _employee;
    final tab = _tab;
    if (employee == null || tab == 'registro') {
      return;
    }
    final ticket = ++_panelTicket;
    final client = ref.read(apiClientProvider);
    final id = _employeeId(employee);
    ref.read(loaderProvider.notifier).state = true;
    setState(() => _panelError = null);
    try {
      if (tab == 'apuracao') {
        final today = DateTime.now();
        final page = await client.get(
          '/api/v1/calculations',
          query: {
            'employee_id': id,
            'starts_on': dayStamp(monthStart(today)),
            'ends_on': dayStamp(monthEnd(today)),
          },
        );
        if (!mounted || ticket != _panelTicket) {
          return;
        }
        setState(() {
          _days = pageItems({'items': page['items']});
          _panelReady = true;
        });
      } else if (tab == 'marcacoes') {
        final page = await client.get(
          '/api/v1/punches',
          query: {'employee_id': id, 'limit': 100},
        );
        if (!mounted || ticket != _panelTicket) {
          return;
        }
        setState(() {
          _punches = pageItems(page);
          _panelReady = true;
        });
      } else if (tab == 'banco') {
        final bank = await client.get(
          '/api/v1/hour-bank',
          query: {'employee_id': id},
        );
        if (!mounted || ticket != _panelTicket) {
          return;
        }
        setState(() {
          _bank = bank;
          _panelReady = true;
        });
      }
    } on ApiException catch (error) {
      if (mounted && ticket == _panelTicket) {
        setState(() => _panelError = error.message);
      }
    } finally {
      if (ticket == _panelTicket) {
        ref.read(loaderProvider.notifier).state = false;
      }
    }
  }

  void _select(String tab) {
    setState(() {
      _tab = tab;
      _panelError = null;
      _panelReady = tab == 'registro';
    });
    if (tab == 'registro') {
      unawaited(_loadJourney());
      unawaited(_loadRecent());
      return;
    }
    unawaited(_loadPanel());
  }

  Future<void> _punchSimple() async {
    final employee = _employee;
    if (employee == null) {
      return;
    }
    final client = ref.read(apiClientProvider);
    ref.read(loaderProvider.notifier).state = true;
    try {
      await client.post('/api/v1/punches', {
        'employee_id': _employeeId(employee),
        'occurred_at': DateTime.now().toUtc().toIso8601String(),
        'note': null,
      });
      if (mounted) {
        showPunchToast(context, message: 'Marcação registrada.', ok: true);
        unawaited(_loadRecent());
      }
    } on ApiException catch (error) {
      if (mounted) {
        showPunchToast(context, message: error.message, ok: false);
      }
    } finally {
      ref.read(loaderProvider.notifier).state = false;
    }
  }

  Future<void> _openQr() async {
    final employee = _employee;
    if (employee == null) {
      return;
    }
    final result = await Navigator.of(context, rootNavigator: true)
        .push<PunchResult>(
          MaterialPageRoute(
            builder: (_) => QrPunchScreen(employeeId: _employeeId(employee)),
          ),
        );
    if (result == null || !mounted) {
      return;
    }
    showPunchToast(context, message: result.message, ok: result.ok, stored: result.stored);
    if (result.ok) {
      unawaited(_loadRecent());
    }
  }

  Future<void> _openFace() async {
    final employee = _employee;
    if (employee == null) {
      return;
    }
    final path = await Navigator.of(
      context,
      rootNavigator: true,
    ).push<String>(MaterialPageRoute(builder: (_) => const FaceCameraScreen()));
    if (path == null || !mounted) {
      return;
    }
    final client = ref.read(apiClientProvider);
    ref.read(loaderProvider.notifier).state = true;
    try {
      final result = await ClockFlow(
        client,
      ).punchFace(employeeId: _employeeId(employee), imagePath: path);
      if (mounted) {
        showPunchToast(context, message: result.message, ok: result.ok, stored: result.stored);
        if (result.ok) {
          unawaited(_loadRecent());
        }
      }
    } on ApiException catch (error) {
      if (mounted) {
        showPunchToast(context, message: error.message, ok: false);
      }
    } finally {
      ref.read(loaderProvider.notifier).state = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authProvider, (previous, next) {
      if (previous == null) {
        return;
      }
      final samePerson = previous.user?.personId == next.user?.personId;
      final sameTenant =
          previous.user?.activeTenant?.id == next.user?.activeTenant?.id;
      if (!samePerson || !sameTenant) {
        _facePreparedFor = null;
        _load();
      }
    });
    final employee = _employee;
    return SafeArea(
      top: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TabBar(
            controller: _tabController,
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            labelColor: BrandColors.cta,
            unselectedLabelColor: BrandColors.quiet,
            indicatorColor: BrandColors.cta,
            labelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            unselectedLabelStyle: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
            tabs: [for (final tab in _tabs) Tab(text: tab.$2)],
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                if (_missing)
                  const Text('Seu acesso ainda não está ligado a um funcionário.')
                else if (employee == null && _profileLoading)
                  const PanelSpinner()
                else if (employee == null)
                  Text(
                    _profileError ??
                        'Sem conexão. A sessão continua neste aparelho.',
                  )
                else if (_tab == 'registro')
                  _registro(employee)
                else if (_panelError != null)
                  Text(
                    _panelError!,
                    style: TextStyle(color: Theme.of(context).colorScheme.error),
                  )
                else if (!_panelReady)
                  const PanelSpinner()
                else if (_tab == 'apuracao')
                  ..._days.map(_dayTile)
                else if (_tab == 'marcacoes')
                  ..._marcacoes()
                else
                  _banco(employee),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _registro(Map<String, dynamic> employee) {
    final dismissed = employee['situation'] == 'dismissed';
    final method = '${employee['clock_method'] ?? 'simple'}';
    if (!_recentReady) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _tab == 'registro' && !_recentReady) {
          unawaited(_loadRecent());
        }
      });
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('${employee['full_name']}'),
        Text(
          'Situação: ${employee['situation'] == 'dismissed' ? 'Desligado' : 'Ativo'}',
        ),
        Text('Jornada: ${employee['journey_label'] ?? 'Sem jornada vigente'}'),
        if (employee['unit_label'] != null)
          Text('Empresa: ${employee['unit_label']}'),
        if (_journey != null) Text(_journeyLine(_journey!)),
        const SizedBox(height: 16),
        Text('Registro: ${_clockLabel(method)}'),
        const SizedBox(height: 8),
        _clockButton(dismissed, method),
        const SizedBox(height: 24),
        Text(
          'Últimos registros',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        if (!_recentReady)
          const PanelSpinner()
        else if (_recent.isEmpty)
          const Text('Nenhum registro ainda.')
        else
          for (final punch in _recent) _punchTile(punch),
      ],
    );
  }

  Widget _banco(Map<String, dynamic> employee) {
    if (employee['hour_bank'] != true) {
      return const Text('Este cadastro não usa banco de horas.');
    }
    final bank = _bank;
    if (bank == null) {
      return const SizedBox.shrink();
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Saldo ${showMinutes(bank['balance_minutes'])}'),
        Text(
          'Créditos ${showMinutes(bank['credit_minutes'])} · Débitos ${showMinutes(bank['debit_minutes'])}',
        ),
        if ('${bank['warning'] ?? ''}'.isNotEmpty) Text('${bank['warning']}'),
        const Text(
          'O adicional noturno fica separado do saldo.',
        ),
      ],
    );
  }

  List<Widget> _marcacoes() {
    final valid = _punches.where((punch) => punch['valid'] != false).toList();
    final old = _punches.where((punch) => punch['valid'] == false).toList();
    return [
      Text(
        'Marcações que valem',
        style: Theme.of(context).textTheme.titleMedium,
      ),
      const SizedBox(height: 8),
      ...valid.map(_punchTile),
      if (valid.isEmpty) const Text('Nenhuma marcação válida.'),
      const SizedBox(height: 16),
      Text('Histórico', style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 8),
      ...old.map(_punchTile),
      if (old.isEmpty) const Text('Nenhuma marcação antiga.'),
    ];
  }

  Widget _clockButton(bool dismissed, String method) {
    if (method == 'qr') {
      return BusyButton(
        onPressed: dismissed ? null : _openQr,
        label: 'Registrar com QR',
      );
    }
    if (method == 'face') {
      return BusyButton(
        onPressed: dismissed ? null : _openFace,
        label: 'Registrar com o rosto',
      );
    }
    return BusyButton(
      onPressed: dismissed ? null : _punchSimple,
      label: 'Registrar marcação',
    );
  }

  Widget _dayTile(Map<String, dynamic> day) {
    final warnings = day['warnings'];
    final lines = warnings is List
        ? warnings
              .map((item) => '$item')
              .where((item) => item.isNotEmpty)
              .toList()
        : <String>[];
    final extra = <String>[
      if ((day['delay_minutes'] ?? 0) != 0)
        'Horas em atraso ${showMinutes(day['delay_minutes'])}',
      if ((day['overtime_minutes'] ?? 0) != 0)
        'H. extras ${showMinutes(day['overtime_minutes'])}',
      if ((day['shortage_minutes'] ?? 0) != 0)
        'Horas faltantes ${showMinutes(day['shortage_minutes'])}',
      if ((day['night_additional_minutes'] ?? 0) != 0)
        'Adicional noturno ${showMinutes(day['night_additional_minutes'])}',
      if (day['incomplete'] == true) 'Incompleto',
      if (day['absence'] == true) 'Falta',
      if (day['holiday'] == true) 'Feriado',
      ...lines,
    ];
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(showDay('${day['work_date']}')),
      subtitle: Text(
        'H. trabalhadas ${showMinutes(day['worked_minutes'])} · H. contratadas ${showMinutes(day['contracted_minutes'])}'
        '${extra.isEmpty ? '' : '\n${extra.join(' · ')}'}',
      ),
    );
  }

  Widget _punchTile(Map<String, dynamic> punch) {
    final valid = punch['valid'] != false;
    final source =
        punchSourceLabel['${punch['source']}'] ?? '${punch['source'] ?? ''}';
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(showWhen('${punch['occurred_at']}')),
      subtitle: Text(valid ? source : '$source · Não vale mais'),
    );
  }
}

int _employeeId(Map<String, dynamic> employee) {
  final id = employee['id'];
  if (id is int) {
    return id;
  }
  return (id as num).toInt();
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
  String piece(String key) => '${journey[key] ?? ''}'.substring(
    0,
    '${journey[key] ?? ''}'.length >= 5 ? 5 : '${journey[key] ?? ''}'.length,
  );
  return 'Escala ${piece('morning_start')}–${piece('morning_end')} e ${piece('afternoon_start')}–${piece('afternoon_end')}';
}
