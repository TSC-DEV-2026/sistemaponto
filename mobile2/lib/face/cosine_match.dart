class FaceSample {
  const FaceSample({required this.employeeId, required this.embedding});

  final int employeeId;
  final List<double> embedding;
}

/// Cosseno de vetores já normalizados. O match precisa ser o funcionário da sessão,
/// passar o limiar e a margem contra o segundo colocado.
int? matchEmployee({
  required List<double> query,
  required List<FaceSample> registry,
  required double threshold,
  double margin = 0.05,
}) {
  if (query.isEmpty || registry.isEmpty) {
    return null;
  }
  final bestByEmployee = <int, double>{};
  for (final sample in registry) {
    if (sample.embedding.length != query.length) {
      continue;
    }
    final score = _dot(query, sample.embedding);
    final current = bestByEmployee[sample.employeeId];
    if (current == null || score > current) {
      bestByEmployee[sample.employeeId] = score;
    }
  }
  if (bestByEmployee.isEmpty) {
    return null;
  }
  final ranked = bestByEmployee.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
  final best = ranked.first;
  if (best.value < threshold) {
    return null;
  }
  if (ranked.length > 1 && best.value - ranked[1].value < margin) {
    return null;
  }
  return best.key;
}

double _dot(List<double> left, List<double> right) {
  var total = 0.0;
  for (var index = 0; index < left.length; index++) {
    total += left[index] * right[index];
  }
  return total;
}
