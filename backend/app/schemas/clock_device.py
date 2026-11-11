from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.workforce import PunchOut


class ClockDeviceOut(BaseModel):
    id: int
    public_id: str
    created_at: datetime
    revoked_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ClockDeviceEnroll(BaseModel):
    public_id: str = Field(min_length=8, max_length=80)
    code: str = Field(min_length=6, max_length=16)


class ClockDeviceEnrolledOut(ClockDeviceOut):
    tenant_id: int
    key: str


class ClockDeviceUpdate(BaseModel):
    pass


class ClockReleaseCodeOut(BaseModel):
    code: str
    expires_at: datetime


class DeviceMethodsOut(BaseModel):
    face: bool
    qr: bool
    tenant_ids: list[int]


class DeviceFaceEmbeddingOut(BaseModel):
    tenant_id: int
    employee_id: int
    embedding: list[float]
    model_name: str
    model_version: str
    threshold: float


class DeviceFacePunchCreate(BaseModel):
    occurred_at: datetime
    image: str = Field(min_length=1)
    channel: str = Field(min_length=1, max_length=16)
    client_event_id: str | None = Field(default=None, max_length=64)


class DeviceQrPunchCreate(BaseModel):
    occurred_at: datetime
    content: str = Field(min_length=1, max_length=200)
    qr_image: str = Field(min_length=1)
    selfie_image: str = Field(min_length=1)


class DevicePunchOut(BaseModel):
    tenant_id: int
    punch: PunchOut
