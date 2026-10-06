import logging
from dataclasses import dataclass

import httpx

from app.core.config import settings
from app.core.exceptions import AppError

logger = logging.getLogger("sistemaponto.authenticator")


@dataclass
class RemotePerson:
    person_id: int
    cpf: str
    email: str
    full_name: str
    email_verified: bool
    is_active: bool
    auth_version: int


class AuthenticatorClient:
    """Único ponto que chama o autenticador."""

    def __init__(self, client: httpx.Client | None = None) -> None:
        self._client = client

    def verify(self, cpf: str, password: str) -> RemotePerson:
        data = self._request("POST", "/auth/verify", {"cpf": cpf, "password": password})
        return RemotePerson(
            person_id=int(data["person_id"]),
            cpf=str(data["cpf"]),
            email=str(data["email"]),
            full_name=str(data["full_name"]),
            email_verified=bool(data["email_verified"]),
            is_active=bool(data["is_active"]),
            auth_version=int(data["auth_version"]),
        )

    def upsert_person(
        self,
        *,
        cpf: str,
        email: str,
        full_name: str,
        password: str | None,
        redirect_url: str,
    ) -> tuple[int, bool]:
        body: dict = {
            "cpf": cpf,
            "email": email,
            "full_name": full_name,
            "redirect_url": redirect_url,
        }
        if password:
            body["password"] = password
        data = self._request("POST", "/people", body)
        return int(data["person_id"]), bool(data["created"])

    def person_state(self, person_id: int) -> RemotePerson:
        data = self._request("GET", f"/people/{person_id}")
        return RemotePerson(
            person_id=person_id,
            cpf="",
            email=str(data["email"]),
            full_name=str(data["full_name"]),
            email_verified=bool(data["email_verified"]),
            is_active=bool(data["is_active"]),
            auth_version=int(data["auth_version"]),
        )

    def forgot_password(self, email: str, redirect_url: str) -> None:
        self._request("POST", "/auth/forgot-password", {"email": email, "redirect_url": redirect_url})

    def reset_password(self, token: str, new_password: str) -> None:
        self._request("POST", "/auth/reset-password", {"token": token, "new_password": new_password})

    def change_password(self, person_id: int, current_password: str, new_password: str) -> None:
        self._request(
            "POST",
            "/auth/change-password",
            {
                "person_id": person_id,
                "current_password": current_password,
                "new_password": new_password,
            },
        )

    def verify_email(self, token: str) -> None:
        self._request("POST", "/auth/verify-email", {"token": token})

    def resend_verification(self, email: str, redirect_url: str) -> None:
        self._request(
            "POST",
            "/auth/resend-verification",
            {"email": email, "redirect_url": redirect_url},
        )

    def _request(self, method: str, path: str, body: dict | None = None) -> dict:
        url = settings.AUTHENTICATOR_BASE_URL.rstrip("/") + "/api/v1/internal" + path
        headers = {"X-Api-Key": settings.AUTHENTICATOR_API_KEY}
        client = self._client or httpx.Client(timeout=10.0)
        close = self._client is None
        try:
            response = client.request(method, url, json=body, headers=headers)
        except httpx.HTTPError:
            logger.exception("autenticador indisponível")
            raise AppError(503, "Autenticador indisponível") from None
        finally:
            if close:
                client.close()
        return self._read(response)

    def _read(self, response: httpx.Response) -> dict:
        try:
            payload = response.json()
        except ValueError:
            logger.info("autenticador status=%s corpo inválido", response.status_code)
            raise AppError(502, "Falha no autenticador") from None
        if response.status_code >= 400:
            message = "Falha no autenticador"
            error = payload.get("error") if isinstance(payload, dict) else None
            if isinstance(error, dict) and isinstance(error.get("message"), str):
                message = error["message"]
            raise AppError(response.status_code, message)
        data = payload.get("data") if isinstance(payload, dict) else None
        if data is None:
            return {}
        if not isinstance(data, dict):
            raise AppError(502, "Falha no autenticador")
        return data
