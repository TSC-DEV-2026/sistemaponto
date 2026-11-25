from app.core.face_match import best_match, match_one, unit


def _basis(index: int) -> list[float]:
    vector = [0.0] * 512
    vector[index] = 1.0
    return vector


def test_comparacao_aceita_o_mesmo_rosto_e_recusa_outro():
    ana = _basis(0)
    assert best_match(ana, [(7, ana)]) == 7
    assert best_match(_basis(1), [(7, ana)]) is None
    assert best_match(ana, []) is None
    assert match_one(ana, ana) is True
    assert match_one(_basis(1), ana) is False
    normalized = unit(ana)
    assert best_match(ana, [(7, normalized)], registry_unit=True) == 7


def test_margem_recusa_dois_rostos_parecidos():
    ana = _basis(0)
    close = [0.0] * 512
    close[0] = 0.99
    close[1] = (1 - 0.99**2) ** 0.5
    assert best_match(ana, [(7, ana), (8, close)]) is None
