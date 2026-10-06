from app.core.exceptions import AppError
from app.core.security import decode_access_token
from app.schemas.auth import RegisterCreate
from app.services.auth_service import AuthService
from app.services.tenant_service import TenantService
from tests.fakes import FakeAuthenticator, FakeMembershipRepo, FakeRefreshRepo, FakeTenantRepo


def build():
    tenants = FakeTenantRepo()
    memberships = FakeMembershipRepo()
    refreshes = FakeRefreshRepo()
    authenticator = FakeAuthenticator()
    service = AuthService(tenants, memberships, refreshes, authenticator, TenantService(tenants))
    return service, tenants, memberships, refreshes, authenticator


def test_register_cpf_novo_abre_sessao_sem_hash():
    service, _tenants, memberships, _refreshes, authenticator = build()
    result = service.register(
        RegisterCreate(
            full_name="Ana",
            cpf="12345678900",
            email="ana@x.com",
            company_name="Oficina",
            password="senha1234",
        )
    )
    assert result.session is not None
    assert result.view.must_login is False
    assert authenticator.upserts[0]["password"] == "senha1234"
    assert len(authenticator.upserts) == 1
    assert not hasattr(memberships.rows[0], "password")
    assert not hasattr(memberships.rows[0], "password_hash")
    assert memberships.rows[0].role == "admin"
    payload = decode_access_token(result.session.access_token)
    assert payload["typ"] == "access"
    assert payload["tenant_id"] == memberships.rows[0].tenant_id


def test_register_cpf_existente_nao_troca_senha_e_pede_login():
    service, _tenants, memberships, _refreshes, authenticator = build()
    person = authenticator.add(cpf="12345678900", email="ana@x.com", full_name="Ana", password="antiga123")
    result = service.register(
        RegisterCreate(
            full_name="Outro",
            cpf="123.456.789-00",
            email="nova@x.com",
            company_name="Loja",
            password="senha1234",
        )
    )
    assert result.session is None
    assert result.view.must_login is True
    assert authenticator.passwords[person.person_id] == "antiga123"
    assert memberships.rows[0].role == "admin"
    assert memberships.rows[0].person_id == person.person_id


def test_login_com_email_nao_verificado_emite_access():
    service, tenants, memberships, _refreshes, authenticator = build()
    person = authenticator.add(
        cpf="12345678900",
        email="ana@x.com",
        full_name="Ana",
        password="senha1234",
        email_verified=False,
    )
    tenant = tenants.create(name="Oficina", slug="oficina", document=None)
    memberships.create(person_id=person.person_id, tenant_id=tenant.id, role="admin")
    issued = service.login("12345678900", "senha1234")
    payload = decode_access_token(issued.access_token)
    assert payload["sub"] == person.person_id
    assert issued.view.email_verified is False


def test_login_sem_vinculo_responde_403():
    service, _tenants, _memberships, _refreshes, authenticator = build()
    authenticator.add(cpf="12345678900", email="ana@x.com", full_name="Ana", password="senha1234")
    try:
        service.login("12345678900", "senha1234")
        raise AssertionError("deveria recusar")
    except AppError as exc:
        assert exc.status_code == 403


def test_login_com_um_vinculo_grava_tenant():
    service, tenants, memberships, _refreshes, authenticator = build()
    person = authenticator.add(cpf="12345678900", email="ana@x.com", full_name="Ana", password="senha1234")
    tenant = tenants.create(name="Oficina", slug="oficina", document=None)
    memberships.create(person_id=person.person_id, tenant_id=tenant.id, role="member")
    issued = service.login("12345678900", "senha1234")
    payload = decode_access_token(issued.access_token)
    assert payload["tenant_id"] == tenant.id


def test_login_com_varios_vinculos_nao_escolhe_tenant():
    service, tenants, memberships, _refreshes, authenticator = build()
    person = authenticator.add(cpf="12345678900", email="ana@x.com", full_name="Ana", password="senha1234")
    first = tenants.create(name="Um", slug="um", document=None)
    second = tenants.create(name="Dois", slug="dois", document=None)
    memberships.create(person_id=person.person_id, tenant_id=first.id, role="admin")
    memberships.create(person_id=person.person_id, tenant_id=second.id, role="member")
    issued = service.login("12345678900", "senha1234")
    payload = decode_access_token(issued.access_token)
    assert "tenant_id" not in payload
    assert issued.view.active_tenant is None
    assert len(issued.view.tenants) == 2


def test_refresh_com_auth_version_diferente_revoga():
    service, tenants, memberships, refreshes, authenticator = build()
    person = authenticator.add(cpf="12345678900", email="ana@x.com", full_name="Ana", password="senha1234")
    tenant = tenants.create(name="Oficina", slug="oficina", document=None)
    memberships.create(person_id=person.person_id, tenant_id=tenant.id, role="admin")
    issued = service.login("12345678900", "senha1234")
    person.auth_version = 9
    try:
        service.refresh(issued.refresh_token)
        raise AssertionError("deveria recusar")
    except AppError as exc:
        assert exc.status_code == 401
    assert refreshes.rows[0].revoked is True
