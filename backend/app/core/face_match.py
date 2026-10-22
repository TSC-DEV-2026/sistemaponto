COSINE_THRESHOLD = 0.40
MATCH_MARGIN = 0.05
EMBEDDING_DIM = 512
MODEL_NAME = "w600k_r50"
MODEL_VERSION = "buffalo_l"


def _dot(left: list[float], right: list[float]) -> float:
    return sum(a * b for a, b in zip(left, right))


def _norm(values: list[float]) -> float:
    return _dot(values, values) ** 0.5


def _unit(values: list[float]) -> list[float]:
    if len(values) != EMBEDDING_DIM:
        raise ValueError("embedding inválido")
    size = _norm(values)
    if size <= 1e-12:
        raise ValueError("embedding inválido")
    return [item / size for item in values]


def cosine(left: list[float], right: list[float]) -> float:
    a = _unit(left)
    b = _unit(right)
    return _dot(a, b)


def best_match(
    query: list[float],
    registry: list[tuple[int, list[float]]],
    *,
    threshold: float = COSINE_THRESHOLD,
    margin: float = MATCH_MARGIN,
) -> int | None:
    if not registry:
        return None
    ranked = sorted(((cosine(query, vector), employee_id) for employee_id, vector in registry), reverse=True)
    score, employee_id = ranked[0]
    if score < threshold:
        return None
    if len(ranked) > 1 and score - ranked[1][0] < margin:
        return None
    return employee_id
