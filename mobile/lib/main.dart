import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/app.dart';
import 'features/app/data/punch_reminders.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');
  final url = dotenv.env['API_URL'] ?? '';
  if (kReleaseMode && !url.startsWith('https://')) {
    throw StateError('API_URL em produção precisa de https');
  }
  await PunchReminders.instance.prepare();
  runApp(const ProviderScope(child: SistemapontoApp()));
}
