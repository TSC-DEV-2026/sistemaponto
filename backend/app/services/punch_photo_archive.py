from sqlalchemy import or_

from app.core.workforce import BR
from app.db.session import SessionLocal
from app.models.workforce import Punch
from app.services.storage_service import StorageService


def archive_existing_punch_photos(db, storage: StorageService | None = None) -> int:
    files = storage or StorageService()
    rows = (
        db.query(Punch)
        .filter(or_(Punch.qr_image.isnot(None), Punch.selfie_image.isnot(None), Punch.face_image.isnot(None)))
        .all()
    )
    moved = 0
    for row in rows:
        day = row.occurred_at.astimezone(BR).date()
        changed = False
        for blob_name, key_name in (("qr_image", "qr_key"), ("selfie_image", "selfie_key"), ("face_image", "face_key")):
            blob = getattr(row, blob_name)
            if not blob:
                continue
            if not getattr(row, key_name):
                setattr(row, key_name, files.save_punch(day, blob))
            setattr(row, blob_name, None)
            changed = True
        if changed:
            db.add(row)
            db.commit()
            moved += 1
    return moved


def main() -> None:
    db = SessionLocal()
    try:
        moved = archive_existing_punch_photos(db)
        print(f"marcações copiadas: {moved}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
