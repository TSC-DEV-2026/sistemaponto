import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter/services.dart' show rootBundle;
import 'package:image/image.dart' as img;
import 'package:onnxruntime/onnxruntime.dart';

import 'face_constants.dart';

/// Inferência ONNX do reconhecedor `w600k_r50.onnx` (buffalo_l), com preprocess compatível ao ArcFaceONNX.
class OnnxArcfaceEmbedder {
  OnnxArcfaceEmbedder._();
  static final OnnxArcfaceEmbedder instance = OnnxArcfaceEmbedder._();

  OrtSession? _session;
  String? _inputName;

  Future<void> ensureLoaded() async {
    if (_session != null) return;

    OrtEnv.instance.init();
    final ByteData raw;
    try {
      raw = await rootBundle.load('assets/models/w600k_r50.onnx');
    } catch (_) {
      throw StateError('modelo ausente');
    }
    final bytes = raw.buffer.asUint8List();
    final opts = OrtSessionOptions();
    _session = OrtSession.fromBuffer(bytes, opts);
    _inputName = _session!.inputNames.isNotEmpty ? _session!.inputNames.first : 'input.1';
  }

  Future<void> close() async {
    _session?.release();
    _session = null;
  }

  /// `crop112Rgb`: 112x112 RGB (pós-alinhamento ArcFace).
  Future<List<double>> embedCrop112Rgb(img.Image crop112Rgb) async {
    if (crop112Rgb.width != kArcfaceInputSize || crop112Rgb.height != kArcfaceInputSize) {
      throw ArgumentError('O crop deve ser ${kArcfaceInputSize}x$kArcfaceInputSize.');
    }

    await ensureLoaded();
    final session = _session!;
    final inputName = _inputName!;

    final floats = Float32List(1 * 3 * kArcfaceInputSize * kArcfaceInputSize);
    var idx = 0;

    for (var c = 0; c < 3; c++) {
      for (var y = 0; y < kArcfaceInputSize; y++) {
        for (var x = 0; x < kArcfaceInputSize; x++) {
          final p = crop112Rgb.getPixel(x, y);
          final raw = switch (c) {
            0 => p.b,
            1 => p.g,
            _ => p.r,
          };
          floats[idx++] = (raw.toDouble() - kArcfaceMean) / kArcfaceStd;
        }
      }
    }

    final shape = [1, 3, kArcfaceInputSize, kArcfaceInputSize];
    final inputTensor = OrtValueTensor.createTensorWithDataList(floats, shape);
    final runOptions = OrtRunOptions();

    try {
      final outs = session.run(runOptions, {inputName: inputTensor});
      if (outs.isEmpty || outs.first == null) {
        throw StateError('Falha no reconhecimento. Tente novamente.');
      }
      final first = outs.first!;
      final vec = _flattenToDoubleList(first.value);
      for (final o in outs) {
        o?.release();
      }
      return _l2Normalize(vec);
    } finally {
      inputTensor.release();
      runOptions.release();
    }
  }

  static List<double> _flattenToDoubleList(dynamic v) {
    if (v is Float32List) {
      return v.map((e) => e.toDouble()).toList(growable: false);
    }
    if (v is Float64List) {
      return v.map((e) => e.toDouble()).toList(growable: false);
    }
    if (v is List) {
      return v.expand(_flattenToDoubleList).toList(growable: false);
    }
    if (v is num) {
      return [v.toDouble()];
    }
    throw StateError('Falha no reconhecimento. Tente novamente.');
  }

  static List<double> _l2Normalize(List<double> v) {
    var s = 0.0;
    for (final x in v) {
      s += x * x;
    }
    final n = s > 1e-12 ? 1.0 / math.sqrt(s) : 1.0;
    return v.map((e) => e * n).toList(growable: false);
  }
}
