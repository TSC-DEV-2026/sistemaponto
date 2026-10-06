from app.core.exceptions import AppError
from app.services.storage_service import StorageService


def test_chave_tem_prefixo_do_tenant_e_ignora_nome_original():
    key = StorageService().build_key(3, "files", "application/pdf", 20)
    assert key.startswith("3/files/")
    assert key.endswith(".pdf")
    assert "relatorio" not in key


def test_tipo_nao_permitido():
    try:
        StorageService().validate_upload("application/x-msdownload", 20)
        raise AssertionError("deveria recusar")
    except AppError as exc:
        assert exc.status_code == 400
