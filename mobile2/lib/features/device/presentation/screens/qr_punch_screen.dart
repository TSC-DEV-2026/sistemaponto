import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../../shared/widgets/screen_back_button.dart';
import '../../providers/device_provider.dart';
import '../widgets/qr_fit_scanner.dart';
import 'selfie_camera_screen.dart';

class QrPunchResult {
  const QrPunchResult({
    required this.message,
    required this.ok,
    this.released = false,
  });

  final String message;
  final bool ok;
  final bool released;
}

class QrPunchScreen extends ConsumerStatefulWidget {
  const QrPunchScreen({super.key});

  @override
  ConsumerState<QrPunchScreen> createState() => _QrPunchScreenState();
}

class _QrPunchScreenState extends ConsumerState<QrPunchScreen> {
  final _scanner = MobileScannerController(returnImage: true);
  String? _content;
  Uint8List? _qrImage;
  String? _selfiePath;
  String? _error;
  bool _locked = false;

  @override
  void dispose() {
    _scanner.dispose();
    super.dispose();
  }

  Future<void> _freeCamera() async {
    try {
      await _scanner.stop();
    } catch (_) {}
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_locked || _content != null) {
      return;
    }
    final code = capture.barcodes
        .map((item) => item.rawValue)
        .whereType<String>()
        .firstWhere((item) => item.trim().isNotEmpty, orElse: () => '');
    final image = capture.image;
    if (code.isEmpty || image == null) {
      return;
    }
    await _freeCamera();
    if (!mounted) {
      return;
    }
    setState(() {
      _content = code.trim();
      _qrImage = image;
      _error = null;
    });
  }

  Future<void> _takeSelfie() async {
    setState(() => _error = null);
    try {
      await _freeCamera();
      await Future<void>.delayed(const Duration(milliseconds: 300));
      if (!mounted) {
        return;
      }
      final path = await Navigator.of(context).push<String>(
        MaterialPageRoute(builder: (_) => const SelfieCameraScreen()),
      );
      if (path != null && mounted) {
        setState(() => _selfiePath = path);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'A selfie não foi aceita.');
      }
    }
  }

  Future<void> _send() async {
    final content = _content;
    final qrImage = _qrImage;
    final selfie = _selfiePath;
    if (content == null || qrImage == null || selfie == null) {
      setState(() => _error = 'Fotografe o QR Code e a selfie.');
      return;
    }
    setState(() {
      _error = null;
      _locked = true;
    });
    try {
      await ref
          .read(deviceFlowProvider)
          .punchQr(
            content: content,
            qrImage: qrImage,
            selfie: await File(selfie).readAsBytes(),
          );
      if (mounted) {
        Navigator.of(context).pop(
          const QrPunchResult(message: 'Marcação por QR registrada.', ok: true),
        );
      }
    } on ApiException catch (error) {
      if (mounted) {
        Navigator.of(context).pop(
          QrPunchResult(
            message: error.message,
            ok: false,
            released: error.statusCode == 401,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final scanned = _content != null;
    if (!scanned) {
      return Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          fit: StackFit.expand,
          children: [
            QrFitScanner(controller: _scanner, onDetect: _onDetect),
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: SafeArea(
                bottom: false,
                child: Align(
                  alignment: Alignment.centerLeft,
                  heightFactor: 1,
                  child: ScreenBackButton(
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            ScreenBackButton(onPressed: () => Navigator.of(context).pop()),
            const SizedBox(height: 12),
            Text('QR Code', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            const Text(
              'QR lido. Agora tire a selfie. Sem internet a marcação não fica no aparelho.',
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: _locked ? null : _takeSelfie,
              child: Text(
                _selfiePath == null ? 'Tirar selfie' : 'Selfie pronta',
              ),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _locked ? null : _send,
              child: const Text('Registrar'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
