import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../../core/theme/app_theme.dart';

class QrFitScanner extends StatefulWidget {
  const QrFitScanner({required this.controller, required this.onDetect, super.key});

  final MobileScannerController controller;
  final void Function(BarcodeCapture capture) onDetect;

  @override
  State<QrFitScanner> createState() => _QrFitScannerState();
}

class _QrFitScannerState extends State<QrFitScanner> {
  Timer? _wait;
  BarcodeCapture? _latest;
  bool _sent = false;

  void _hold(BarcodeCapture capture) {
    if (_sent) {
      return;
    }
    final code = capture.barcodes.map((item) => item.rawValue).whereType<String>().firstWhere((item) => item.trim().isNotEmpty, orElse: () => '');
    if (code.isEmpty || capture.image == null) {
      return;
    }
    _latest = capture;
    _wait ??= Timer(const Duration(seconds: 1), () {
      final latest = _latest;
      if (!mounted || _sent || latest == null) {
        return;
      }
      _sent = true;
      widget.onDetect(latest);
    });
  }

  @override
  void dispose() {
    _wait?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 360,
      width: double.infinity,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final side = math.min(constraints.maxWidth, constraints.maxHeight) * 0.62;
          final window = Rect.fromCenter(
            center: Offset(constraints.maxWidth / 2, constraints.maxHeight / 2),
            width: side,
            height: side,
          );
          return ClipRRect(
            borderRadius: const BorderRadius.all(Radius.circular(10)),
            child: MobileScanner(
              controller: widget.controller,
              scanWindow: window,
              onDetect: _hold,
              overlayBuilder: (context, overlayConstraints) {
                return SizedBox(
                  width: overlayConstraints.maxWidth,
                  height: overlayConstraints.maxHeight,
                  child: Stack(
                    children: [
                      CustomPaint(
                        size: Size(overlayConstraints.maxWidth, overlayConstraints.maxHeight),
                        painter: _QrFitPainter(window: window),
                      ),
                      Positioned(
                        top: 8,
                        right: 8,
                        child: ValueListenableBuilder(
                          valueListenable: widget.controller,
                          builder: (context, state, _) {
                            final count = state.availableCameras;
                            if (count != null && count < 2) {
                              return const SizedBox.shrink();
                            }
                            return TextButton.icon(
                              onPressed: () async {
                                try {
                                  await widget.controller.switchCamera();
                                } catch (_) {}
                              },
                              icon: const Icon(LucideIcons.switchCamera, color: BrandColors.white),
                              label: const Text('Trocar câmera', style: TextStyle(color: BrandColors.white)),
                            );
                          },
                        ),
                      ),
                      Positioned(
                        left: 12,
                        right: 12,
                        top: math.min(window.bottom + 10, overlayConstraints.maxHeight - 28),
                        child: const Text(
                          'Encaixe o QR Code',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: BrandColors.white, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _QrFitPainter extends CustomPainter {
  const _QrFitPainter({required this.window});

  final Rect window;

  @override
  void paint(Canvas canvas, Size size) {
    final cutout = RRect.fromRectAndRadius(window, const Radius.circular(12));
    canvas
      ..saveLayer(Offset.zero & size, Paint())
      ..drawRect(Offset.zero & size, Paint()..color = BrandColors.ink.withValues(alpha: 0.55))
      ..drawRRect(cutout, Paint()..blendMode = BlendMode.clear)
      ..restore()
      ..drawRRect(
        cutout,
        Paint()
          ..color = BrandColors.wordmark
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3,
      );
    const arm = 22.0;
    final corners = Paint()
      ..color = BrandColors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round;
    canvas
      ..drawLine(window.topLeft, window.topLeft + const Offset(arm, 0), corners)
      ..drawLine(window.topLeft, window.topLeft + const Offset(0, arm), corners)
      ..drawLine(window.topRight, window.topRight + const Offset(-arm, 0), corners)
      ..drawLine(window.topRight, window.topRight + const Offset(0, arm), corners)
      ..drawLine(window.bottomLeft, window.bottomLeft + const Offset(arm, 0), corners)
      ..drawLine(window.bottomLeft, window.bottomLeft + const Offset(0, -arm), corners)
      ..drawLine(window.bottomRight, window.bottomRight + const Offset(-arm, 0), corners)
      ..drawLine(window.bottomRight, window.bottomRight + const Offset(0, -arm), corners);
  }

  @override
  bool shouldRepaint(covariant _QrFitPainter oldDelegate) => oldDelegate.window != window;
}
