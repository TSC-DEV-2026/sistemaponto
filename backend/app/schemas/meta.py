from pydantic import BaseModel


class ResourceOut(BaseModel):
    name: str
    fields: list[str]
    list_fields: list[str]
