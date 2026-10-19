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


LIST_FILTERS = {
    "/api/v1/jobs": {"name"},
    "/api/v1/cost-centers": {"name"},
    "/api/v1/units": {"name"},
    "/api/v1/sectors": {"name", "unit_id"},
    "/api/v1/teams": {"name", "sector_id"},
    "/api/v1/journeys": {"name"},
    "/api/v1/unions": {"name"},
    "/api/v1/labor-agreements": {"name", "union_id"},
    "/api/v1/holidays": {"name"},
    "/api/v1/punch-rules": {"name"},
    "/api/v1/reasons": {"name", "kind", "active"},
    "/api/v1/employees": {"full_name", "cpf", "person_id"},
    "/api/v1/employee-vigencies": {"employee_id", "kind"},
    "/api/v1/punches": {"employee_id", "valid"},
    "/api/v1/occurrences": {"employee_id", "kind"},
    "/api/v1/requests": {"employee_id", "kind", "status"},
    "/api/v1/closings": {"year", "month", "status"},
    "/api/v1/notifications": {"employee_id"},
    "/api/v1/notification-preferences": {"kind"},
    "/api/v1/notice-emails": {"kind"},
    "/api/v1/audits": {"employee_id"},
    "/api/v1/fiscal-files": {"kind", "valid"},
    "/api/v1/hour-bank-entries": {"employee_id", "kind"},
    "/api/v1/subscriptions": {"status"},
    "/api/v1/charges": {"status", "kind"},
}


def _query_names(operation: dict) -> set[str]:
    return {item["name"] for item in operation.get("parameters", []) if item["in"] == "query"}


def test_lista_de_cargos_mostra_o_nome_no_swagger():
    schema = create_app().openapi()
    params = schema["paths"]["/api/v1/jobs"]["get"]["parameters"]
    name = next(item for item in params if item["name"] == "name")
    assert name["in"] == "query"
    assert name["required"] is False
    assert any(item.get("type") == "string" for item in name["schema"]["anyOf"])


def test_listas_mostram_os_campos_de_busca_no_swagger():
    schema = create_app().openapi()
    for path, expected in LIST_FILTERS.items():
        assert expected <= _query_names(schema["paths"][path]["get"]), path
        assert expected.isdisjoint(_query_names(schema["paths"][path + "/{row_id}"]["get"])), path


def test_listas_aceitam_os_campos_de_busca():
    app = create_app()
    endpoints = {
        route.path: route.endpoint
        for route in app.routes
        if getattr(route, "methods", None) and "GET" in route.methods and route.path in LIST_FILTERS
    }
    assert set(endpoints) == set(LIST_FILTERS)
    for path, expected in LIST_FILTERS.items():
        try:
            endpoints[path](**{name: None for name in expected})
        except TypeError as error:
            assert "unexpected keyword" not in str(error), path
