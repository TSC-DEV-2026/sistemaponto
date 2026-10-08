from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ReasonKind = Literal["adjustment", "absence", "allowance", "certificate"]
RequestKind = Literal["adjustment", "allowance", "certificate", "leave", "vacation"]
RequestStatus = Literal["pending", "approved", "rejected", "cancelled"]
DecisionStatus = Literal["approved", "rejected", "cancelled"]
OccurrenceKind = Literal[
    "adjustment",
    "punch_entry",
    "absence",
    "certificate",
    "vacation",
    "allowance",
    "leave",
]
VigencyKind = Literal[
    "job",
    "journey",
    "cost_center",
    "unit",
    "sector",
    "team",
    "union",
    "manager",
    "status",
]


class NamedCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class NamedUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)


class NamedOut(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class SectorCreate(NamedCreate):
    unit_id: int


class SectorUpdate(NamedUpdate):
    unit_id: int | None = None


class SectorOut(NamedOut):
    unit_id: int


class TeamCreate(NamedCreate):
    sector_id: int


class TeamUpdate(NamedUpdate):
    sector_id: int | None = None


class TeamOut(NamedOut):
    sector_id: int


class JourneyCreate(NamedCreate):
    morning_start: str | None = None
    morning_end: str | None = None
    afternoon_start: str | None = None
    afternoon_end: str | None = None
    note: str | None = Field(default=None, max_length=2000)


class JourneyUpdate(NamedUpdate):
    morning_start: str | None = None
    morning_end: str | None = None
    afternoon_start: str | None = None
    afternoon_end: str | None = None
    note: str | None = Field(default=None, max_length=2000)


class JourneyOut(NamedOut):
    morning_start: str | None
    morning_end: str | None
    afternoon_start: str | None
    afternoon_end: str | None
    note: str | None


class AgreementCreate(NamedCreate):
    union_id: int | None = None
    valid_from: date
    valid_to: date | None = None
    note: str | None = Field(default=None, max_length=2000)


class AgreementUpdate(NamedUpdate):
    union_id: int | None = None
    valid_from: date | None = None
    valid_to: date | None = None
    note: str | None = Field(default=None, max_length=2000)


class AgreementOut(NamedOut):
    union_id: int | None
    valid_from: date
    valid_to: date | None
    note: str | None


class HolidayCreate(NamedCreate):
    holiday_date: date
    note: str | None = Field(default=None, max_length=2000)


class HolidayUpdate(NamedUpdate):
    holiday_date: date | None = None
    note: str | None = Field(default=None, max_length=2000)


class HolidayOut(NamedOut):
    holiday_date: date
    note: str | None


class PunchRuleCreate(NamedCreate):
    note: str | None = Field(default=None, max_length=2000)


class PunchRuleUpdate(NamedUpdate):
    note: str | None = Field(default=None, max_length=2000)


class PunchRuleOut(NamedOut):
    note: str | None


class ReasonCreate(NamedCreate):
    kind: ReasonKind
    active: bool = True


class ReasonUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    active: bool | None = None


class ReasonOut(NamedOut):
    kind: str
    active: bool


class EmployeeCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    cpf: str = Field(min_length=11, max_length=14)
    email: str | None = Field(default=None, max_length=255)
    person_id: int | None = None
    admission_date: date
    note: str | None = Field(default=None, max_length=2000)
    hour_bank: bool = False


class EmployeeUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    cpf: str | None = Field(default=None, min_length=11, max_length=14)
    email: str | None = Field(default=None, max_length=255)
    person_id: int | None = None
    admission_date: date | None = None
    note: str | None = Field(default=None, max_length=2000)
    hour_bank: bool | None = None


class EmployeeOut(BaseModel):
    id: int
    full_name: str
    cpf: str
    email: str | None
    person_id: int | None
    admission_date: date
    note: str | None
    hour_bank: bool
    situation: str | None
    job_label: str | None
    journey_label: str | None
    cost_center_label: str | None
    unit_label: str | None
    sector_label: str | None
    team_label: str | None
    union_label: str | None
    manager_label: str | None

    model_config = ConfigDict(from_attributes=True)


class VigencyCreate(BaseModel):
    employee_id: int
    kind: VigencyKind
    reference_id: int | None = None
    label: str | None = Field(default=None, max_length=255)
    valid_from: date
    note: str | None = Field(default=None, max_length=2000)


class VigencyUpdate(BaseModel):
    note: str | None = Field(default=None, max_length=2000)


class VigencyOut(BaseModel):
    id: int
    employee_id: int
    kind: str
    reference_id: int | None
    label: str
    valid_from: date
    valid_to: date | None
    note: str | None

    model_config = ConfigDict(from_attributes=True)


class PunchCreate(BaseModel):
    employee_id: int
    occurred_at: datetime
    note: str | None = Field(default=None, max_length=2000)


class PunchUpdate(BaseModel):
    note: str | None = Field(default=None, max_length=2000)


class PunchOut(BaseModel):
    id: int
    employee_id: int
    occurred_at: datetime
    source: str
    request_id: int | None
    note: str | None
    valid: bool
    voided_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PunchCorrectionCreate(BaseModel):
    employee_id: int
    punches: list[datetime] = Field(min_length=1, max_length=20)
    note: str | None = Field(default=None, max_length=2000)


class PunchCorrectionOut(BaseModel):
    employee_id: int
    day: date
    origin: Literal["manual"]
    punches: list[PunchOut]


class OccurrenceCreate(BaseModel):
    employee_id: int
    kind: OccurrenceKind
    starts_on: date
    ends_on: date | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    reason_id: int | None = None
    note: str | None = Field(default=None, max_length=2000)
    cid: str | None = Field(default=None, max_length=16)
    crm: str | None = Field(default=None, max_length=32)
    doctor_name: str | None = Field(default=None, max_length=255)
    photo_key: str | None = Field(default=None, max_length=512)


class OccurrenceUpdate(BaseModel):
    note: str | None = Field(default=None, max_length=2000)


class OccurrenceOut(BaseModel):
    id: int
    employee_id: int
    kind: str
    starts_on: date
    ends_on: date
    reason_id: int | None
    note: str | None
    source: str
    request_id: int | None
    starts_at: datetime | None
    ends_at: datetime | None
    cid: str | None
    crm: str | None
    doctor_name: str | None
    photo_key: str | None
    photo_url: str | None = None
    warning: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CertificatePhotoOut(BaseModel):
    key: str


class RequestCreate(BaseModel):
    kind: RequestKind
    reason_id: int | None = None
    note: str | None = Field(default=None, max_length=2000)
    starts_on: date | None = None
    ends_on: date | None = None
    occurred_at: datetime | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    cid: str | None = Field(default=None, max_length=16)
    crm: str | None = Field(default=None, max_length=32)
    doctor_name: str | None = Field(default=None, max_length=255)
    photo_key: str | None = Field(default=None, max_length=512)
    punches: list[datetime] | None = Field(default=None, max_length=20)


class RequestUpdate(BaseModel):
    status: DecisionStatus
    decision_note: str | None = Field(default=None, max_length=2000)


class RequestEventOut(BaseModel):
    id: int
    status: str
    note: str | None
    person_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RequestOut(BaseModel):
    id: int
    employee_id: int
    kind: str
    status: str
    reason_id: int | None
    note: str | None
    starts_on: date | None
    ends_on: date | None
    occurred_at: datetime | None
    starts_at: datetime | None
    ends_at: datetime | None
    cid: str | None
    crm: str | None
    doctor_name: str | None
    photo_key: str | None
    photo_url: str | None = None
    punches: list[datetime]
    decision_note: str | None
    decided_at: datetime | None
    decided_by_person_id: int | None
    created_at: datetime
    events: list[RequestEventOut]

    model_config = ConfigDict(from_attributes=True)


class ClosingCreate(BaseModel):
    year: int | None = Field(default=None, ge=2000, le=2100)
    month: int | None = Field(default=None, ge=1, le=12)
    starts_on: date | None = None
    ends_on: date | None = None
    note: str | None = Field(default=None, max_length=2000)


class ClosingUpdate(BaseModel):
    status: Literal["open", "closed", "cancelled"]
    note: str | None = Field(default=None, max_length=2000)


class ClosingEventOut(BaseModel):
    id: int
    kind: str
    note: str | None
    person_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClosingOut(BaseModel):
    id: int
    year: int
    month: int
    starts_on: date
    ends_on: date
    status: str
    note: str | None
    closed_at: datetime | None
    closed_by_person_id: int | None
    events: list[ClosingEventOut]

    model_config = ConfigDict(from_attributes=True)


class NotificationUpdate(BaseModel):
    read: bool | None = None


class NotificationOut(BaseModel):
    id: int
    person_id: int
    employee_id: int | None
    kind: str
    title: str
    body: str
    read_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationPreferenceCreate(BaseModel):
    kind: str = Field(min_length=1, max_length=64)
    enabled: bool


class NotificationPreferenceUpdate(BaseModel):
    enabled: bool | None = None


class NotificationPreferenceOut(BaseModel):
    id: int
    person_id: int
    kind: str
    enabled: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NoticeEmailUpdate(BaseModel):
    note: str | None = Field(default=None, max_length=2000)


class NoticeEmailOut(BaseModel):
    id: int
    person_id: int
    employee_id: int | None
    kind: str
    body: str
    address: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NoticeRunOut(BaseModel):
    created: int


PaymentMethod = Literal["pix", "boleto", "debit", "credit"]


class SubscriptionCreate(BaseModel):
    capacity: int
    payment_method: PaymentMethod


class SubscriptionUpdate(BaseModel):
    capacity: int | None = None
    payment_method: PaymentMethod | None = None


class SubscriptionOut(BaseModel):
    id: int
    status: str
    capacity: int
    payment_method: str
    price_cents: int
    monthly_amount_cents: int
    period_start: date
    period_end: date
    contracted_at: datetime


class ChargeUpdate(BaseModel):
    paid: bool | None = None


class ChargeOut(BaseModel):
    id: int
    subscription_id: int
    kind: str
    amount_cents: int
    capacity: int
    due_on: date
    status: str
    payment_method: str
    period_start: date
    period_end: date
    paid_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditUpdate(BaseModel):
    note: str | None = None


class AuditOut(BaseModel):
    id: int
    person_id: int
    action: str
    employee_id: int | None
    subject_kind: str
    subject_id: int
    previous_label: str | None
    new_label: str | None
    valid_from: date | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DashboardOut(BaseModel):
    active_employees: int
    punches_today: int
    pending_adjustments: int
    pending_allowances: int
    pending_certificates: int
    pending_leaves: int
    pending_vacations: int
    open_closings: int
    employee_capacity: int


class PayrollTotalOut(BaseModel):
    employee_id: int
    full_name: str
    punch_count: int
    worked_minutes: int
    overtime_minutes: int
    night_additional_minutes: int
    shortage_minutes: int
    balance_minutes: int


class PayrollOut(BaseModel):
    year: int
    month: int
    items: list[PayrollTotalOut]


class FiscalFileCreate(BaseModel):
    kind: Literal["afd", "aej", "payroll"]
    year: int | None = Field(default=None, ge=2000, le=2100)
    month: int | None = Field(default=None, ge=1, le=12)
    starts_on: date | None = None
    ends_on: date | None = None


class FiscalFileUpdate(BaseModel):
    note: str | None = Field(default=None, max_length=2000)


class FiscalFileOut(BaseModel):
    id: int
    kind: str
    starts_on: date
    ends_on: date
    content: str
    valid: bool
    invalidated_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FiscalImportCreate(BaseModel):
    content: str = Field(min_length=1, max_length=500_000)


class FiscalImportOut(BaseModel):
    created: int
    ignored: int
    blocked: int


class TimeResultOut(BaseModel):
    work_date: date
    expected_minutes: int
    worked_minutes: int
    delay_minutes: int
    early_leave_minutes: int
    overtime_minutes: int
    shortage_minutes: int
    bank_minutes: int
    night_minutes: int
    night_additional_minutes: int
    absence: bool
    incomplete: bool
    holiday: bool
    warnings: list[str]


class TimeResultsOut(BaseModel):
    employee_id: int
    starts_on: date
    ends_on: date
    items: list[TimeResultOut]


class ReportCatalogOut(BaseModel):
    kind: str
    name: str


class ReportLineOut(BaseModel):
    employee_id: int | None
    full_name: str | None
    occurred_on: date
    title: str
    detail: str


class ReportOut(BaseModel):
    kind: str
    name: str
    starts_on: date
    ends_on: date
    items: list[ReportLineOut]
    total: int
    page: int
    limit: int


class HourBankEntryCreate(BaseModel):
    employee_id: int
    kind: Literal["settlement", "credit", "debit"]
    minutes: int = Field(gt=0, le=100000)
    entry_on: date | None = None
    note: str | None = Field(default=None, max_length=2000)


class HourBankEntryUpdate(BaseModel):
    note: str | None = Field(default=None, max_length=2000)


class HourBankEntryOut(BaseModel):
    id: int
    employee_id: int
    kind: str
    minutes: int
    effect: str | None
    note: str | None
    entry_on: date
    created_by_person_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HourBankOut(BaseModel):
    employee_id: int
    balance_minutes: int
    credit_minutes: int
    debit_minutes: int
    paid_overtime_minutes: int
    discounted_absence_minutes: int
    warning: str | None
