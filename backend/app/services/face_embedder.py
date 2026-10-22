import logging

from app.core.exceptions import AppError
from app.core.face_match import EMBEDDING_DIM, MODEL_VERSION

logger = logging.getLogger("sistemaponto.face")

_analysis = None


def embed_image(data: bytes) -> list[float]:
    """Extrai o embedding buffalo_l / w600k_r50. Falha sem gravar marcação."""
    try:
        import cv2
        import numpy as np
        from insightface.app import FaceAnalysis
    except ImportError:
        logger.exception("insightface indisponível")
        raise AppError(503, "Reconhecimento indisponível") from None
    array = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None or image.size == 0:
        raise AppError(400, "O rosto não foi reconhecido.")
    try:
        faces = _engine(FaceAnalysis).get(image)
    except Exception:
        logger.exception("falha ao ler o rosto")
        raise AppError(503, "Reconhecimento indisponível") from None
    if not faces:
        raise AppError(400, "O rosto não foi reconhecido.")
    face = max(faces, key=_area)
    vector = getattr(face, "normed_embedding", None)
    if vector is None:
        vector = getattr(face, "embedding", None)
    if vector is None:
        raise AppError(400, "O rosto não foi reconhecido.")
    values = [float(item) for item in vector]
    if len(values) != EMBEDDING_DIM:
        raise AppError(400, "O rosto não foi reconhecido.")
    return values


def _engine(face_analysis):
    global _analysis
    if _analysis is None:
        app = face_analysis(name=MODEL_VERSION, providers=["CPUExecutionProvider"])
        app.prepare(ctx_id=-1, det_size=(640, 640))
        _analysis = app
    return _analysis


def _area(face) -> float:
    box = list(face.bbox)[:4]
    return max(0.0, float(box[2]) - float(box[0])) * max(0.0, float(box[3]) - float(box[1]))
