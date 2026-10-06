from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TenantCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    document: str = Field(min_length=14, max_length=18)


class TenantUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    document: str | None = Field(default=None, min_length=14, max_length=18)


class TenantOut(BaseModel):
    id: int
    name: str
    slug: str
    document: str | None
    trial_started_at: datetime
    trial_ends_at: datetime
    employee_capacity: int

    model_config = ConfigDict(from_attributes=True)
