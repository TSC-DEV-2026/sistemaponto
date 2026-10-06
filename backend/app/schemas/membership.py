from pydantic import BaseModel, ConfigDict, EmailStr, Field


class MembershipCreate(BaseModel):
    cpf: str = Field(min_length=11, max_length=14)
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    role: str = Field(min_length=1, max_length=32)


class MembershipUpdate(BaseModel):
    role: str | None = Field(default=None, min_length=1, max_length=32)


class MembershipOut(BaseModel):
    id: int
    person_id: int
    full_name: str
    role: str

    model_config = ConfigDict(from_attributes=True)
