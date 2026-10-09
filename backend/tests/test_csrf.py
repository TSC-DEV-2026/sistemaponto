from starlette.requests import Request

from app.api.middleware import _needs_csrf


def _request(headers: dict[str, str]) -> Request:
    raw = [(key.lower().encode(), value.encode()) for key, value in headers.items()]
    return Request(
        {
            "type": "http",
            "http_version": "1.1",
            "method": "POST",
            "scheme": "http",
            "path": "/api/v1/auth/login",
            "raw_path": b"/api/v1/auth/login",
            "query_string": b"",
            "headers": raw,
            "client": ("127.0.0.1", 123),
            "server": ("test", 80),
        }
    )


def test_app_sem_bearer_nao_exige_csrf():
    request = _request({"x-client": "mobile"})
    assert _needs_csrf(request) is False


def test_site_sem_bearer_exige_csrf():
    request = _request({"x-client": "web"})
    assert _needs_csrf(request) is True


def test_bearer_nao_exige_csrf():
    request = _request({"x-client": "web", "authorization": "Bearer token"})
    assert _needs_csrf(request) is False
