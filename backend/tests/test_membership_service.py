import inspect

from app.api.routes.memberships import get_membership, list_memberships
from app.models.membership import Membership
from app.repositories.membership_repository import MembershipRepository
from app.schemas.membership import MembershipCreate
from app.services.membership_service import MembershipService
from tests.fakes import FakeAuthenticator, FakeMembershipRepo


def test_criar_vinculo_chama_autenticador_sem_senha():
    memberships = FakeMembershipRepo()
    authenticator = FakeAuthenticator()
    service = MembershipService(memberships, authenticator)
    created = service.create(
        4,
        MembershipCreate(cpf="12345678900", email="ana@x.com", full_name="Ana", role="member"),
    )
    assert created.full_name == "Ana"
    assert created.person_id == 1
    assert authenticator.state_calls == 1
    assert authenticator.lookups == []
    assert authenticator.upserts[0]["password"] is None
    assert memberships.rows[0].person_id == 1
    assert memberships.rows[0].role == "member"
    assert "password" not in Membership.__table__.columns
    assert "password_hash" not in Membership.__table__.columns
    assert "cpf" not in Membership.__table__.columns


def test_lista_repassa_filtro_sem_sql_concatenado():
    memberships = FakeMembershipRepo()
    authenticator = FakeAuthenticator()
    service = MembershipService(memberships, authenticator)
    service.list(7, role="admin", person_id=3, page=1, limit=10)
    assert memberships.last_filters == {"tenant_id": 7, "role": "admin", "person_id": 3}
    assert authenticator.lookups == [[]]
    assert authenticator.state_calls == 0
    source = inspect.getsource(MembershipRepository.list_by_tenant)
    assert "text(" not in source
    assert "execute(" not in source
    assert "%s" not in source
    assert "Membership.role ==" in source
    assert "Membership.person_id ==" in source


def test_lista_casa_o_nome_na_ordem_da_pagina():
    memberships = FakeMembershipRepo()
    authenticator = FakeAuthenticator()
    bia = authenticator.add(cpf="22222222222", email="bia@x.com", full_name="Bia", password="")
    ana = authenticator.add(cpf="11111111111", email="ana@x.com", full_name="Ana", password="")
    memberships.create(person_id=bia.person_id, tenant_id=7, role="member")
    memberships.create(person_id=ana.person_id, tenant_id=7, role="admin")
    memberships.create(person_id=99, tenant_id=7, role="member")
    service = MembershipService(memberships, authenticator)
    items, total = service.list(7, role=None, person_id=None, page=1, limit=10)
    assert total == 3
    assert [(row.person_id, row.full_name, row.role) for row in items] == [
        (bia.person_id, "Bia", "member"),
        (ana.person_id, "Ana", "admin"),
        (99, "", "member"),
    ]
    assert authenticator.lookups == [[bia.person_id, ana.person_id, 99]]
    assert authenticator.state_calls == 0


def test_get_por_id_nao_filtra_e_tenant_nao_vem_da_query():
    assert "role" not in inspect.signature(get_membership).parameters
    assert "person_id" not in inspect.signature(get_membership).parameters
    assert "tenant_id" not in inspect.signature(list_memberships).parameters
    assert "x_tenant_id" not in inspect.signature(list_memberships).parameters
