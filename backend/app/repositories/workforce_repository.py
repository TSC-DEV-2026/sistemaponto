from datetime import date, datetime

from sqlalchemy import and_, case, func, or_
from sqlalchemy.orm import Session, load_only

from app.models.membership import Membership
from app.models.tenant import Tenant
from app.models.workforce import (
    Audit,
    Charge,
    Category,
    Closing,
    ClosingEvent,
    ClosingMember,
    ClosingJourneyPin,
    Employee,
    EmployeeVigency,
    FaceEmbedding,
    FiscalFile,
    Holiday,
    HourBankEntry,
    JourneyDay,
    JourneySpan,
    JourneyVersion,
    NoticeEmail,
    Notice,
    NoticePreference,
    Occurrence,
    Punch,
    RequestEvent,
    RequestPunch,
    Subscription,
    TimeRequest,
)


CONTAINS_KEYS = frozenset({"name", "full_name"})


def contains_pattern(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def employee_search_matches(full_name: str, cpf: str, registration: str | None, term: str) -> bool:
    text = term.strip()
    if not text:
        return True
    digits = "".join(character for character in text if character.isdigit())
    has_letter = any(character.isalpha() for character in text)
    registration_text = registration or ""
    if has_letter or not digits:
        folded = text.casefold()
        return folded in full_name.casefold() or folded in registration_text.casefold()
    return digits in cpf or digits in registration_text or text.casefold() in registration_text.casefold()


def _employee_search_clause(term: str):
    text = term.strip()
    digits = "".join(character for character in text if character.isdigit())
    has_letter = any(character.isalpha() for character in text)
    if has_letter or not digits:
        pattern = contains_pattern(text)
        return or_(
            Employee.full_name.ilike(pattern, escape="\\"),
            Employee.registration_number.ilike(pattern, escape="\\"),
        )
    clauses = [
        Employee.cpf.ilike(contains_pattern(digits), escape="\\"),
        Employee.registration_number.ilike(contains_pattern(digits), escape="\\"),
    ]
    if digits != text:
        clauses.append(Employee.registration_number.ilike(contains_pattern(text), escape="\\"))
    return or_(*clauses)


def filter_matches(key: str, current, wanted) -> bool:
    if key in CONTAINS_KEYS and isinstance(current, str) and isinstance(wanted, str):
        return wanted.casefold() in current.casefold()
    return current == wanted


def _apply_filters(query, model, equals: dict):
    for key, value in equals.items():
        column = getattr(model, key)
        if key in CONTAINS_KEYS:
            query = query.filter(column.ilike(contains_pattern(str(value)), escape="\\"))
        else:
            query = query.filter(column == value)
    return query


def _same_reference(reference: int | None, reference_id: int | None, reference_ids: set[int] | None) -> bool:
    if reference_ids is not None:
        return reference in reference_ids
    if reference_id is not None:
        return reference == reference_id
    return True


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

    def preference_for(self, tenant_id: int, person_id: int, kind: str) -> NoticePreference | None:
        return (
            self.db.query(NoticePreference)
            .filter(
                NoticePreference.tenant_id == tenant_id,
                NoticePreference.person_id == person_id,
                NoticePreference.kind == kind,
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
    ) -> Notice | None:
        return (
            self.db.query(Notice)
            .filter(
                Notice.tenant_id == tenant_id,
                Notice.person_id == person_id,
                Notice.kind == kind,
                Notice.created_at >= start,
                Notice.created_at < end,
            )
            .first()
        )

    def email_between(
        self,
        tenant_id: int,
        person_id: int,
        kind: str,
        start: datetime,
        end: datetime,
    ) -> NoticeEmail | None:
        return (
            self.db.query(NoticeEmail)
            .filter(
                NoticeEmail.tenant_id == tenant_id,
                NoticeEmail.person_id == person_id,
                NoticeEmail.kind == kind,
                NoticeEmail.created_at >= start,
                NoticeEmail.created_at < end,
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
        query = _apply_filters(query, model, equals)
        total = query.count()
        if model is EmployeeVigency and descending:
            order = (
                case((EmployeeVigency.valid_to.is_(None), 0), else_=1),
                EmployeeVigency.valid_from.desc(),
                EmployeeVigency.id.desc(),
            )
        else:
            order = (model.id.desc() if descending else model.id.asc(),)
        items = query.order_by(*order).offset((page - 1) * limit).limit(limit).all()
        return items, total

    def rows_in(self, model, tenant_id: int, ids: list[int]):
        if not ids:
            return []
        return self.db.query(model).filter(model.tenant_id == tenant_id, model.id.in_(ids)).all()

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

    def count_unread_notices(self, tenant_id: int, person_id: int) -> int:
        return (
            self.db.query(Notice)
            .filter(
                Notice.tenant_id == tenant_id,
                Notice.person_id == person_id,
                Notice.read_at.is_(None),
            )
            .count()
        )

    def list_closings_for_employee(
        self,
        tenant_id: int,
        employee_id: int,
        *,
        page: int,
        limit: int,
        equals: dict,
        descending: bool,
    ):
        member_exists = self.db.query(ClosingMember.id).filter(ClosingMember.closing_id == Closing.id).exists()
        is_member = (
            self.db.query(ClosingMember.id)
            .filter(ClosingMember.closing_id == Closing.id, ClosingMember.employee_id == employee_id)
            .exists()
        )
        query = self.db.query(Closing).filter(
            Closing.tenant_id == tenant_id,
            or_(~member_exists, is_member),
        )
        query = _apply_filters(query, Closing, equals)
        total = query.count()
        order = (Closing.id.desc() if descending else Closing.id.asc(),)
        items = query.order_by(*order).offset((page - 1) * limit).limit(limit).all()
        return items, total

    def count_model(self, model, **equals) -> int:
        query = self.db.query(model)
        for key, value in equals.items():
            query = query.filter(getattr(model, key) == value)
        return query.count()

    def list_employees(self, tenant_id: int, *, ids: list[int] | None, page: int, limit: int, equals: dict, search: str | None = None):
        if ids is not None and len(ids) == 0:
            return [], 0
        query = self.db.query(Employee).filter(Employee.tenant_id == tenant_id)
        if ids is not None:
            query = query.filter(Employee.id.in_(ids))
        query = _apply_filters(query, Employee, equals)
        if search and search.strip():
            query = query.filter(_employee_search_clause(search))
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

    def open_vigency(
        self, employee_id: int, kind: str, category_id: int | None = None
    ) -> EmployeeVigency | None:
        query = self.db.query(EmployeeVigency).filter(
            EmployeeVigency.employee_id == employee_id,
            EmployeeVigency.kind == kind,
            EmployeeVigency.valid_to.is_(None),
        )
        if category_id is not None:
            query = query.filter(EmployeeVigency.category_id == category_id)
        return query.one_or_none()

    def open_manager(self, employee_id: int, reference_id: int) -> EmployeeVigency | None:
        return (
            self.db.query(EmployeeVigency)
            .filter(
                EmployeeVigency.employee_id == employee_id,
                EmployeeVigency.kind == "manager",
                EmployeeVigency.reference_id == reference_id,
                EmployeeVigency.valid_to.is_(None),
            )
            .order_by(EmployeeVigency.id.desc())
            .first()
        )

    def managers_on(self, employee_ids: list[int], day: date) -> dict[int, list[EmployeeVigency]]:
        if not employee_ids:
            return {}
        rows = (
            self.db.query(EmployeeVigency)
            .filter(
                EmployeeVigency.employee_id.in_(employee_ids),
                EmployeeVigency.kind == "manager",
                EmployeeVigency.valid_from <= day,
                or_(EmployeeVigency.valid_to.is_(None), EmployeeVigency.valid_to >= day),
            )
            .order_by(EmployeeVigency.valid_from.asc(), EmployeeVigency.id.asc())
            .all()
        )
        chosen: dict[int, dict[int, EmployeeVigency]] = {}
        for row in rows:
            key = row.reference_id if row.reference_id is not None else -row.id
            chosen.setdefault(row.employee_id, {})[key] = row
        return {
            employee_id: sorted(items.values(), key=lambda item: (item.label.casefold(), item.id))
            for employee_id, items in chosen.items()
        }

    def employee_ids_managed_by(self, tenant_id: int, manager_id: int, day: date) -> list[int]:
        rows = (
            self.db.query(EmployeeVigency.employee_id)
            .filter(
                EmployeeVigency.tenant_id == tenant_id,
                EmployeeVigency.kind == "manager",
                EmployeeVigency.reference_id == manager_id,
                EmployeeVigency.valid_from <= day,
                or_(EmployeeVigency.valid_to.is_(None), EmployeeVigency.valid_to >= day),
            )
            .distinct()
            .all()
        )
        return [row[0] for row in rows]

    def category_named(self, tenant_id: int, name: str):
        return (
            self.db.query(Category)
            .filter(Category.tenant_id == tenant_id, Category.name == name)
            .one_or_none()
        )

    def rows_of(self, model, tenant_id: int):
        return (
            self.db.query(model)
            .filter(model.tenant_id == tenant_id)
            .order_by(model.name.asc(), model.id.asc())
            .all()
        )

    def employees_with_values(self, tenant_id: int, category_id: int, day: date, reference_ids: set[int]) -> set[int]:
        rows = (
            self.db.query(EmployeeVigency)
            .filter(
                EmployeeVigency.tenant_id == tenant_id,
                EmployeeVigency.kind == "category",
                EmployeeVigency.category_id == category_id,
                EmployeeVigency.valid_from <= day,
                or_(EmployeeVigency.valid_to.is_(None), EmployeeVigency.valid_to >= day),
            )
            .order_by(EmployeeVigency.valid_from.asc(), EmployeeVigency.id.asc())
            .all()
        )
        chosen: dict[int, EmployeeVigency] = {}
        for row in rows:
            chosen[row.employee_id] = row
        return {employee_id for employee_id, row in chosen.items() if row.reference_id in reference_ids}

    def applicable_categories(self, employee_ids: list[int], day: date) -> dict[int, dict[int, EmployeeVigency]]:
        if not employee_ids:
            return {}
        rows = (
            self.db.query(EmployeeVigency)
            .filter(
                EmployeeVigency.employee_id.in_(employee_ids),
                EmployeeVigency.kind == "category",
                EmployeeVigency.valid_from <= day,
                or_(EmployeeVigency.valid_to.is_(None), EmployeeVigency.valid_to >= day),
            )
            .order_by(EmployeeVigency.valid_from.asc(), EmployeeVigency.id.asc())
            .all()
        )
        found: dict[int, dict[int, EmployeeVigency]] = {}
        for row in rows:
            if row.category_id is None:
                continue
            found.setdefault(row.employee_id, {})[row.category_id] = row
        return found

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

    def applicable_ids(
        self,
        tenant_id: int,
        kind: str,
        day: date,
        *,
        reference_id: int | None = None,
        reference_ids: set[int] | None = None,
        label: str | None = None,
    ) -> list[int]:
        rows = (
            self.db.query(EmployeeVigency)
            .filter(
                EmployeeVigency.tenant_id == tenant_id,
                EmployeeVigency.kind == kind,
                EmployeeVigency.valid_from <= day,
                or_(EmployeeVigency.valid_to.is_(None), EmployeeVigency.valid_to >= day),
            )
            .order_by(EmployeeVigency.valid_from.asc(), EmployeeVigency.id.asc())
            .all()
        )
        if kind == "manager":
            found = []
            seen: set[int] = set()
            for row in rows:
                if not _same_reference(row.reference_id, reference_id, reference_ids):
                    continue
                if row.employee_id in seen:
                    continue
                seen.add(row.employee_id)
                found.append(row.employee_id)
            return found
        chosen: dict[int, EmployeeVigency] = {}
        for row in rows:
            chosen[row.employee_id] = row
        found = []
        for employee_id, row in chosen.items():
            if not _same_reference(row.reference_id, reference_id, reference_ids):
                continue
            if label is not None and row.label != label:
                continue
            found.append(employee_id)
        return found

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
            .options(load_only(Punch.id, Punch.tenant_id, Punch.employee_id, Punch.occurred_at, Punch.valid))
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

    def employee_by_registration(self, tenant_id: int, registration: str) -> Employee | None:
        return (
            self.db.query(Employee)
            .filter(Employee.tenant_id == tenant_id, Employee.registration_number == registration)
            .one_or_none()
        )

    def list_face_embeddings(
        self,
        tenant_id: int,
        *,
        page: int,
        limit: int,
        updated_since: datetime | None = None,
    ):
        query = (
            self.db.query(FaceEmbedding, Employee)
            .join(Employee, Employee.id == FaceEmbedding.employee_id)
            .filter(
                FaceEmbedding.tenant_id == tenant_id,
                Employee.tenant_id == tenant_id,
                Employee.clock_method == "face",
            )
        )
        if updated_since is not None:
            query = query.filter(FaceEmbedding.updated_at > updated_since)
        total = query.count()
        rows = (
            query.order_by(FaceEmbedding.id.asc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )
        return rows, total

    def list_face_embeddings_for_tenants(
        self,
        tenant_ids: list[int],
        *,
        page: int,
        limit: int,
        updated_since: datetime | None = None,
    ):
        if not tenant_ids:
            return [], 0
        query = (
            self.db.query(FaceEmbedding, Employee)
            .join(Employee, Employee.id == FaceEmbedding.employee_id)
            .filter(
                FaceEmbedding.tenant_id.in_(tenant_ids),
                Employee.tenant_id == FaceEmbedding.tenant_id,
                Employee.clock_method == "face",
            )
        )
        if updated_since is not None:
            query = query.filter(FaceEmbedding.updated_at > updated_since)
        total = query.count()
        rows = (
            query.order_by(FaceEmbedding.tenant_id.asc(), FaceEmbedding.id.asc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )
        return rows, total

    def face_registry_rows(self, tenant_id: int) -> list[tuple[FaceEmbedding, int]]:
        rows = (
            self.db.query(FaceEmbedding, Employee.id)
            .join(Employee, Employee.id == FaceEmbedding.employee_id)
            .filter(
                FaceEmbedding.tenant_id == tenant_id,
                Employee.tenant_id == tenant_id,
                Employee.clock_method == "face",
            )
            .order_by(FaceEmbedding.id.asc())
            .all()
        )
        return [(row, employee_id) for row, employee_id in rows]

    def versions_for(self, tenant_id: int, journey_id: int) -> list[JourneyVersion]:
        return (
            self.db.query(JourneyVersion)
            .filter(JourneyVersion.tenant_id == tenant_id, JourneyVersion.journey_id == journey_id)
            .order_by(JourneyVersion.valid_from.asc(), JourneyVersion.id.asc())
            .all()
        )

    def days_for(self, version_id: int) -> list[JourneyDay]:
        return (
            self.db.query(JourneyDay)
            .filter(JourneyDay.version_id == version_id)
            .order_by(JourneyDay.position.asc(), JourneyDay.id.asc())
            .all()
        )

    def spans_for(self, day_id: int) -> list[JourneySpan]:
        return (
            self.db.query(JourneySpan)
            .filter(JourneySpan.day_id == day_id)
            .order_by(JourneySpan.position.asc(), JourneySpan.id.asc())
            .all()
        )

    def vigencies_for_reference(self, tenant_id: int, kind: str, reference_id: int) -> list[EmployeeVigency]:
        return (
            self.db.query(EmployeeVigency)
            .filter(
                EmployeeVigency.tenant_id == tenant_id,
                EmployeeVigency.kind == kind,
                EmployeeVigency.reference_id == reference_id,
            )
            .all()
        )

    def punches_between(self, tenant_id: int, employee_id: int, start: datetime, end: datetime) -> list[Punch]:
        return (
            self.db.query(Punch)
            .filter(
                Punch.tenant_id == tenant_id,
                Punch.employee_id == employee_id,
                Punch.occurred_at >= start,
                Punch.occurred_at < end,
            )
            .order_by(Punch.occurred_at.asc(), Punch.id.asc())
            .all()
        )

    def list_punches(
        self,
        tenant_id: int,
        *,
        page: int,
        limit: int,
        equals: dict,
        occurred_from: datetime | None = None,
        occurred_to: datetime | None = None,
        descending: bool = True,
        employee_ids: list[int] | None = None,
    ):
        if employee_ids is not None and len(employee_ids) == 0:
            return [], 0
        query = self.db.query(Punch).filter(Punch.tenant_id == tenant_id)
        if employee_ids is not None:
            query = query.filter(Punch.employee_id.in_(employee_ids))
        query = _apply_filters(query, Punch, equals)
        if occurred_from is not None:
            query = query.filter(Punch.occurred_at >= occurred_from)
        if occurred_to is not None:
            query = query.filter(Punch.occurred_at < occurred_to)
        total = query.count()
        if descending:
            order = (Punch.occurred_at.desc(), Punch.id.desc())
        else:
            order = (Punch.occurred_at.asc(), Punch.id.asc())
        items = query.order_by(*order).offset((page - 1) * limit).limit(limit).all()
        return items, total

    def valid_punches_between(self, tenant_id: int, employee_id: int, start: datetime, end: datetime) -> list[Punch]:
        return (
            self.db.query(Punch)
            .options(
                load_only(
                    Punch.id,
                    Punch.tenant_id,
                    Punch.employee_id,
                    Punch.occurred_at,
                    Punch.valid,
                    Punch.voided_at,
                )
            )
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

    def overlapping_closings(self, tenant_id: int, start: date, end: date) -> list[Closing]:
        return (
            self.db.query(Closing)
            .filter(Closing.tenant_id == tenant_id, Closing.starts_on <= end, Closing.ends_on >= start)
            .all()
        )

    def member_ids(self, closing_id: int) -> list[int]:
        rows = self.db.query(ClosingMember.employee_id).filter(ClosingMember.closing_id == closing_id).all()
        return [row[0] for row in rows]

    def closed_for_employee(self, tenant_id: int, day: date, employee_id: int) -> Closing | None:
        rows = (
            self.db.query(Closing)
            .filter(
                Closing.tenant_id == tenant_id,
                Closing.status == "closed",
                Closing.starts_on <= day,
                Closing.ends_on >= day,
            )
            .all()
        )
        for row in rows:
            members = self.member_ids(row.id)
            if not members or employee_id in members:
                return row
        return None

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

    def closed_periods(self, tenant_id: int) -> list[Closing]:
        return (
            self.db.query(Closing)
            .filter(Closing.tenant_id == tenant_id, Closing.status == "closed")
            .all()
        )

    def pins_for(self, closing_id: int, journey_id: int) -> list[ClosingJourneyPin]:
        return (
            self.db.query(ClosingJourneyPin)
            .filter(ClosingJourneyPin.closing_id == closing_id, ClosingJourneyPin.journey_id == journey_id)
            .order_by(ClosingJourneyPin.covers_from.asc(), ClosingJourneyPin.id.asc())
            .all()
        )

    def pin_on(self, closing_id: int, journey_id: int, day: date) -> ClosingJourneyPin | None:
        return (
            self.db.query(ClosingJourneyPin)
            .filter(
                ClosingJourneyPin.closing_id == closing_id,
                ClosingJourneyPin.journey_id == journey_id,
                ClosingJourneyPin.covers_from <= day,
            )
            .order_by(ClosingJourneyPin.covers_from.desc(), ClosingJourneyPin.id.desc())
            .first()
        )

    def version_is_pinned(self, version_id: int) -> bool:
        return (
            self.db.query(ClosingJourneyPin.id).filter(ClosingJourneyPin.version_id == version_id).first()
            is not None
        )

    def delete_closing_entries(self, closing_id: int) -> None:
        self.db.query(HourBankEntry).filter(HourBankEntry.closing_id == closing_id).delete(synchronize_session=False)

    def delete_members_for_closing(self, closing_id: int) -> None:
        self.db.query(ClosingMember).filter(ClosingMember.closing_id == closing_id).delete(synchronize_session=False)

    def delete_pins_for_closing(self, closing_id: int) -> None:
        self.db.query(ClosingJourneyPin).filter(ClosingJourneyPin.closing_id == closing_id).delete(
            synchronize_session=False
        )

    def delete_pins_for_journey(self, journey_id: int) -> None:
        self.db.query(ClosingJourneyPin).filter(ClosingJourneyPin.journey_id == journey_id).delete(
            synchronize_session=False
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
                Occurrence.kind.in_(("allowances", "certificates", "allowance", "certificate")),
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
