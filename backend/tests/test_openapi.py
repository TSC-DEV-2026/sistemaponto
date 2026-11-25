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
    "/api/v1/categories": {"name"},
    "/api/v1/category-values": {"name", "category_id"},
    "/api/v1/units": {"name"},
    "/api/v1/teams": {"name", "unit_id"},
    "/api/v1/journeys": {"name"},
    "/api/v1/norms": {"name", "kind", "union_name"},
    "/api/v1/holidays": {"name"},
    "/api/v1/reasons": {"name", "kind", "active"},
    "/api/v1/employees": {"full_name", "cpf", "person_id"},
    "/api/v1/employee-vigencies": {"employee_id", "kind"},
    "/api/v1/punches": {"employee_id", "valid", "starts_on", "ends_on"},
    "/api/v1/occurrences": {"employee_id", "kind"},
    "/api/v1/requests": {"employee_id", "kind", "status"},
    "/api/v1/closings": {"year", "month", "status", "employee_id"},
    "/api/v1/notices": {"employee_id"},
    "/api/v1/notice-preferences": {"kind"},
    "/api/v1/notice-emails": {"kind"},
    "/api/v1/audits": {"employee_id"},
    "/api/v1/fiscal-files": {"kind", "valid"},
    "/api/v1/hour-bank-entries": {"employee_id", "kind"},
    "/api/v1/subscriptions": {"status"},
    "/api/v1/charges": {"status", "kind"},
}


def _query_names(operation: dict) -> set[str]:
    return {item["name"] for item in operation.get("parameters", []) if item["in"] == "query"}


def test_lista_de_funcoes_mostra_o_nome_no_swagger():
    schema = create_app().openapi()
    params = schema["paths"]["/api/v1/jobs"]["get"]["parameters"]
    name = next(item for item in params if item["name"] == "name")
    assert name["in"] == "query"
    assert name["required"] is False
    assert any(item.get("type") == "string" for item in name["schema"]["anyOf"])


# Detalhe do fechamento reutiliza employee_id para apurar um banco da página.
DETAIL_ALLOWS = {
    "/api/v1/closings": {"employee_id"},
}


def test_listas_mostram_os_campos_de_busca_no_swagger():
    schema = create_app().openapi()
    for path, expected in LIST_FILTERS.items():
        assert expected <= _query_names(schema["paths"][path]["get"]), path
        detail = _query_names(schema["paths"][path + "/{row_id}"]["get"])
        assert (expected - DETAIL_ALLOWS.get(path, set())).isdisjoint(detail), path


def _rotas(routes, prefix=""):
    for route in routes:
        included = getattr(route, "original_router", None)
        if included is not None:
            extra = route.include_context.prefix or ""
            yield from _rotas(included.routes, prefix + extra)
            continue
        path = prefix + getattr(route, "path", "")
        yield path, route


def test_listas_aceitam_os_campos_de_busca():
    app = create_app()
    endpoints = {
        path: route.endpoint
        for path, route in _rotas(app.routes)
        if getattr(route, "methods", None) and "GET" in route.methods and path in LIST_FILTERS
    }
    assert set(endpoints) == set(LIST_FILTERS)
    for path, expected in LIST_FILTERS.items():
        try:
            endpoints[path](**{name: None for name in expected})
        except TypeError as error:
            assert "unexpected keyword" not in str(error), path
