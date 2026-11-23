import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import 'punch_clock.dart';

class PunchReminders {
  PunchReminders({FlutterLocalNotificationsPlugin? plugin}) : _plugin = plugin ?? FlutterLocalNotificationsPlugin();

  static final instance = PunchReminders();

  final FlutterLocalNotificationsPlugin _plugin;
  var _ready = false;
  var _askedExact = false;

  static const _channel = AndroidNotificationDetails(
    'punch_reminder',
    'Lembrete de ponto',
    channelDescription: 'Aviso dois minutos antes de cada marcação da escala.',
    importance: Importance.max,
    priority: Priority.max,
  );

  Future<void> prepare() async {
    if (_ready) {
      return;
    }
    tzdata.initializeTimeZones();
    tz.setLocalLocation(tz.getLocation('America/Sao_Paulo'));
    await _plugin.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
    );
    _ready = true;
  }

  Future<void> sync({
    required Map<String, dynamic> journey,
    required DateTime anchor,
    required int cycleDay,
  }) async {
    try {
      await _sync(journey: journey, anchor: anchor, cycleDay: cycleDay);
    } catch (_) {
      return;
    }
  }

  Future<void> _sync({
    required Map<String, dynamic> journey,
    required DateTime anchor,
    required int cycleDay,
  }) async {
    await prepare();
    final now = tz.TZDateTime.now(tz.local);
    final reminders = punchReminders(
      kind: '${journey['kind'] ?? ''}',
      days: daysFromJourney(journey),
      anchor: anchor,
      cycleDay: cycleDay,
      now: DateTime(now.year, now.month, now.day, now.hour, now.minute, now.second),
    );
    await _plugin.cancelAll();
    if (reminders.isEmpty) {
      return;
    }
    await _permit();
    final mode = await _scheduleMode();
    for (var index = 0; index < reminders.length; index++) {
      final item = reminders[index];
      await _plugin.zonedSchedule(
        id: index + 1,
        title: 'Registrar o ponto',
        body: 'Faltam 2 minutos para as ${item.clock}.',
        scheduledDate: tz.TZDateTime(tz.local, item.at.year, item.at.month, item.at.day, item.at.hour, item.at.minute),
        notificationDetails: const NotificationDetails(
          android: _channel,
          iOS: DarwinNotificationDetails(presentAlert: true, presentSound: true),
        ),
        androidScheduleMode: mode,
      );
    }
  }

  Future<void> clear() async {
    try {
      await prepare();
      await _plugin.cancelAll();
    } catch (_) {
      return;
    }
  }

  Future<void> _permit() async {
    final android = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    await android?.requestNotificationsPermission();
    await _plugin.resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()?.requestPermissions(alert: true, sound: true);
  }

  Future<AndroidScheduleMode> _scheduleMode() async {
    final android = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    if (android == null) {
      return AndroidScheduleMode.exactAllowWhileIdle;
    }
    if (await android.canScheduleExactNotifications() == true) {
      return AndroidScheduleMode.exactAllowWhileIdle;
    }
    if (!_askedExact) {
      _askedExact = true;
      await android.requestExactAlarmsPermission();
      if (await android.canScheduleExactNotifications() == true) {
        return AndroidScheduleMode.exactAllowWhileIdle;
      }
    }
    return AndroidScheduleMode.inexactAllowWhileIdle;
  }
}
