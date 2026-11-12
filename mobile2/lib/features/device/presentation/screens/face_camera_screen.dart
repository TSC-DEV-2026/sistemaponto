import 'dart:async';
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:path_provider/path_provider.dart';

import '../../../../face/blink_challenge.dart';
import '../../../../face/camera_input_image.dart';
import '../../../../shared/widgets/screen_back_button.dart';

class FaceCameraScreen extends StatefulWidget {
  const FaceCameraScreen({super.key});

  @override
  State<FaceCameraScreen> createState() => _FaceCameraScreenState();
}

class _FaceCameraScreenState extends State<FaceCameraScreen> {
  CameraController? _controller;
  CameraDescription? _camera;
  late final FaceDetector _detector;
  late BlinkChallenge _challenge;
  bool _streamOn = false;
  bool _processing = false;
  bool _capturing = false;
  String _instruction = 'Abrindo câmera...';

  @override
  void initState() {
    super.initState();
    _detector = FaceDetector(
      options: FaceDetectorOptions(
        performanceMode: FaceDetectorMode.accurate,
        enableClassification: true,
      ),
    );
    _challenge = BlinkChallenge();
    _instruction = _challenge.instructionForPhase();
    unawaited(_open());
  }

  Future<void> _open() async {
    try {
      final cameras = await availableCameras();
      if (!mounted) {
        return;
      }
      if (cameras.isEmpty) {
        _leave('Nenhuma câmera encontrada.');
        return;
      }
      final camera = cameras.firstWhere(
        (item) => item.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );
      final controller = CameraController(
        camera,
        ResolutionPreset.medium,
        enableAudio: false,
        imageFormatGroup: Platform.isAndroid ? ImageFormatGroup.nv21 : ImageFormatGroup.bgra8888,
      );
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      setState(() {
        _controller = controller;
        _camera = camera;
      });
      await controller.startImageStream(_onFrame);
      _streamOn = true;
    } catch (_) {
      if (mounted) {
        _leave('Não foi possível abrir a câmera.');
      }
    }
  }

  Future<void> _onFrame(CameraImage image) async {
    if (_processing || _capturing || _challenge.isTerminal) {
      return;
    }
    final camera = _camera;
    final controller = _controller;
    if (camera == null || controller == null) {
      return;
    }
    _processing = true;
    try {
      final input = inputImageFromCameraImage(
        image: image,
        camera: camera,
        deviceOrientation: controller.value.deviceOrientation,
      );
      if (input == null) {
        return;
      }
      final faces = await _detector.processImage(input);
      var hasFace = false;
      double? leftOpen;
      double? rightOpen;
      if (faces.isNotEmpty) {
        var largest = faces.first;
        var best = _area(largest.boundingBox);
        for (final face in faces.skip(1)) {
          final area = _area(face.boundingBox);
          if (area > best) {
            best = area;
            largest = face;
          }
        }
        hasFace = true;
        leftOpen = largest.leftEyeOpenProbability;
        rightOpen = largest.rightEyeOpenProbability;
      }
      final step = _challenge.update(hasFace: hasFace, leftOpen: leftOpen, rightOpen: rightOpen);
      if (!mounted) {
        return;
      }
      setState(() => _instruction = _challenge.instructionForPhase());
      if (step.phase == BlinkPhase.passed) {
        await _capture();
      } else if (step.phase == BlinkPhase.failed) {
        _leave(step.failureMessage ?? 'Desafio falhou');
      }
    } finally {
      _processing = false;
    }
  }

  Future<void> _capture() async {
    if (_capturing) {
      return;
    }
    _capturing = true;
    final controller = _controller;
    if (controller == null) {
      return;
    }
    try {
      await _stop();
      await Future<void>.delayed(const Duration(milliseconds: 120));
      final shot = await controller.takePicture();
      final dir = await getTemporaryDirectory();
      final path = '${dir.path}/face_${DateTime.now().millisecondsSinceEpoch}.jpg';
      await File(path).writeAsBytes(await shot.readAsBytes());
      if (!mounted) {
        return;
      }
      Navigator.of(context).pop(path);
    } catch (_) {
      if (mounted) {
        _leave('Não foi possível capturar a foto.');
      }
    }
  }

  void _leave(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    Navigator.of(context).pop();
  }

  Future<void> _stop() async {
    final controller = _controller;
    if (controller == null || !_streamOn) {
      return;
    }
    try {
      await controller.stopImageStream();
    } catch (_) {}
    _streamOn = false;
  }

  double _area(Rect rect) => (rect.right - rect.left).abs() * (rect.bottom - rect.top).abs();

  @override
  void dispose() {
    final controller = _controller;
    _controller = null;
    if (controller != null) {
      unawaited(controller.dispose());
    }
    unawaited(_detector.close());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    return Scaffold(
      body: controller == null || !controller.value.isInitialized
          ? const Center(child: CircularProgressIndicator())
          : Stack(
              fit: StackFit.expand,
              children: [
                ColoredBox(color: Colors.black, child: Center(child: CameraPreview(controller))),
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        ScreenBackButton(onPressed: () => Navigator.of(context).pop()),
                        const SizedBox(height: 12),
                        Material(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Text(
                              _instruction,
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                if (_capturing) const ColoredBox(color: Color(0x66000000), child: Center(child: CircularProgressIndicator())),
              ],
            ),
    );
  }
}
