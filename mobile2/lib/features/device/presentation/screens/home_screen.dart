import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../../shared/providers/loader_provider.dart';
import '../../../../shared/widgets/punch_toast.dart';
import '../../providers/device_provider.dart';
import 'face_camera_screen.dart';
import 'qr_punch_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
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
      final result = await ref.read(deviceFlowProvider).punchFace(path);
      if (!mounted) {
        return;
      }
      showPunchToast(context, message: result.message, ok: result.ok, stored: result.stored);
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
      showPunchToast(context, message: error.message, ok: false);
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
    showPunchToast(context, message: result.message, ok: result.ok);
  }

  @override
  Widget build(BuildContext context) {
    final device = ref.watch(deviceProvider);
    final companies = device.grants.length;
    final companyLabel = companies == 1 ? '1 organização' : '$companies organizações';
    return SafeArea(
      top: false,
      child: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight > 48 ? constraints.maxHeight - 48 : 0),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Registrar ponto',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 8),
                      Text(companyLabel, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
                      const SizedBox(height: 24),
                      FilledButton.icon(
                        onPressed: device.face ? _face : null,
                        icon: const Icon(LucideIcons.scanFace),
                        label: const Text('Reconhecimento facial'),
                      ),
                      if (!device.face) ...[
                        const SizedBox(height: 8),
                        Text(
                          'Nenhuma organização deste aparelho usa reconhecimento facial.',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                      const SizedBox(height: 12),
                      FilledButton.icon(
                        onPressed: device.qr ? _qr : null,
                        icon: const Icon(LucideIcons.qrCode),
                        label: const Text('QR Code'),
                      ),
                      if (!device.qr) ...[
                        const SizedBox(height: 8),
                        Text(
                          'Nenhuma organização deste aparelho usa QR Code.',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
