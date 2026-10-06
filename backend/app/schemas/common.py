from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ErrorBody(BaseModel):
    message: str


class Envelope(BaseModel, Generic[T]):
    data: T | None = None
    error: ErrorBody | None = None


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    limit: int


class MessageOut(BaseModel):
    message: str

    model_config = ConfigDict(from_attributes=True)
