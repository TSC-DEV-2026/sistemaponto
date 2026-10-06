from pydantic import BaseModel, EmailStr, Field

from app.schemas.tenant import TenantOut


class RegisterCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    cpf: str = Field(min_length=11, max_length=14)
    email: EmailStr
    company_name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=72)


class LoginIn(BaseModel):
    cpf: str = Field(min_length=11, max_length=14)
    password: str = Field(min_length=1, max_length=72)


class RefreshIn(BaseModel):
    refresh_token: str | None = None


class SwitchTenantIn(BaseModel):
    tenant_id: int


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    new_password: str = Field(min_length=8, max_length=72)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=8, max_length=72)


class ResendIn(BaseModel):
    email: EmailStr


class SessionOut(BaseModel):
    person_id: int
    full_name: str
    email: str
    email_verified: bool
    role: str | None
    active_tenant: TenantOut | None
    tenants: list[TenantOut]
    must_login: bool = False
