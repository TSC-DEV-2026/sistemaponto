import re
import unicodedata

from app.core.documents import normalize_document
from app.core.exceptions import AppError
from app.core.trial import TRIAL_EMPLOYEE_CAPACITY, trial_window
from app.models.tenant import Tenant
from app.repositories.tenant_repository import TenantRepository
from app.schemas.tenant import TenantCreate, TenantUpdate

_SLUG_MAX = 100


class TenantService:
    def __init__(self, tenants: TenantRepository) -> None:
        self.tenants = tenants

    def create(self, data: TenantCreate) -> Tenant:
        document = normalize_document(data.document)
        if document is None:
            raise AppError(400, "CNPJ inválido")
        if self.tenants.get_by_document(document) is not None:
            raise AppError(400, "CNPJ já cadastrado")
        return self._create(name=data.name, document=document)

    def create_public(self, company_name: str) -> Tenant:
        return self._create(name=company_name, document=None)

    def update(self, tenant: Tenant, data: TenantUpdate) -> Tenant:
        if data.name is not None:
            tenant.name = data.name.strip()
            tenant.slug = self._unique_slug(tenant.name, ignore_id=tenant.id)
        if data.document is not None:
            document = normalize_document(data.document)
            if document is None:
                raise AppError(400, "CNPJ inválido")
            found = self.tenants.get_by_document(document)
            if found is not None and found.id != tenant.id:
                raise AppError(400, "CNPJ já cadastrado")
            tenant.document = document
        return self.tenants.save(tenant)

    def _create(self, *, name: str, document: str | None) -> Tenant:
        slug = self._unique_slug(name.strip())
        started, ends = trial_window()
        return self.tenants.create(
            name=name.strip(),
            slug=slug,
            document=document,
            trial_started_at=started,
            trial_ends_at=ends,
            employee_capacity=TRIAL_EMPLOYEE_CAPACITY,
        )

    def _unique_slug(self, name: str, ignore_id: int | None = None) -> str:
        base_slug = self._generate_slug(name) or "tenant"
        slug = base_slug
        counter = 1
        while True:
            found = self.tenants.get_by_slug(slug)
            if found is None or (ignore_id is not None and found.id == ignore_id):
                return slug
            suffix = f"-{counter}"
            trimmed = base_slug[: _SLUG_MAX - len(suffix)].strip("-")
            slug = f"{trimmed}{suffix}"
            counter += 1

    @staticmethod
    def _generate_slug(name: str) -> str:
        slug = unicodedata.normalize("NFKD", name.lower().strip())
        slug = "".join(ch for ch in slug if not unicodedata.combining(ch))
        slug = re.sub(r"[^a-z0-9\s\-]", "", slug)
        slug = re.sub(r"[\s]+", "-", slug)
        slug = re.sub(r"-+", "-", slug).strip("-")
        return slug[:_SLUG_MAX]
