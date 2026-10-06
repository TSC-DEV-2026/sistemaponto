from pydantic import BaseModel

from app.core.fields import apply_fields
from app.schemas.membership import MembershipOut


class ProductOut(BaseModel):
    id: int
    name: str
    description: str
    number: int


class ShortOut(BaseModel):
    id: int
    name: str
    number: int


def test_sem_fields_devolve_chaves_do_schema():
    payload = {"id": 1, "name": "a", "description": "b", "number": 3, "extra": True}
    result = apply_fields(payload, None, ProductOut)
    assert set(result) == {"id", "name", "description", "number"}


def test_fields_recorta_intersecao():
    payload = {"id": 1, "name": "a", "description": "b", "number": 3}
    result = apply_fields(payload, "id,name,description", ProductOut)
    assert result == {"id": 1, "name": "a", "description": "b"}


def test_campo_fora_do_schema_some():
    payload = {"id": 1, "name": "a", "number": 3}
    result = apply_fields(payload, "id,name,description", ShortOut)
    assert result == {"id": 1, "name": "a"}


def test_password_hash_nao_aparece():
    payload = {"id": 1, "person_id": 2, "role": "admin", "password_hash": "x", "cpf": "1"}
    result = apply_fields(payload, "id,password_hash,cpf", MembershipOut)
    assert "password_hash" not in result
    assert "cpf" not in result
    assert result == {"id": 1}


def test_nomes_invalidos_sao_ignorados():
    payload = {"id": 1, "name": "a", "description": "b", "number": 3}
    result = apply_fields(payload, "id;drop,items.id, name ", ProductOut)
    assert result == {"name": "a"}


def test_apply_fields_nao_recebe_engine():
    import inspect

    params = inspect.signature(apply_fields).parameters
    assert "engine" not in params
    assert "session" not in params
