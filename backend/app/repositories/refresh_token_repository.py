from datetime import datetime

from sqlalchemy.orm import Session

from app.models.refresh_token import RefreshToken


class RefreshTokenRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def save(
        self,
        *,
        person_id: int,
        token_hash: str,
        expires_at: datetime,
        auth_version: int,
    ) -> RefreshToken:
        row = RefreshToken(
            person_id=person_id,
            token_hash=token_hash,
            expires_at=expires_at,
            revoked=False,
            auth_version=auth_version,
        )
        self.db.add(row)
        self.db.flush()
        return row

    def get_by_hash(self, token_hash: str) -> RefreshToken | None:
        return self.db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).one_or_none()

    def revoke(self, row: RefreshToken) -> None:
        row.revoked = True
        self.db.add(row)
        self.db.flush()

    def revoke_all(self, person_id: int) -> None:
        rows = (
            self.db.query(RefreshToken)
            .filter(RefreshToken.person_id == person_id, RefreshToken.revoked.is_(False))
            .all()
        )
        for row in rows:
            row.revoked = True
            self.db.add(row)
        self.db.flush()
