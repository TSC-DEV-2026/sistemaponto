from app.core.trial import TRIAL_DAYS, TRIAL_EMPLOYEE_CAPACITY
from app.services.tenant_service import TenantService
from tests.fakes import FakeTenantRepo


def _service() -> tuple[TenantService, FakeTenantRepo]:
    repo = FakeTenantRepo()
    return TenantService(repo), repo


def test_slug_com_acento():
    service, _repo = _service()
    assert service._generate_slug("Ação Comercial") == "acao-comercial"


def test_slug_colisao_e_teto():
    service, repo = _service()
    base = "a" * 100
    repo.create(name="cheia", slug=base, document=None)
    slug = service._unique_slug("a" * 150)
    assert slug.endswith("-1")
    assert len(slug) <= 100
    assert slug != base


def test_create_grava_documento():
    service, repo = _service()
    from app.schemas.tenant import TenantCreate

    row = service.create(TenantCreate(name="Oficina", document="12345678000199"))
    assert row.name == "Oficina"
    assert row.slug == "oficina"
    assert row.document == "12345678000199"
    assert repo.rows[0].document == "12345678000199"
    assert row.employee_capacity == TRIAL_EMPLOYEE_CAPACITY
    assert (row.trial_ends_at - row.trial_started_at).days == TRIAL_DAYS


def test_empresa_nova_abre_trial_de_sete_dias():
    service, repo = _service()
    row = service.create_public("Oficina")
    assert row.employee_capacity == TRIAL_EMPLOYEE_CAPACITY
    assert repo.rows[0].employee_capacity == TRIAL_EMPLOYEE_CAPACITY
    assert (row.trial_ends_at - row.trial_started_at).days == TRIAL_DAYS
