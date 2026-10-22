import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../../../shared/widgets/busy_button.dart';
import '../../../../shared/widgets/screen_back_button.dart';
import '../../data/clock_flow.dart';

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
  XFile? _selfieFile;
  String? _error;
  bool _locked = false;

  @override
  void dispose() {
    _scanner.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_locked || _content != null) {
      return;
    }
    final code = capture.barcodes.map((item) => item.rawValue).whereType<String>().firstWhere((item) => item.trim().isNotEmpty, orElse: () => '');
    final image = capture.image;
    if (code.isEmpty || image == null) {
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
      final shot = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 80);
      if (shot != null && mounted) {
        setState(() => _selfieFile = shot);
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
    final selfie = _selfieFile;
    if (content == null || qrImage == null || selfie == null) {
      setState(() => _error = 'Fotografe o QR Code e a selfie.');
      return;
    }
    setState(() => _error = null);
    try {
      await ClockFlow(ref.read(apiClientProvider)).punchQr(
        employeeId: widget.employeeId,
        content: content,
        qrImage: qrImage,
        selfie: await selfie.readAsBytes(),
      );
      if (mounted) {
        Navigator.of(context).pop('Marcação por QR registrada.');
      }
    } on ApiException catch (error) {
      if (mounted) {
        setState(() {
          _locked = false;
          _content = null;
          _qrImage = null;
          _selfieFile = null;
          _error = error.message;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final scanned = _content != null;
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            ScreenBackButton(onPressed: () => Navigator.of(context).pop()),
            const SizedBox(height: 12),
            Text('QR Code', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            const Text('Fotografe o código da sua unidade. Em seguida a câmera pede a selfie. Se a leitura falhar, nada é gravado e você tenta de novo.'),
            const SizedBox(height: 16),
            if (!scanned)
              SizedBox(
                height: 280,
                child: MobileScanner(controller: _scanner, onDetect: _onDetect),
              )
            else ...[
              const Text('QR lido. Agora tire a selfie.'),
              const SizedBox(height: 12),
              BusyButton(
                kind: BusyButtonKind.outlined,
                onPressed: _takeSelfie,
                label: _selfieFile == null ? 'Tirar selfie' : 'Selfie pronta',
              ),
              const SizedBox(height: 12),
              BusyButton(onPressed: _selfieFile == null ? null : _send, label: 'Registrar'),
            ],
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
          ],
        ),
      ),
    );
  }
}
