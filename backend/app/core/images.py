import base64
import binascii

from app.core.exceptions import AppError

MAX_IMAGE_BYTES = 2 * 1024 * 1024
_JPEG = b"\xff\xd8\xff"
_PNG = b"\x89PNG\r\n\x1a\n"


def decode_image(value: str, *, message: str) -> bytes:
    raw = str(value or "").strip()
    if raw.startswith("data:"):
        parts = raw.split(",", 1)
        raw = parts[1] if len(parts) == 2 else ""
    try:
        data = base64.b64decode(raw, validate=True)
    except (binascii.Error, ValueError):
        raise AppError(400, message) from None
    if not data or len(data) > MAX_IMAGE_BYTES:
        raise AppError(400, message)
    if not data.startswith(_JPEG) and not data.startswith(_PNG):
        raise AppError(400, message)
    return data


def image_content_type(data: bytes) -> str:
    if data.startswith(_JPEG):
        return "image/jpeg"
    if data.startswith(_PNG):
        return "image/png"
    raise AppError(400, "A foto não foi aceita.")
