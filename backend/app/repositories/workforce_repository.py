from datetime import date, datetime

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.models.membership import Membership
from app.models.tenant import Tenant
from app.models.workforce import (
    Audit,
    Charge,
    Closing,
    ClosingEvent,
    Employee,
    EmployeeVigency,
    FiscalFile,
    Holiday,
    HourBankEntry,
    NoticeEmail,
    Notification,
    NotificationPreference,
    Occurrence,
    Punch,
    RequestEvent,
    RequestPunch,
    Subscription,
    TimeRequest,
)


class WorkforceRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, row):
        self.db.add(row)
        self.db.flush()
        return row

    def delete(self, row) -> None:
        self.db.delete(row)
        self.db.flush()

    def get_tenant(self, tenant_id: int) -> Tenant | None:
        return self.db.query(Tenant).filter(Tenant.id == tenant_id).one_or_none()

    def membership(self, person_id: int, tenant_id: int) -> Membership | None:
        return (
            self.db.query(Membership)
            .filter(Membership.person_id == person_id, Membership.tenant_id == tenant_id)
            .one_or_none()
        )

    def admins(self, tenant_id: int) -> list[Membership]:
        return self.role_memberships(tenant_id, "admin")

    def role_memberships(self, tenant_id: int, role: str) -> list[Membership]:
        return (
            self.db.query(Membership)
            .filter(Membership.tenant_id == tenant_id, Membership.role == role)
            .all()
        )

    def preference_for(self, tenant_id: int, person_id: int, kind: str) -> NotificationPreference | None:
        return (
            self.db.query(NotificationPreference)
            .filter(
                NotificationPreference.tenant_id == tenant_id,
                NotificationPreference.person_id == person_id,
                NotificationPreference.kind == kind,
            )
            .one_or_none()
        )

    def notice_between(
        self,
        tenant_id: int,
        person_id: int,
        kind: str,
        start: datetime,
        end: datetime,
    ) -> Notification | None:
        return (
            self.db.query(Notification)
            .filter(
                Notification.tenant_id == tenant_id,
                Notification.person_id == person_id,
                Notification.kind == kind,
                Notification.created_at >= start,
                Notification.created_at < end,
            )
            .first()
        )

    def employee_by_person(self, tenant_id: int, person_id: int) -> Employee | None:
        return (
            self.db.query(Employee)
            .filter(Employee.tenant_id == tenant_id, Employee.person_id == person_id)
            .one_or_none()
        )

    def open_closings(self, tenant_id: int) -> list[Closing]:
        return (
            self.db.query(Closing)
            .filter(Closing.tenant_id == tenant_id, Closing.status == "open")
            .all()
        )

    def subscription_for(self, tenant_id: int) -> Subscription | None:
        return self.db.query(Subscription).filter(Subscription.tenant_id == tenant_id).one_or_none()

    def open_charges(self, tenant_id: int) -> list[Charge]:
        return (
            self.db.query(Charge)
            .filter(Charge.tenant_id == tenant_id, Charge.status == "open")
            .order_by(Charge.due_on.asc(), Charge.id.asc())
            .all()
        )

    def list_rows(
        self,
        model,
        tenant_id: int,
        *,
        page: int,
        limit: int,
        equals: dict,
        descending: bool,
        employee_ids: list[int] | None = None,
    ):
        if employee_ids is not None and len(employee_ids) == 0:
            return [], 0
        query = self.db.query(model).filter(model.tenant_id == tenant_id)
        if employee_ids is not None:
            query = query.filter(model.employee_id.in_(employee_ids))
        for key, value in equals.items():
            query = query.filter(getattr(model, key) == value)
        total = query.count()
        order = model.id.desc() if descending else model.id.asc()
        items = query.order_by(order).offset((page - 1) * limit).limit(limit).all()
        return items, total

    def get_row(self, model, tenant_id: int, row_id: int):
        return (
            self.db.query(model)
            .filter(model.id == row_id, model.tenant_id == tenant_id)
            .one_or_none()
        )

    def name_taken(self, model, tenant_id: int, name: str, *, exclude_id: int | None, scope: dict) -> bool:
        query = self.db.query(model).filter(model.tenant_id == tenant_id, model.name == name)
        for key, value in scope.items():
            query = query.filter(getattr(model, key) == value)
        if exclude_id is not None:
            query = query.filter(model.id != exclude_id)
        return query.first() is not None

    def count_model(self, model, **equals) -> int:
        query = self.db.query(model)
        for key, value in equals.items():
            query = query.filter(getattr(model, key) == value)
        return query.count()

    def list_employees(self, tenant_id: int, *, ids: list[int] | None, page: int, limit: int, equals: dict):
        if ids is not None and len(ids) == 0:
            return [], 0
        query = self.db.query(Employee).filter(Employee.tenant_id == tenant_id)
        if ids is not None:
            query = query.filter(Employee.id.in_(ids))
        for key, value in equals.items():
            query = query.filter(getattr(Employee, key) == value)
        total = query.count()
        items = query.order_by(Employee.id.asc()).offset((page - 1) * limit).limit(limit).all()
        return items, total

    def labels_on(self, employee_ids: list[int], day: date) -> dict[int, dict[str, EmployeeVigency]]:
        if not employee_ids:
            return {}
        rows = (
            self.db.query(EmployeeVigency)
            .filter(
                EmployeeVigency.employee_id.in_(employee_ids),
                EmployeeVigency.valid_from <= day,
                or_(EmployeeVigency.valid_to.is_(None), EmployeeVigency.valid_to >= day),
            )
            .order_by(EmployeeVigency.valid_from.asc(), EmployeeVigency.id.asc())
            .all()
        )
        found: dict[int, dict[str, EmployeeVigency]] = {}
        for row in rows:
            found.setdefault(row.employee_id, {})[row.kind] = row
        return found

    def open_vigency(self, employee_id: int, kind: str) -> EmployeeVigency | None:
        return (
            self.db.query(EmployeeVigency)
            .filter(
                EmployeeVigency.employee_id == employee_id,
                EmployeeVigency.kind == kind,
                EmployeeVigency.valid_to.is_(None),
            )
            .one_or_none()
        )

    def applicable(self, employee_id: int, kind: str, day: date) -> EmployeeVigency | None:
        return (
            self.db.query(EmployeeVigency)
            .filter(
                EmployeeVigency.employee_id == employee_id,
                EmployeeVigency.kind == kind,
                EmployeeVigency.valid_from <= day,
                or_(EmployeeVigency.valid_to.is_(None), EmployeeVigency.valid_to >= day),
            )
            .order_by(EmployeeVigency.valid_from.desc(), EmployeeVigency.id.desc())
            .first()
        )

    def employee_ids_for_team(self, tenant_id: int, team_id: int, day: date) -> list[int]:
        rows = (
            self.db.query(EmployeeVigency.employee_id)
            .filter(
                EmployeeVigency.tenant_id == tenant_id,
                EmployeeVigency.kind == "team",
                EmployeeVigency.reference_id == team_id,
                EmployeeVigency.valid_from <= day,
                or_(EmployeeVigency.valid_to.is_(None), EmployeeVigency.valid_to >= day),
            )
            .all()
        )
        return [row[0] for row in rows]

    def count_active(self, tenant_id: int, day: date) -> int:
        current = and_(
            EmployeeVigency.label == "active",
            EmployeeVigency.valid_from <= day,
            or_(EmployeeVigency.valid_to.is_(None), EmployeeVigency.valid_to >= day),
        )
        scheduled = and_(
            EmployeeVigency.label == "active",
            EmployeeVigency.valid_to.is_(None),
            EmployeeVigency.valid_from > day,
        )
        return (
            self.db.query(EmployeeVigency.employee_id)
            .filter(
                EmployeeVigency.tenant_id == tenant_id,
                EmployeeVigency.kind == "status",
                or_(current, scheduled),
            )
            .distinct()
            .count()
        )

    def count_punches_between(self, tenant_id: int, start: datetime, end: datetime) -> int:
        return (
            self.db.query(Punch)
            .filter(
                Punch.tenant_id == tenant_id,
                Punch.valid.is_(True),
                Punch.occurred_at >= start,
                Punch.occurred_at < end,
            )
            .count()
        )

    def punch_counts(self, tenant_id: int, start: datetime, end: datetime) -> dict[int, int]:
        rows = (
            self.db.query(Punch.employee_id, func.count(Punch.id))
            .filter(
                Punch.tenant_id == tenant_id,
                Punch.valid.is_(True),
                Punch.occurred_at >= start,
                Punch.occurred_at < end,
            )
            .group_by(Punch.employee_id)
            .all()
        )
        return {employee_id: count for employee_id, count in rows}

    def valid_punches_in(self, tenant_id: int, start: datetime, end: datetime) -> list[Punch]:
        return (
            self.db.query(Punch)
            .filter(
                Punch.tenant_id == tenant_id,
                Punch.valid.is_(True),
                Punch.occurred_at >= start,
                Punch.occurred_at < end,
            )
            .order_by(Punch.occurred_at.asc(), Punch.id.asc())
            .all()
        )

    def punch_at(self, tenant_id: int, employee_id: int, occurred_at: datetime) -> Punch | None:
        return (
            self.db.query(Punch)
            .filter(
                Punch.tenant_id == tenant_id,
                Punch.employee_id == employee_id,
                Punch.occurred_at == occurred_at,
            )
            .first()
        )

    def employee_by_cpf(self, tenant_id: int, cpf: str) -> Employee | None:
        return (
            self.db.query(Employee)
            .filter(Employee.tenant_id == tenant_id, Employee.cpf == cpf)
            .one_or_none()
        )

    def valid_punches_between(self, tenant_id: int, employee_id: int, start: datetime, end: datetime) -> list[Punch]:
        return (
            self.db.query(Punch)
            .filter(
                Punch.tenant_id == tenant_id,
                Punch.employee_id == employee_id,
                Punch.valid.is_(True),
                Punch.occurred_at >= start,
                Punch.occurred_at < end,
            )
            .order_by(Punch.occurred_at.asc(), Punch.id.asc())
            .all()
        )

    def vigencies_between(self, tenant_id: int, employee_id: int, kind: str, start: date, end: date) -> list[EmployeeVigency]:
        return (
            self.db.query(EmployeeVigency)
            .filter(
                EmployeeVigency.tenant_id == tenant_id,
                EmployeeVigency.employee_id == employee_id,
                EmployeeVigency.kind == kind,
                EmployeeVigency.valid_from <= end,
                or_(EmployeeVigency.valid_to.is_(None), EmployeeVigency.valid_to >= start),
            )
            .order_by(EmployeeVigency.valid_from.asc(), EmployeeVigency.id.asc())
            .all()
        )

    def holidays_between(self, tenant_id: int, start: date, end: date) -> list[Holiday]:
        return (
            self.db.query(Holiday)
            .filter(Holiday.tenant_id == tenant_id, Holiday.holiday_date >= start, Holiday.holiday_date <= end)
            .all()
        )

    def occurrences_between(self, tenant_id: int, employee_id: int, start: date, end: date) -> list[Occurrence]:
        return (
            self.db.query(Occurrence)
            .filter(
                Occurrence.tenant_id == tenant_id,
                Occurrence.employee_id == employee_id,
                Occurrence.starts_on <= end,
                Occurrence.ends_on >= start,
            )
            .order_by(Occurrence.id.asc())
            .all()
        )

    def hour_bank_entries_for(self, tenant_id: int, employee_id: int) -> list[HourBankEntry]:
        return (
            self.db.query(HourBankEntry)
            .filter(HourBankEntry.tenant_id == tenant_id, HourBankEntry.employee_id == employee_id)
            .order_by(HourBankEntry.entry_on.asc(), HourBankEntry.id.asc())
            .all()
        )

    def request_punches_for(self, request_ids: list[int]) -> dict[int, list[RequestPunch]]:
        if not request_ids:
            return {}
        rows = (
            self.db.query(RequestPunch)
            .filter(RequestPunch.request_id.in_(request_ids))
            .order_by(RequestPunch.position.asc(), RequestPunch.id.asc())
            .all()
        )
        found: dict[int, list[RequestPunch]] = {}
        for row in rows:
            found.setdefault(row.request_id, []).append(row)
        return found

    def count_requests(self, tenant_id: int, *, kind: str, status: str) -> int:
        return (
            self.db.query(TimeRequest)
            .filter(TimeRequest.tenant_id == tenant_id, TimeRequest.kind == kind, TimeRequest.status == status)
            .count()
        )

    def closing_for(self, tenant_id: int, year: int, month: int) -> Closing | None:
        return (
            self.db.query(Closing)
            .filter(Closing.tenant_id == tenant_id, Closing.year == year, Closing.month == month)
            .one_or_none()
        )

    def closing_overlapping(self, tenant_id: int, start: date, end: date) -> Closing | None:
        return (
            self.db.query(Closing)
            .filter(Closing.tenant_id == tenant_id, Closing.starts_on <= end, Closing.ends_on >= start)
            .first()
        )

    def closed_exact(self, tenant_id: int, start: date, end: date) -> Closing | None:
        return (
            self.db.query(Closing)
            .filter(
                Closing.tenant_id == tenant_id,
                Closing.status == "closed",
                Closing.starts_on == start,
                Closing.ends_on == end,
            )
            .first()
        )

    def fiscal_files_overlapping(self, tenant_id: int, start: date, end: date) -> list[FiscalFile]:
        return (
            self.db.query(FiscalFile)
            .filter(
                FiscalFile.tenant_id == tenant_id,
                FiscalFile.valid.is_(True),
                FiscalFile.starts_on <= end,
                FiscalFile.ends_on >= start,
            )
            .all()
        )

    def closed_covering(self, tenant_id: int, day: date) -> Closing | None:
        return (
            self.db.query(Closing)
            .filter(
                Closing.tenant_id == tenant_id,
                Closing.status == "closed",
                Closing.starts_on <= day,
                Closing.ends_on >= day,
            )
            .first()
        )

    def pending_overlapping(self, tenant_id: int, start: date, end: date) -> list[TimeRequest]:
        return (
            self.db.query(TimeRequest)
            .filter(
                TimeRequest.tenant_id == tenant_id,
                TimeRequest.status == "pending",
                TimeRequest.starts_on.is_not(None),
                TimeRequest.starts_on <= end,
                or_(TimeRequest.ends_on.is_(None), TimeRequest.ends_on >= start),
            )
            .all()
        )

    def blocking_occurrences(self, tenant_id: int, start: date, end: date) -> list[Occurrence]:
        return (
            self.db.query(Occurrence)
            .filter(
                Occurrence.tenant_id == tenant_id,
                Occurrence.kind.in_(("allowance", "certificate")),
                Occurrence.starts_on <= end,
                Occurrence.ends_on >= start,
            )
            .all()
        )

    def events_for(self, request_ids: list[int]) -> dict[int, list[RequestEvent]]:
        if not request_ids:
            return {}
        rows = (
            self.db.query(RequestEvent)
            .filter(RequestEvent.request_id.in_(request_ids))
            .order_by(RequestEvent.id.asc())
            .all()
        )
        found: dict[int, list[RequestEvent]] = {}
        for row in rows:
            found.setdefault(row.request_id, []).append(row)
        return found

    def closing_events_for(self, closing_ids: list[int]) -> dict[int, list[ClosingEvent]]:
        if not closing_ids:
            return {}
        rows = (
            self.db.query(ClosingEvent)
            .filter(ClosingEvent.closing_id.in_(closing_ids))
            .order_by(ClosingEvent.id.asc())
            .all()
        )
        found: dict[int, list[ClosingEvent]] = {}
        for row in rows:
            found.setdefault(row.closing_id, []).append(row)
        return found

    def reasons_active(self, tenant_id: int, kind: str) -> int:
        from app.models.workforce import Reason

        return (
            self.db.query(Reason)
            .filter(Reason.tenant_id == tenant_id, Reason.kind == kind, Reason.active.is_(True))
            .count()
        )
