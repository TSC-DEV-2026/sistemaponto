import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../../shared/providers/loader_provider.dart';
import '../../providers/device_provider.dart';
import 'face_camera_screen.dart';
import 'qr_punch_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  String _notice = '';
  bool _ok = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(_prepare);
  }

  Future<void> _prepare() async {
    ref.read(loaderProvider.notifier).state = true;
    try {
      await ref.read(deviceProvider.notifier).sync();
    } finally {
      if (mounted) {
        ref.read(loaderProvider.notifier).state = false;
      }
    }
  }

  Future<void> _face() async {
    final path = await Navigator.of(context).push<String>(MaterialPageRoute(builder: (_) => const FaceCameraScreen()));
    if (path == null || !mounted) {
      return;
    }
    ref.read(loaderProvider.notifier).state = true;
    try {
      final message = await ref.read(deviceFlowProvider).punchFace(path);
      setState(() {
        _notice = message;
        _ok = true;
      });
    } on ApiException catch (error) {
      if (error.statusCode == 401) {
        if (mounted) {
          ref.read(loaderProvider.notifier).state = false;
        }
        await ref.read(deviceProvider.notifier).release();
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _notice = error.message;
        _ok = false;
      });
    } finally {
      if (mounted) {
        ref.read(loaderProvider.notifier).state = false;
      }
    }
  }

  Future<void> _qr() async {
    final result = await Navigator.of(context).push<QrPunchResult>(MaterialPageRoute(builder: (_) => const QrPunchScreen()));
    if (result == null || !mounted) {
      return;
    }
    if (!result.ok && result.released) {
      await ref.read(deviceProvider.notifier).release();
      return;
    }
    setState(() {
      _notice = result.message;
      _ok = result.ok;
    });
  }

  @override
  Widget build(BuildContext context) {
    final device = ref.watch(deviceProvider);
    final companies = device.grants.length;
    final companyLabel = companies == 1 ? '1 empresa' : '$companies empresas';
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text('Registrar ponto', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text(companyLabel, style: Theme.of(context).textTheme.bodyMedium),
            if (_notice.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text(_notice, style: TextStyle(color: _ok ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: device.face ? _face : null,
              icon: const Icon(LucideIcons.scanFace),
              label: const Text('Reconhecimento facial'),
            ),
            if (!device.face) ...[
              const SizedBox(height: 8),
              Text('Nenhuma empresa deste aparelho usa reconhecimento facial.', style: Theme.of(context).textTheme.bodySmall),
            ],
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: device.qr ? _qr : null,
              icon: const Icon(LucideIcons.qrCode),
              label: const Text('QR Code'),
            ),
            if (!device.qr) ...[
              const SizedBox(height: 8),
              Text('Nenhuma empresa deste aparelho usa QR Code.', style: Theme.of(context).textTheme.bodySmall),
            ],
            const SizedBox(height: 24),
            TextButton(onPressed: () => context.go('/setup?adding=1'), child: const Text('Adicionar empresa')),
          ],
        ),
      ),
    );
  }
}
