/// Uma empresa reconhece: segue. Nenhuma ou mais de uma: a marcação não entra.
String? offlineFaceBlock(int hits) {
  if (hits <= 0) {
    return 'O rosto não foi reconhecido.';
  }
  if (hits > 1) {
    return 'O rosto foi reconhecido em mais de uma empresa.';
  }
  return null;
}
