import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../../../shared/widgets/busy_button.dart';
import '../../../../shared/widgets/screen_back_button.dart';
import '../../data/clock_flow.dart';
import '../widgets/qr_fit_scanner.dart';
import 'selfie_camera_screen.dart';

class QrPunchScreen extends ConsumerStatefulWidget {
  const QrPunchScreen({required this.employeeId, super.key});

  final int employeeId;

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
      await ClockFlow(ref.read(apiClientProvider)).punchQr(
        employeeId: widget.employeeId,
        content: content,
        qrImage: qrImage,
        selfie: await File(selfie).readAsBytes(),
      );
      if (mounted) {
        Navigator.of(context).pop(
          const PunchResult(message: 'Marcação por QR registrada.', ok: true),
        );
      }
    } on ApiException catch (error) {
      if (mounted) {
        Navigator.of(
          context,
        ).pop(PunchResult(message: error.message, ok: false));
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
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(8, 0, 16, 0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Align(
                        alignment: Alignment.centerLeft,
                        heightFactor: 1,
                        child: ScreenBackButton(
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Material(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(12),
                        child: const Padding(
                          padding: EdgeInsets.all(16),
                          child: Text(
                            'Encaixe o QR Code no quadrado. Fora dele a leitura não entra. Em seguida a câmera pede a selfie.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ],
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
            const Text('QR lido. Agora tire a selfie.'),
            const SizedBox(height: 12),
            BusyButton(
              kind: BusyButtonKind.outlined,
              onPressed: _takeSelfie,
              label: _selfiePath == null ? 'Tirar selfie' : 'Selfie pronta',
            ),
            const SizedBox(height: 12),
            BusyButton(
              onPressed: _selfiePath == null ? null : _send,
              label: 'Registrar',
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
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
