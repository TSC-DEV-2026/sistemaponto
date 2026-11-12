import logging
import re
import secrets
from datetime import timedelta

from sqlalchemy.exc import IntegrityError

from app.core.exceptions import AppError
from app.core.images import decode_image
from app.core.security import hash_secret, new_secret, utcnow
from app.models.workforce import ClockDevice, ClockDeviceGrant, ClockEnrollAttempt, ClockReleaseCode
from app.services.workforce_service import Scope

logger = logging.getLogger("sistemaponto.clock_device")

CODE_TTL = timedelta(minutes=10)
FAILURE_LIMIT = 5
CODE_LENGTH = 9
CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
PUBLIC_ID = re.compile(r"[A-Za-z0-9_-]{8,80}")


class ClockDeviceService:
    def __init__(self, repo, workforce, *, clock=utcnow) -> None:
        self.repo = repo
        self.workforce = workforce
        self.clock = clock

    def issue_code(self, scope: Scope) -> dict:
        self._admin(scope)
        self.workforce.assert_usable(scope)
        now = self.clock()
        for _ in range(8):
            raw = self._new_code()
            digest = hash_secret(raw)
            if self.repo.code_exists(digest):
                continue
            try:
                row = self.repo.add(
                    ClockReleaseCode(
                        tenant_id=scope.tenant_id,
                        code_hash=digest,
                        expires_at=now + CODE_TTL,
                        used_at=None,
                        created_by_person_id=scope.person_id,
                        created_at=now,
                    )
                )
            except IntegrityError:
                self.repo.abandon()
                continue
            logger.info("código de aparelho gerado tenant_id=%s", scope.tenant_id)
            return {"code": self._present(raw), "expires_at": row.expires_at}
        raise AppError(503, "Não foi possível gerar o código.")

    def enroll(self, public_id: str, code: str) -> dict:
        identity = self._public_id(public_id)
        now = self.clock()
        self._guard(identity, now)
        try:
            digits = self._normalize(code)
        except AppError:
            self._fail(identity, now)
            raise
        found = self.repo.unused_codes(hash_secret(digits), now)
        if len(found) != 1:
            self._fail(identity, now)
            raise AppError(400, "O código não foi aceito.")
        release = found[0]
        self.workforce.assert_usable(Scope(person_id=0, tenant_id=release.tenant_id, role="member"))
        device = self.repo.device_by_public_id(identity)
        if device is None:
            device = self.repo.add(ClockDevice(public_id=identity, created_at=now))
        key = new_secret()
        grant = self.repo.active_grant(device.id, release.tenant_id)
        if grant is None:
            grant = self.repo.add(
                ClockDeviceGrant(
                    device_id=device.id,
                    tenant_id=release.tenant_id,
                    token_hash=hash_secret(key),
                    created_at=now,
                    revoked_at=None,
                )
            )
        else:
            grant.token_hash = hash_secret(key)
        release.used_at = now
        logger.info("aparelho liberado public_id=%s tenant_id=%s", identity, release.tenant_id)
        return {
            "id": grant.id,
            "public_id": identity,
            "created_at": grant.created_at,
            "revoked_at": None,
            "tenant_id": release.tenant_id,
            "key": key,
        }

    def list_devices(self, scope: Scope, page: int, limit: int, public_id: str | None):
        self._admin(scope)
        self.workforce.assert_usable(scope)
        rows, total = self.repo.list_active_grants(scope.tenant_id, page, limit, self._filter_id(public_id))
        return [self._view(grant, device) for grant, device in rows], total

    def get_device(self, scope: Scope, grant_id: int) -> dict:
        self._admin(scope)
        self.workforce.assert_usable(scope)
        found = self.repo.get_active_grant(scope.tenant_id, grant_id)
        if found is None:
            raise AppError(404, "Aparelho não encontrado")
        return self._view(*found)

    def refuse_change(self, scope: Scope, grant_id: int) -> None:
        self.get_device(scope, grant_id)
        raise AppError(409, "Não há o que alterar neste aparelho.")

    def revoke(self, scope: Scope, grant_id: int) -> None:
        self._admin(scope)
        self.workforce.assert_usable(scope)
        found = self.repo.get_active_grant(scope.tenant_id, grant_id)
        if found is None:
            raise AppError(404, "Aparelho não encontrado")
        grant, _device = found
        grant.revoked_at = self.clock()
        grant.token_hash = hash_secret(new_secret())
        logger.info("aparelho revogado grant_id=%s tenant_id=%s", grant.id, scope.tenant_id)

    def methods(self, public_id: str, keys: list[str]) -> dict:
        grants = self._usable(public_id, keys)
        face = False
        qr = False
        tenants = []
        for grant in grants:
            flags = self.workforce.device_method_flags(grant.tenant_id)
            face = face or flags["face"]
            qr = qr or flags["qr"]
            tenants.append(grant.tenant_id)
        return {"face": face, "qr": qr, "tenant_ids": tenants}

    def embeddings(self, public_id: str, keys: list[str], page: int, limit: int):
        grants = self._usable(public_id, keys)
        ready = []
        for grant in grants:
            for item in self.workforce.device_embeddings(grant.tenant_id):
                ready.append(
                    {
                        "tenant_id": grant.tenant_id,
                        "employee_id": item["employee_id"],
                        "embedding": item["embedding"],
                        "model_name": item["model_name"],
                        "model_version": item["model_version"],
                        "threshold": item["threshold"],
                    }
                )
        start = (page - 1) * limit
        return ready[start : start + limit], len(ready)

    def punch_face(self, public_id: str, keys: list[str], data: dict) -> dict:
        image = decode_image(str(data.get("image") or ""), message="A foto não foi aceita.")
        grants = self._usable(public_id, keys)
        matches = []
        for grant in grants:
            employee_id = self.workforce.device_face_candidate(grant.tenant_id, image)
            if employee_id is not None:
                matches.append((grant, employee_id))
        if len(matches) != 1:
            if len(matches) > 1:
                raise AppError(400, "O rosto foi reconhecido em mais de uma empresa.")
            raise AppError(400, "O rosto não foi reconhecido.")
        grant, employee_id = matches[0]
        punch = self.workforce.commit_device_face(grant.tenant_id, employee_id, data, image)
        return {"tenant_id": grant.tenant_id, "punch": punch}

    def punch_qr(self, public_id: str, keys: list[str], data: dict) -> dict:
        content = str(data.get("content") or "").strip()
        qr_image = decode_image(str(data.get("qr_image") or ""), message="A foto do QR Code não foi aceita.")
        selfie = decode_image(str(data.get("selfie_image") or ""), message="A selfie não foi aceita.")
        grants = self._usable(public_id, keys)
        matches = []
        for grant in grants:
            for employee_id in self.workforce.device_qr_candidates(grant.tenant_id, content):
                matches.append((grant, employee_id))
        if len(matches) != 1:
            raise AppError(400, "O QR Code não foi aceito.")
        grant, employee_id = matches[0]
        punch = self.workforce.commit_device_qr(grant.tenant_id, employee_id, data, qr_image, selfie)
        return {"tenant_id": grant.tenant_id, "punch": punch}

    def _usable(self, public_id: str, keys: list[str]) -> list:
        identity = self._public_id(public_id)
        device = self.repo.device_by_public_id(identity)
        if device is None:
            raise AppError(401, "Aparelho não liberado.")
        presented = {hash_secret(key) for key in self._keys(keys)}
        grants = [
            grant
            for grant in self.repo.active_grants_for_device(device.id)
            if any(secrets.compare_digest(grant.token_hash, item) for item in presented)
        ]
        if not grants:
            raise AppError(401, "Aparelho não liberado.")
        usable = []
        blocked = None
        for grant in grants:
            try:
                self.workforce.assert_usable(Scope(person_id=0, tenant_id=grant.tenant_id, role="member"))
            except AppError as error:
                blocked = error
                continue
            usable.append(grant)
        if not usable:
            if blocked is not None:
                raise blocked
            raise AppError(401, "Aparelho não liberado.")
        return usable

    def _new_code(self) -> str:
        return "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))

    def _present(self, raw: str) -> str:
        return f"{raw[:3]} {raw[3:6]} {raw[6:]}"

    def _guard(self, public_id: str, now) -> None:
        if self.repo.recent_failures(public_id, now - CODE_TTL) >= FAILURE_LIMIT:
            raise AppError(400, "Tente de novo em alguns minutos.")

    def _fail(self, public_id: str, now) -> None:
        self.repo.add(ClockEnrollAttempt(public_id=public_id, failed_at=now))
        logger.info("código de aparelho recusado public_id=%s", public_id)

    def _view(self, grant, device) -> dict:
        return {
            "id": grant.id,
            "public_id": device.public_id,
            "created_at": grant.created_at,
            "revoked_at": grant.revoked_at,
        }

    def _admin(self, scope: Scope) -> None:
        if scope.role != "admin" or scope.tenant_id is None:
            raise AppError(403, "Sem permissão")

    def _public_id(self, value: str) -> str:
        text = str(value or "").strip()
        if PUBLIC_ID.fullmatch(text) is None:
            raise AppError(400, "Identificador do aparelho inválido.")
        return text

    def _filter_id(self, value: str | None) -> str | None:
        if value is None or not str(value).strip():
            return None
        return self._public_id(value)

    def _normalize(self, value: str) -> str:
        text = "".join(character for character in str(value or "").upper() if character not in " -")
        if len(text) != CODE_LENGTH or any(character not in CODE_ALPHABET for character in text):
            raise AppError(400, "O código não foi aceito.")
        return text

    def _keys(self, keys: list[str]) -> list[str]:
        clean = []
        for key in keys:
            text = str(key or "").strip()
            if not text:
                continue
            if len(text) > 200:
                raise AppError(401, "Aparelho não liberado.")
            clean.append(text)
        if not clean or len(clean) > 20:
            raise AppError(401, "Aparelho não liberado.")
        return clean
