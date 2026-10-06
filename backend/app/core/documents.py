from app.core.exceptions import AppError


def normalize_document(value: str | None) -> str | None:
    if value is None or not str(value).strip():
        return None
    digits = "".join(character for character in value if character.isdigit())
    if len(digits) != 14:
        raise AppError(400, "CNPJ inválido")
    return digits
