from sqlalchemy.orm import Session

from app.core.journey_plan import ORIGIN, legacy_days
from app.core.workforce import COST_CENTER_CLASSIFICATION, REASON_KINDS, today_in_brazil
from app.models.workforce import (
    Classification,
    ClassificationValue,
    Job,
    Journey,
    JourneyDay,
    JourneySpan,
    JourneyVersion,
    LaborAgreement,
    LaborUnion,
    PunchRule,
    Reason,
    Sector,
    Team,
    Unit,
)

JOURNEY_NAME = "Jornada Padrão"
PUNCH_RULE_NOTE = "Tolerância de 10 minutos. Intervalo mínimo de 1 hora. Adicional noturno de 20% das 22:00 às 05:00."
REASON_NAMES = {
    "adjustment": "Ajuste padrão",
    "absence": "Falta padrão",
    "allowance": "Abono padrão",
    "certificate": "Atestado padrão",
}


def ensure_company_defaults(db: Session, tenant_id: int) -> None:
    _named(db, Job, tenant_id, "Cargo Padrão")
    _default_classification(db, tenant_id)
    unit = _named(db, Unit, tenant_id, "Unidade Padrão")
    sector = _named(db, Sector, tenant_id, "Setor Padrão", unit_id=unit.id)
    _named(db, Team, tenant_id, "Equipe Padrão", sector_id=sector.id)
    _named(
        db,
        Journey,
        tenant_id,
        JOURNEY_NAME,
        morning_start="08:00",
        morning_end="12:00",
        afternoon_start="13:30",
        afternoon_end="17:30",
        kind="programada",
        flexible=False,
        tolerance_minutes=10,
    )
    _ensure_journey_version(db, journey)
    union = _named(db, LaborUnion, tenant_id, "Sindicato Padrão")
    agreement = (
        db.query(LaborAgreement)
        .filter(LaborAgreement.tenant_id == tenant_id, LaborAgreement.name == "Convenção Padrão")
        .one_or_none()
    )
    if agreement is None:
        db.add(
            LaborAgreement(
                tenant_id=tenant_id,
                union_id=union.id,
                name="Convenção Padrão",
                valid_from=today_in_brazil(),
                valid_to=None,
                note=None,
            )
        )
        db.flush()
    _named(db, PunchRule, tenant_id, "Regra de ponto Padrão", note=PUNCH_RULE_NOTE)
    for kind in REASON_KINDS:
        found = (
            db.query(Reason)
            .filter(Reason.tenant_id == tenant_id, Reason.kind == kind, Reason.name == REASON_NAMES[kind])
            .one_or_none()
        )
        if found is None:
            db.add(Reason(tenant_id=tenant_id, kind=kind, name=REASON_NAMES[kind], active=True))
    db.flush()


def _ensure_journey_version(db: Session, journey: Journey) -> None:
    found = db.query(JourneyVersion).filter(JourneyVersion.journey_id == journey.id).first()
    if found is not None:
        return
    version = JourneyVersion(
        tenant_id=journey.tenant_id,
        journey_id=journey.id,
        valid_from=ORIGIN,
        kind="programada",
        flexible=False,
        tolerance_minutes=10,
        weekly_minutes=None,
    )
    db.add(version)
    db.flush()
    for day in legacy_days(journey.morning_start, journey.morning_end, journey.afternoon_start, journey.afternoon_end):
        stored = JourneyDay(tenant_id=journey.tenant_id, version_id=version.id, position=day.position, off=day.off)
        db.add(stored)
        db.flush()
        for index, span in enumerate(day.spans, start=1):
            db.add(
                JourneySpan(
                    tenant_id=journey.tenant_id,
                    day_id=stored.id,
                    position=index,
                    starts_at=span.starts_at,
                    ends_at=span.ends_at,
                )
            )
    db.flush()


def _default_classification(db: Session, tenant_id: int) -> None:
    found = (
        db.query(Classification)
        .filter(Classification.tenant_id == tenant_id, Classification.name == COST_CENTER_CLASSIFICATION)
        .one_or_none()
    )
    if found is None:
        found = Classification(tenant_id=tenant_id, name=COST_CENTER_CLASSIFICATION)
        db.add(found)
        db.flush()
    value = (
        db.query(ClassificationValue)
        .filter(
            ClassificationValue.classification_id == found.id,
            ClassificationValue.name == "Centro de custo Padrão",
        )
        .one_or_none()
    )
    if value is None:
        db.add(
            ClassificationValue(
                tenant_id=tenant_id,
                classification_id=found.id,
                name="Centro de custo Padrão",
            )
        )
        db.flush()


def _named(db: Session, model, tenant_id: int, name: str, **extra):
    found = db.query(model).filter(model.tenant_id == tenant_id, model.name == name).one_or_none()
    if found is not None:
        return found
    row = model(tenant_id=tenant_id, name=name, **extra)
    db.add(row)
    db.flush()
    return row
