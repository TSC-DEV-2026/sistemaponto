from pydantic import BaseModel

from app.schemas.membership import MembershipOut
from app.schemas.tenant import TenantOut
from app.schemas.workforce import (
    AgreementOut,
    AuditOut,
    ClosingOut,
    EmployeeOut,
    HolidayOut,
    JourneyOut,
    NamedOut,
    NotificationOut,
    OccurrenceOut,
    PunchOut,
    PunchRuleOut,
    ReasonOut,
    RequestOut,
    SectorOut,
    TeamOut,
    VigencyOut,
)

# nome da coleção → (*Out do detalhe, *Out/*ListOut da lista)
RESOURCES: dict[str, tuple[type[BaseModel], type[BaseModel]]] = {
    "tenants": (TenantOut, TenantOut),
    "memberships": (MembershipOut, MembershipOut),
    "jobs": (NamedOut, NamedOut),
    "cost-centers": (NamedOut, NamedOut),
    "units": (NamedOut, NamedOut),
    "sectors": (SectorOut, SectorOut),
    "teams": (TeamOut, TeamOut),
    "journeys": (JourneyOut, JourneyOut),
    "unions": (NamedOut, NamedOut),
    "labor-agreements": (AgreementOut, AgreementOut),
    "holidays": (HolidayOut, HolidayOut),
    "punch-rules": (PunchRuleOut, PunchRuleOut),
    "reasons": (ReasonOut, ReasonOut),
    "employees": (EmployeeOut, EmployeeOut),
    "employee-vigencies": (VigencyOut, VigencyOut),
    "punches": (PunchOut, PunchOut),
    "occurrences": (OccurrenceOut, OccurrenceOut),
    "requests": (RequestOut, RequestOut),
    "closings": (ClosingOut, ClosingOut),
    "notifications": (NotificationOut, NotificationOut),
    "audits": (AuditOut, AuditOut),
}


def catalog_item(name: str) -> dict | None:
    pair = RESOURCES.get(name)
    if pair is None:
        return None
    out_schema, list_schema = pair
    return {
        "name": name,
        "fields": list(out_schema.model_fields.keys()),
        "list_fields": list(list_schema.model_fields.keys()),
    }


def catalog_items() -> list[dict]:
    return [catalog_item(name) for name in RESOURCES]
