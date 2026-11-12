import 'face_constants.dart';

enum BlinkPhase {
  /// Ambos os olhos abertos, estável.
  eyesOpen,

  /// Aguardando ambos os olhos fechados.
  blink,

  /// Aguardando ambos abrirem de novo.
  reopen,

  passed,
  failed,
}

class BlinkStepResult {
  const BlinkStepResult({
    required this.phase,
    this.failureMessage,
  });

  final BlinkPhase phase;
  final String? failureMessage;
}

/// Desafio ativo: piscar (fechar os dois olhos) e reabrir.
///
/// Usa `leftEyeOpenProbability` / `rightEyeOpenProbability` do ML Kit (0=fechado, 1=aberto).
/// Foto estática com olhos abertos não passa.
class BlinkChallenge {
  BlinkChallenge({
    this.closedMax = kEyeClosedProbabilityThreshold,
    this.openMin = kEyeOpenProbabilityMin,
    this.forwardHold = kLivenessForwardHold,
    this.blinkTimeout = kLivenessBlinkTimeout,
    this.reopenTimeout = kLivenessReopenTimeout,
  });

  final double closedMax;
  final double openMin;
  final Duration forwardHold;
  final Duration blinkTimeout;
  final Duration reopenTimeout;

  BlinkPhase phase = BlinkPhase.eyesOpen;
  DateTime? _openSince;
  DateTime? _blinkDeadline;
  DateTime? _reopenDeadline;
  String? failureMessage;

  /// Valor gravado em `liveness_challenge` (auditoria).
  String get apiChallenge => 'both';

  bool get isTerminal => phase == BlinkPhase.passed || phase == BlinkPhase.failed;

  BlinkStepResult update({
    required bool hasFace,
    required double? leftOpen,
    required double? rightOpen,
    DateTime? now,
  }) {
    final t = now ?? DateTime.now();

    if (phase == BlinkPhase.passed || phase == BlinkPhase.failed) {
      return BlinkStepResult(phase: phase, failureMessage: failureMessage);
    }

    if (!hasFace || leftOpen == null || rightOpen == null) {
      if (phase == BlinkPhase.eyesOpen) {
        _openSince = null;
      }
      return BlinkStepResult(phase: phase);
    }

    final bothOpen = leftOpen >= openMin && rightOpen >= openMin;
    final bothClosed = leftOpen <= closedMax && rightOpen <= closedMax;

    switch (phase) {
      case BlinkPhase.eyesOpen:
        if (bothOpen) {
          _openSince ??= t;
          if (t.difference(_openSince!) >= forwardHold) {
            phase = BlinkPhase.blink;
            _blinkDeadline = t.add(blinkTimeout);
          }
        } else {
          _openSince = null;
        }
        break;

      case BlinkPhase.blink:
        if (_blinkDeadline != null && t.isAfter(_blinkDeadline!)) {
          phase = BlinkPhase.failed;
          failureMessage = 'Não detectamos o piscar a tempo. Tente de novo.';
          break;
        }
        if (bothClosed) {
          phase = BlinkPhase.reopen;
          _reopenDeadline = t.add(reopenTimeout);
        }
        break;

      case BlinkPhase.reopen:
        if (_reopenDeadline != null && t.isAfter(_reopenDeadline!)) {
          phase = BlinkPhase.failed;
          failureMessage = 'Abra os olhos de novo e tente novamente.';
          break;
        }
        if (bothOpen) {
          phase = BlinkPhase.passed;
        }
        break;

      case BlinkPhase.passed:
      case BlinkPhase.failed:
        break;
    }

    return BlinkStepResult(phase: phase, failureMessage: failureMessage);
  }

  String instructionForPhase() {
    switch (phase) {
      case BlinkPhase.eyesOpen:
        return 'Olhe de frente com os olhos abertos';
      case BlinkPhase.blink:
        return 'Feche os dois olhos';
      case BlinkPhase.reopen:
        return 'Agora abra os olhos';
      case BlinkPhase.passed:
        return 'Pronto — capturando...';
      case BlinkPhase.failed:
        return failureMessage ?? 'Desafio falhou';
    }
  }
}
