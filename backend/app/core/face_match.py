COSINE_THRESHOLD = 0.40
MATCH_MARGIN = 0.05
EMBEDDING_DIM = 512
MODEL_NAME = "w600k_r50"
MODEL_VERSION = "buffalo_l"


def _dot(left: list[float], right: list[float]) -> float:
    return sum(a * b for a, b in zip(left, right))


def _norm(values: list[float]) -> float:
    return _dot(values, values) ** 0.5


def unit(values: list[float]) -> list[float]:
    if len(values) != EMBEDDING_DIM:
        raise ValueError("embedding inválido")
    size = _norm(values)
    if size <= 1e-12:
        raise ValueError("embedding inválido")
    return [item / size for item in values]


def cosine(left: list[float], right: list[float]) -> float:
    return _dot(unit(left), unit(right))


def match_one(
    query: list[float],
    stored: list[float],
    *,
    threshold: float = COSINE_THRESHOLD,
    query_unit: bool = False,
    stored_unit: bool = False,
) -> bool:
    left = query if query_unit else unit(query)
    right = stored if stored_unit else unit(stored)
    return _dot(left, right) >= threshold


def best_match(
    query: list[float],
    registry: list[tuple[int, list[float]]],
    *,
    threshold: float = COSINE_THRESHOLD,
    margin: float = MATCH_MARGIN,
    registry_unit: bool = False,
) -> int | None:
    if not registry:
        return None
    q = unit(query)
    if registry_unit:
        ranked = sorted(((_dot(q, vector), employee_id) for employee_id, vector in registry), reverse=True)
    else:
        ranked = sorted(((_dot(q, unit(vector)), employee_id) for employee_id, vector in registry), reverse=True)
    score, employee_id = ranked[0]
    if score < threshold:
        return None
    if len(ranked) > 1 and score - ranked[1][0] < margin:
        return None
    return employee_id
