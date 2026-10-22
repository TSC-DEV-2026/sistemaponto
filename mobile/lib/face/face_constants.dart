/// Constantes compartilhadas com o backend InsightFace / ArcFace (buffalo_l).
library;

/// Tamanho de entrada do reconhecedor w600k_r50 (ArcFace 112).
const int kArcfaceInputSize = 112;

/// Normalização idêntica ao `cv2.dnn.blobFromImages(..., mean=127.5, std=127.5, swapRB=True)`
/// usada pelo ArcFaceONNX do InsightFace.
const double kArcfaceMean = 127.5;
const double kArcfaceStd = 127.5;

/// Dimensão do embedding w600k_r50.
const int kEmbeddingDim = 512;

/// Nome/versão do modelo de reconhecimento esperado localmente (deve bater com o backend).
/// Usado para detectar divergência de modelo em `/api/v1/sync/faces` (campos `model_name`/`model_version`).
const String kModelName = 'w600k_r50';
const String kModelVersion = 'buffalo_l';

/// Margem mínima entre a 1ª e a 2ª melhor similaridade cosseno para considerar o match confiável.
const double kDefaultMatchMargin = 0.05;

/// Liveness básico: rosto deve ocupar pelo menos essa fração do menor lado da imagem
/// (largura ou altura do bounding box vs. menor lado da foto).
const double kMinFaceFractionOfShorterSide = 0.20;

/// Liveness básico: abaixo disso, o olho é considerado "fechado" (probabilidade ML Kit [0,1]).
const double kEyeClosedProbabilityThreshold = 0.4;

/// Desafio de piscar: acima disso o olho conta como "aberto".
const double kEyeOpenProbabilityMin = 0.55;

/// Tempo mínimo com ambos os olhos abertos antes de pedir o piscar.
const Duration kLivenessForwardHold = Duration(milliseconds: 400);

/// Tempo máximo para completar o piscar (wink) pedido.
const Duration kLivenessBlinkTimeout = Duration(seconds: 8);

/// Tempo máximo para reabrir o olho após o piscar.
const Duration kLivenessReopenTimeout = Duration(seconds: 5);

/// Método de liveness gravado no ponto (auditoria).
const String kLivenessMethodEyeBlink = 'eye_blink';

/// Pontos de referência ArcFace (112x112), mesma ordem do `face_align.arcface_dst` (InsightFace).
final List<List<double>> kArcfaceReference112 = [
  [38.2946, 51.6963],
  [73.5318, 51.5014],
  [56.0252, 71.7366],
  [41.5493, 92.3655],
  [70.7299, 92.2041],
];
