import logging
from uuid import uuid4

from app.core.config import settings
from app.core.exceptions import AppError

logger = logging.getLogger("base.storage")

MAX_BYTES = 10 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "application/pdf": "pdf",
    "text/plain": "txt",
    "application/zip": "zip",
}


def object_key(tenant_id: int, folder: str, extension: str) -> str:
    ext = extension.lower().lstrip(".")
    return f"{tenant_id}/{folder}/{uuid4().hex}.{ext}"


class StorageService:
    """Único ponto que fala com o Cloudflare R2. A tela de upload ainda não usa."""

    def validate_upload(self, content_type: str, size: int) -> str:
        extension = ALLOWED_CONTENT_TYPES.get(content_type)
        if extension is None:
            raise AppError(400, "Tipo de arquivo não permitido")
        if size < 1 or size > MAX_BYTES:
            raise AppError(400, "Tamanho de arquivo inválido")
        return extension

    def build_key(self, tenant_id: int, folder: str, content_type: str, size: int) -> str:
        extension = self.validate_upload(content_type, size)
        return object_key(tenant_id, folder, extension)

    def _client(self):
        if not settings.R2_BUCKET or not settings.R2_ENDPOINT or not settings.R2_ACCESS_KEY_ID:
            raise AppError(503, "Armazenamento não configurado")
        import boto3

        return boto3.client(
            "s3",
            endpoint_url=settings.R2_ENDPOINT,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name="auto",
        )

    def upload(self, *, tenant_id: int, folder: str, content_type: str, body: bytes) -> str:
        key = self.build_key(tenant_id, folder, content_type, len(body))
        self._client().put_object(Bucket=settings.R2_BUCKET, Key=key, Body=body, ContentType=content_type)
        logger.info("objeto gravado tenant_id=%s", tenant_id)
        return key

    def presign_get(self, key: str, expires_in: int = 60) -> str:
        return self._client().generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.R2_BUCKET, "Key": key},
            ExpiresIn=expires_in,
        )
