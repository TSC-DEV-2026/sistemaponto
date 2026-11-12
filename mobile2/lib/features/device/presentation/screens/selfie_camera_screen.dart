import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:path_provider/path_provider.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/screen_back_button.dart';

class SelfieCameraScreen extends StatefulWidget {
  const SelfieCameraScreen({super.key});

  @override
  State<SelfieCameraScreen> createState() => _SelfieCameraScreenState();
}

class _SelfieCameraScreenState extends State<SelfieCameraScreen> {
  CameraController? _controller;
  CameraLensDirection _direction = CameraLensDirection.front;
  bool _canSwitch = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _open(_direction);
  }

  Future<void> _open(CameraLensDirection direction) async {
    if (_busy) {
      return;
    }
    setState(() => _busy = true);
    try {
      final cameras = await availableCameras();
      if (!mounted) {
        return;
      }
      if (cameras.isEmpty) {
        _leave('Nenhuma câmera encontrada.');
        return;
      }
      final hasFront = cameras.any((item) => item.lensDirection == CameraLensDirection.front);
      final hasBack = cameras.any((item) => item.lensDirection == CameraLensDirection.back);
      final camera = cameras.firstWhere((item) => item.lensDirection == direction, orElse: () => cameras.first);
      final previous = _controller;
      _controller = null;
      if (mounted) {
        setState(() {});
      }
      if (previous != null) {
        await previous.dispose();
      }
      final controller = CameraController(camera, ResolutionPreset.medium, enableAudio: false);
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      setState(() {
        _controller = controller;
        _direction = camera.lensDirection;
        _canSwitch = hasFront && hasBack;
      });
    } catch (_) {
      if (mounted) {
        _leave('Não foi possível abrir a câmera.');
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _switchCamera() async {
    final next = _direction == CameraLensDirection.front ? CameraLensDirection.back : CameraLensDirection.front;
    await _open(next);
  }

  Future<void> _take() async {
    final controller = _controller;
    if (controller == null || _busy || !controller.value.isInitialized) {
      return;
    }
    setState(() => _busy = true);
    try {
      final shot = await controller.takePicture();
      final dir = await getTemporaryDirectory();
      final path = '${dir.path}/selfie_${DateTime.now().millisecondsSinceEpoch}.jpg';
      await File(path).writeAsBytes(await shot.readAsBytes());
      if (mounted) {
        Navigator.of(context).pop(path);
      }
    } catch (_) {
      if (mounted) {
        _leave('A selfie não foi aceita.');
      }
    }
  }

  void _leave(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    Navigator.of(context).pop();
  }

  @override
  void dispose() {
    final controller = _controller;
    _controller = null;
    controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    final ready = controller != null && controller.value.isInitialized && !_busy;
    return Scaffold(
      backgroundColor: BrandColors.ink,
      body: controller == null || !controller.value.isInitialized
          ? const Center(child: CircularProgressIndicator())
          : Stack(
              fit: StackFit.expand,
              children: [
                ColoredBox(color: BrandColors.ink, child: Center(child: CameraPreview(controller))),
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ScreenBackButton(onPressed: () => Navigator.of(context).pop()),
                        const Spacer(),
                        FilledButton(onPressed: ready ? _take : null, child: const Text('Tirar selfie')),
                      ],
                    ),
                  ),
                ),
                if (_canSwitch)
                  Center(
                    child: IconButton(
                      onPressed: ready ? _switchCamera : null,
                      iconSize: 64,
                      tooltip: 'Trocar câmera',
                      icon: const Icon(LucideIcons.arrowDownUp, color: BrandColors.white, size: 64),
                    ),
                  ),
              ],
            ),
    );
  }
}
