from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.core.exceptions import AppError
from app.core.trial import TRIAL_EMPLOYEE_CAPACITY, trial_window
from app.services.authenticator_client import RemotePerson


class FakeTenantRepo:
    def __init__(self) -> None:
        self.rows: list[SimpleNamespace] = []
        self._seq = 1

    def get_by_id(self, tenant_id: int):
        return next((row for row in self.rows if row.id == tenant_id), None)

    def get_by_slug(self, slug: str):
        return next((row for row in self.rows if row.slug == slug), None)

    def get_by_document(self, document: str):
        return next((row for row in self.rows if row.document == document), None)

    def create(
        self,
        *,
        name: str,
        slug: str,
        document: str | None,
        trial_started_at=None,
        trial_ends_at=None,
        employee_capacity: int | None = None,
    ):
        started, ends = trial_window()
        row = SimpleNamespace(
            id=self._seq,
            name=name,
            slug=slug,
            document=document,
            trial_started_at=trial_started_at or started,
            trial_ends_at=trial_ends_at or ends,
            employee_capacity=TRIAL_EMPLOYEE_CAPACITY if employee_capacity is None else employee_capacity,
        )
        self._seq += 1
        self.rows.append(row)
        return row

    def save(self, row):
        return row


class FakeMembershipRepo:
    def __init__(self) -> None:
        self.rows: list[SimpleNamespace] = []
        self._seq = 1
        self.last_filters: dict | None = None

    def list_by_person(self, person_id: int):
        return [row for row in self.rows if row.person_id == person_id]

    def get_by_person_and_tenant(self, person_id: int, tenant_id: int):
        return next(
            (row for row in self.rows if row.person_id == person_id and row.tenant_id == tenant_id),
            None,
        )

    def list_by_tenant(self, tenant_id: int, *, role, person_id, page, limit):
        self.last_filters = {"tenant_id": tenant_id, "role": role, "person_id": person_id}
        matched = [row for row in self.rows if row.tenant_id == tenant_id]
        if role:
            matched = [row for row in matched if row.role == role]
        if person_id is not None:
            matched = [row for row in matched if row.person_id == person_id]
        return matched, len(matched)

    def count_admins(self, tenant_id: int) -> int:
        return len([row for row in self.rows if row.tenant_id == tenant_id and row.role == "admin"])

    def create(self, *, person_id: int, tenant_id: int, role: str):
        row = SimpleNamespace(id=self._seq, person_id=person_id, tenant_id=tenant_id, role=role)
        self._seq += 1
        self.rows.append(row)
        return row

    def save(self, row):
        return row

    def delete(self, row):
        self.rows.remove(row)


class FakeRefreshRepo:
    def __init__(self) -> None:
        self.rows: list[SimpleNamespace] = []

    def save(self, *, person_id: int, token_hash: str, expires_at: datetime, auth_version: int):
        row = SimpleNamespace(
            person_id=person_id,
            token_hash=token_hash,
            expires_at=expires_at,
            revoked=False,
            auth_version=auth_version,
        )
        self.rows.append(row)
        return row

    def get_by_hash(self, token_hash: str):
        return next((row for row in self.rows if row.token_hash == token_hash), None)

    def revoke(self, row) -> None:
        row.revoked = True

    def revoke_all(self, person_id: int) -> None:
        for row in self.rows:
            if row.person_id == person_id:
                row.revoked = True


class FakeAuthenticator:
    def __init__(self) -> None:
        self.people: dict[int, RemotePerson] = {}
        self.by_cpf: dict[str, RemotePerson] = {}
        self.passwords: dict[int, str] = {}
        self.upserts: list[dict] = []
        self._seq = 1

    def add(
        self,
        *,
        cpf: str,
        email: str,
        full_name: str,
        password: str,
        email_verified: bool = False,
        is_active: bool = True,
        auth_version: int = 1,
    ) -> RemotePerson:
        person = RemotePerson(
            person_id=self._seq,
            cpf=cpf,
            email=email,
            full_name=full_name,
            email_verified=email_verified,
            is_active=is_active,
            auth_version=auth_version,
        )
        self._seq += 1
        self.people[person.person_id] = person
        self.by_cpf[cpf] = person
        self.passwords[person.person_id] = password
        return person

    def verify(self, cpf: str, password: str) -> RemotePerson:
        person = self.by_cpf.get(cpf)
        if person is None or self.passwords.get(person.person_id) != password:
            raise AppError(401, "CPF ou senha inválidos")
        if not person.is_active:
            raise AppError(403, "Pessoa inativa")
        return person

    def upsert_person(self, *, cpf, email, full_name, password, redirect_url):
        self.upserts.append(
            {
                "cpf": cpf,
                "email": email,
                "full_name": full_name,
                "password": password,
                "redirect_url": redirect_url,
            }
        )
        existing = self.by_cpf.get(cpf)
        if existing is not None:
            return existing.person_id, False
        person = self.add(
            cpf=cpf,
            email=email,
            full_name=full_name,
            password=password or "",
            email_verified=False,
        )
        return person.person_id, True

    def person_state(self, person_id: int) -> RemotePerson:
        person = self.people.get(person_id)
        if person is None:
            raise AppError(404, "Pessoa não encontrada")
        return person


def future() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=1)
