from datetime import datetime

from sqlalchemy.orm import Session

from app.models.workforce import ClockDevice, ClockDeviceGrant, ClockEnrollAttempt, ClockReleaseCode


class ClockDeviceRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, row):
        self.db.add(row)
        self.db.flush()
        return row

    def device_by_public_id(self, public_id: str) -> ClockDevice | None:
        return self.db.query(ClockDevice).filter(ClockDevice.public_id == public_id).one_or_none()

    def unused_codes(self, code_hash: str, now: datetime) -> list[ClockReleaseCode]:
        return (
            self.db.query(ClockReleaseCode)
            .filter(
                ClockReleaseCode.code_hash == code_hash,
                ClockReleaseCode.used_at.is_(None),
                ClockReleaseCode.expires_at > now,
            )
            .all()
        )

    def active_grants_for_device(self, device_id: int) -> list[ClockDeviceGrant]:
        return (
            self.db.query(ClockDeviceGrant)
            .filter(ClockDeviceGrant.device_id == device_id, ClockDeviceGrant.revoked_at.is_(None))
            .order_by(ClockDeviceGrant.id.asc())
            .all()
        )

    def active_grant(self, device_id: int, tenant_id: int) -> ClockDeviceGrant | None:
        return (
            self.db.query(ClockDeviceGrant)
            .filter(
                ClockDeviceGrant.device_id == device_id,
                ClockDeviceGrant.tenant_id == tenant_id,
                ClockDeviceGrant.revoked_at.is_(None),
            )
            .one_or_none()
        )

    def list_active_grants(self, tenant_id: int, page: int, limit: int, public_id: str | None):
        query = (
            self.db.query(ClockDeviceGrant, ClockDevice)
            .join(ClockDevice, ClockDevice.id == ClockDeviceGrant.device_id)
            .filter(ClockDeviceGrant.tenant_id == tenant_id, ClockDeviceGrant.revoked_at.is_(None))
        )
        if public_id:
            query = query.filter(ClockDevice.public_id == public_id)
        total = query.count()
        rows = (
            query.order_by(ClockDeviceGrant.id.desc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )
        return rows, total

    def get_active_grant(self, tenant_id: int, grant_id: int):
        return (
            self.db.query(ClockDeviceGrant, ClockDevice)
            .join(ClockDevice, ClockDevice.id == ClockDeviceGrant.device_id)
            .filter(
                ClockDeviceGrant.id == grant_id,
                ClockDeviceGrant.tenant_id == tenant_id,
                ClockDeviceGrant.revoked_at.is_(None),
            )
            .one_or_none()
        )

    def recent_failures(self, public_id: str, since: datetime) -> int:
        return (
            self.db.query(ClockEnrollAttempt)
            .filter(ClockEnrollAttempt.public_id == public_id, ClockEnrollAttempt.failed_at >= since)
            .count()
        )
