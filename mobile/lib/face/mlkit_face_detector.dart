import 'dart:ui' show Rect;

import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

/// Erro de liveness/qualidade básica (sem rosto, rosto pequeno, olhos fechados, etc.).
/// Mensagem já em português, pronta para exibir ao usuário.
class FaceLivenessException implements Exception {
  FaceLivenessException(this.message);
  final String message;

  @override
  String toString() => message;
}

/// Dados do maior rosto detectado: 5 pontos (ordem InsightFace/ArcFace), bounding box
/// (para checagem de tamanho) e probabilidades de olho aberto (para checagem de liveness).
class DetectedFaceData {
  const DetectedFaceData({
    required this.points,
    required this.boundingBox,
    this.leftEyeOpenProbability,
    this.rightEyeOpenProbability,
  });

  /// Ordem: [olho esq. da imagem, olho dir. da imagem, nariz, boca esq. da imagem, boca dir. da imagem]
  /// — mesma ordem/convenção do template `face_align.arcface_dst` (InsightFace), que é
  /// posicional na imagem (não anatômica do sujeito).
  final List<List<double>> points;
  final Rect boundingBox;

  /// Probabilidade [0,1] do **próprio** (anatômico) olho esquerdo/direito estar aberto.
  /// `null` quando a classificação não foi computada (ex.: rosto de perfil).
  final double? leftEyeOpenProbability;
  final double? rightEyeOpenProbability;
}

/// Pontos faciais ML Kit mapeados para a ordem InsightFace / ArcFace (5 pontos).
class MlKitFaceLandmarks {
  MlKitFaceLandmarks._(this.detector);
  final FaceDetector detector;

  factory MlKitFaceLandmarks.create() {
    final options = FaceDetectorOptions(
      performanceMode: FaceDetectorMode.accurate,
      enableLandmarks: true,
      enableContours: false,
      // Necessário para leftEyeOpenProbability/rightEyeOpenProbability (liveness básico).
      enableClassification: true,
    );
    return MlKitFaceLandmarks._(FaceDetector(options: options));
  }

  Future<void> close() => detector.close();

  /// Detecta o maior rosto e retorna pontos + bbox + probabilidades de olho aberto.
  /// Lança [FaceLivenessException] (mensagem em PT-BR) se não houver rosto ou se os
  /// landmarks necessários não puderem ser computados (ex.: rosto muito de perfil).
  Future<DetectedFaceData> detectLargestFace(String imagePath) async {
    final input = InputImage.fromFilePath(imagePath);
    final faces = await detector.processImage(input);
    if (faces.isEmpty) {
      throw FaceLivenessException('Nenhum rosto detectado. Posicione o rosto na câmera.');
    }

    Face largest = faces.first;
    var bestArea = _area(largest.boundingBox);
    for (final f in faces.skip(1)) {
      final a = _area(f.boundingBox);
      if (a > bestArea) {
        bestArea = a;
        largest = f;
      }
    }

    List<double>? p(FaceLandmarkType t) {
      final lm = largest.landmarks[t];
      if (lm == null) return null;
      return [lm.position.x.toDouble(), lm.position.y.toDouble()];
    }

    // ATENÇÃO à convenção: no ML Kit, `leftEye`/`rightEye`/`leftMouth`/`rightMouth` são
    // ANATÔMICOS (relativos ao sujeito), enquanto o template `arcface_dst` do InsightFace
    // usado no alinhamento (ver core/constants.dart) é POSICIONAL na imagem (o ponto
    // "esquerdo" é o que aparece à esquerda da imagem, não o olho esquerdo da pessoa).
    // Em uma foto frontal não espelhada, o olho anatômico direito do sujeito aparece à
    // esquerda da imagem — por isso o cruzamento abaixo (rightEye -> posição esquerda, etc.).
    final imageLeftEye = p(FaceLandmarkType.rightEye);
    final imageRightEye = p(FaceLandmarkType.leftEye);
    final nose = p(FaceLandmarkType.noseBase);
    final imageLeftMouth = p(FaceLandmarkType.rightMouth);
    final imageRightMouth = p(FaceLandmarkType.leftMouth);

    final pts = <List<double>?>[imageLeftEye, imageRightEye, nose, imageLeftMouth, imageRightMouth];
    if (pts.any((e) => e == null)) {
      throw FaceLivenessException(
        'Não foi possível localizar todos os pontos do rosto. Olhe de frente para a câmera.',
      );
    }

    return DetectedFaceData(
      points: pts.map((e) => e!).toList(growable: false),
      boundingBox: largest.boundingBox,
      leftEyeOpenProbability: largest.leftEyeOpenProbability,
      rightEyeOpenProbability: largest.rightEyeOpenProbability,
    );
  }

  static double _area(Rect r) {
    final w = (r.right - r.left).abs();
    final h = (r.bottom - r.top).abs();
    return w * h;
  }
}
