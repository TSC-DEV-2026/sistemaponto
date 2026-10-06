from fastapi import APIRouter, Body, Depends, Query, Request

from app.api.cookies import clear_auth_cookies
from app.api.dependencies.auth import get_actor, optional_actor
from app.api.dependencies.services import get_auth_service
from app.api.responses import json_data
from app.api.transport import read_refresh, respond_session, use_cookie_transport
from app.core.exceptions import AppError
from app.core.limiter import limiter
from app.schemas.auth import (
    ChangePasswordIn,
    ForgotIn,
    LoginIn,
    RefreshIn,
    RegisterCreate,
    ResendIn,
    ResetIn,
    SessionOut,
    SwitchTenantIn,
)
from app.schemas.common import Envelope, MessageOut
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

FORGOT_MESSAGE = "Se o e-mail existir, enviaremos as instruções."


@router.post(
    "/register",
    response_model=Envelope[SessionOut],
    summary="Cadastro público",
    description="Cria a empresa e o admin. Repassa CPF, e-mail, nome e senha ao autenticador. CPF já existente devolve must_login e não abre sessão.",
    status_code=201,
)
@limiter.limit("10/minute")
def register(request: Request, body: RegisterCreate, service: AuthService = Depends(get_auth_service)):
    result = service.register(body)
    if result.session is None:
        return json_data(result.view.model_dump(mode="json"), status_code=201)
    return respond_session(request, result.session, status_code=201)


@router.post(
    "/login",
    response_model=Envelope[SessionOut],
    summary="Login",
    description="CPF e senha conferidos no autenticador. Um vínculo já escolhe a empresa. Vários vínculos devolvem a lista até o switch-tenant.",
)
@limiter.limit("10/minute")
def login(request: Request, body: LoginIn, service: AuthService = Depends(get_auth_service)):
    issued = service.login(body.cpf, body.password)
    return respond_session(request, issued)


@router.post(
    "/refresh",
    response_model=Envelope[SessionOut],
    summary="Renovar sessão",
    description="Confere auth_version no autenticador. Se mudou, revoga o refresh local. A resposta web não traz JWT.",
)
@limiter.limit("10/minute")
def refresh_session(
    request: Request,
    body: RefreshIn | None = Body(default=None),
    service: AuthService = Depends(get_auth_service),
):
    raw = read_refresh(request, body.refresh_token if body else None)
    if not raw:
        raise AppError(401, "Não autenticado")
    return respond_session(request, service.refresh(raw))


@router.post(
    "/logout",
    response_model=Envelope[None],
    summary="Encerrar sessão",
    description="Revoga os refresh desta API e, no site, apaga os cookies. O access já emitido vale até o exp.",
)
def logout(request: Request, service: AuthService = Depends(get_auth_service)):
    actor = optional_actor(request)
    if actor is not None:
        service.logout(actor.person_id)
    response = json_data(None)
    if use_cookie_transport(request):
        clear_auth_cookies(response)
    return response


@router.get(
    "/me",
    response_model=Envelope[SessionOut],
    summary="Sessão atual",
    description="Pessoa, papel e empresas desta sessão. O nome vem do autenticador.",
)
def me(request: Request, service: AuthService = Depends(get_auth_service)):
    actor = get_actor(request)
    view = service.session_view(actor.person_id, actor.tenant_id)
    return json_data(view.model_dump(mode="json"))


@router.post(
    "/switch-tenant",
    response_model=Envelope[SessionOut],
    summary="Trocar de empresa",
    description="Renova a sessão com o tenant_id escolhido, se a pessoa tiver vínculo.",
)
def switch_tenant(
    request: Request,
    body: SwitchTenantIn,
    service: AuthService = Depends(get_auth_service),
):
    actor = get_actor(request)
    issued = service.switch_tenant(actor.person_id, body.tenant_id)
    return respond_session(request, issued)


@router.post(
    "/forgot-password",
    response_model=Envelope[MessageOut],
    summary="Esqueci a senha",
    description="Repassa o e-mail ao autenticador. A resposta é a mesma exista ou não o e-mail.",
)
@limiter.limit("10/minute")
def forgot_password(request: Request, body: ForgotIn, service: AuthService = Depends(get_auth_service)):
    service.forgot(str(body.email))
    return json_data(MessageOut(message=FORGOT_MESSAGE).model_dump(mode="json"))


@router.post(
    "/reset-password",
    response_model=Envelope[None],
    summary="Redefinir senha",
    description="Repassa o token e a senha nova ao autenticador. Esta API não grava hash.",
)
@limiter.limit("10/minute")
def reset_password(request: Request, body: ResetIn, service: AuthService = Depends(get_auth_service)):
    service.reset_password(body.token, body.new_password)
    return json_data(None)


@router.post(
    "/change-password",
    response_model=Envelope[None],
    summary="Trocar senha",
    description="Repassa a senha atual e a nova ao autenticador e revoga os refresh locais.",
)
@limiter.limit("10/minute")
def change_password(
    request: Request,
    body: ChangePasswordIn,
    service: AuthService = Depends(get_auth_service),
):
    actor = get_actor(request)
    service.change_password(actor.person_id, body.current_password, body.new_password)
    return json_data(None)


@router.get(
    "/verify-email",
    response_model=Envelope[None],
    summary="Confirmar e-mail",
    description="Repassa o token ao autenticador. E-mail não verificado não impede o login.",
)
def verify_email(
    token: str = Query(min_length=10, max_length=200),
    service: AuthService = Depends(get_auth_service),
):
    service.verify_email(token)
    return json_data(None)


@router.post(
    "/resend-verification",
    response_model=Envelope[MessageOut],
    summary="Reenviar verificação",
    description="Repassa o e-mail ao autenticador. A resposta não revela se o e-mail existe.",
)
@limiter.limit("10/minute")
def resend_verification(request: Request, body: ResendIn, service: AuthService = Depends(get_auth_service)):
    service.resend_verification(str(body.email))
    return json_data(MessageOut(message=FORGOT_MESSAGE).model_dump(mode="json"))
