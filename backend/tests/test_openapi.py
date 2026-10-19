from main import create_app


def test_docs_mostra_cliente_e_bearer():
    schema = create_app().openapi()
    schemes = schema["components"]["securitySchemes"]
    assert schemes["X-Client"]["in"] == "header"
    assert schemes["X-Client"]["name"] == "X-Client"
    assert schemes["BearerAuth"]["type"] == "http"
    assert schemes["BearerAuth"]["scheme"] == "bearer"
    assert schema["security"] == [{"X-Client": [], "BearerAuth": []}]
    assert "security" not in schema["paths"]["/api/v1/auth/login"]["post"]


def test_lista_de_cargos_mostra_o_nome_no_swagger():
    schema = create_app().openapi()
    params = schema["paths"]["/api/v1/jobs"]["get"]["parameters"]
    name = next(item for item in params if item["name"] == "name")
    assert name["in"] == "query"
    assert name["required"] is False
    assert any(item.get("type") == "string" for item in name["schema"]["anyOf"])
