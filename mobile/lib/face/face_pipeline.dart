import 'dart:io';

import 'package:image/image.dart' as img;

import 'arcface_alignment.dart';
import 'face_constants.dart';
import 'mlkit_face_detector.dart';
import 'onnx_embedder.dart';

/// Orquestra: ML Kit (5 pts + liveness básico) → alinhamento ArcFace 112 → ONNX w600k_r50 → L2.
///
/// Nota de alinhamento entre mobile e servidor: o **enrollment** (cadastro) das faces é
/// feito no backend usando o InsightFace completo (`det_10g` + `w600k_r50`, buffalo_l).
/// O **probe** (captura para ponto) aqui no app usa o detector ML Kit para os 5 pontos e o
/// mesmo modelo de embedding `w600k_r50` (ONNX), com o mesmo template `arcface_dst` de
/// alinhamento 112x112. Os detectores são diferentes (ML Kit vs. det_10g), então pequenas
/// diferenças de landmark são esperadas — por isso o app trata o resultado local como
/// **pré-filtro offline** (com margem de confiança) e, quando online, o servidor
/// **revalida** o ponto batendo a foto enviada contra o embedding oficial do InsightFace.
class FaceEmbeddingPipeline {
  FaceEmbeddingPipeline({required this.detector});

  final MlKitFaceLandmarks detector;

  static img.Image _ensureRgb3(img.Image im) {
    if (im.numChannels == 3) return im;
    return im.convert(numChannels: 3);
  }

  Future<List<double>> embedFromFile(String imagePath) async {
    final bytes = await File(imagePath).readAsBytes();
    final decoded = img.decodeImage(bytes);
    if (decoded == null) {
      throw StateError('Falha ao decodificar a imagem.');
    }
    final rgb = _ensureRgb3(decoded);

    final face = await detector.detectLargestFace(imagePath);
    _assertLiveness(face, imageWidth: rgb.width, imageHeight: rgb.height);

    final crop112 = ArcfaceAlignment.warp112(inputRgb: rgb, srcPts: face.points);
    return OnnxArcfaceEmbedder.instance.embedCrop112Rgb(crop112);
  }

  /// Checagens básicas de liveness/qualidade (sem modelo dedicado de anti-spoofing):
  /// rosto ausente (já tratado pelo detector), rosto pequeno demais na imagem, e
  /// ambos os olhos fechados (quando o ML Kit consegue classificar).
  void _assertLiveness(DetectedFaceData face, {required int imageWidth, required int imageHeight}) {
    final shorterSide = imageWidth < imageHeight ? imageWidth : imageHeight;
    final box = face.boundingBox;
    final faceW = (box.right - box.left).abs();
    final faceH = (box.bottom - box.top).abs();
    final faceShorterSide = faceW < faceH ? faceW : faceH;

    if (shorterSide > 0 && faceShorterSide < kMinFaceFractionOfShorterSide * shorterSide) {
      throw FaceLivenessException('Rosto muito pequeno na imagem. Aproxime-se da câmera.');
    }

    final leftOpen = face.leftEyeOpenProbability;
    final rightOpen = face.rightEyeOpenProbability;
    if (leftOpen != null &&
        rightOpen != null &&
        leftOpen < kEyeClosedProbabilityThreshold &&
        rightOpen < kEyeClosedProbabilityThreshold) {
      throw FaceLivenessException('Olhos fechados detectados. Abra os olhos e tente novamente.');
    }
  }
}
