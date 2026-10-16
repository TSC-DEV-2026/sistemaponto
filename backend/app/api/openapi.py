from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi


def install_docs_security(app: FastAPI) -> None:
    def openapi():
        if app.openapi_schema:
            return app.openapi_schema
        schema = get_openapi(title=app.title, version=app.version, routes=app.routes)
        components = schema.setdefault("components", {})
        schemes = components.setdefault("securitySchemes", {})
        schemes["X-Client"] = {
            "type": "apiKey",
            "in": "header",
            "name": "X-Client",
            "description": "mobile no login devolve access_token e refresh_token no JSON.",
        }
        schemes["BearerAuth"] = {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Access token do login. Cole só o token, sem a palavra Bearer.",
        }
        schema["security"] = [{"X-Client": [], "BearerAuth": []}]
        app.openapi_schema = schema
        return schema

    app.openapi = openapi
