from app.core.exceptions import AppError


def normalize_cpf(value: str) -> str:
    digits = "".join(character for character in value if character.isdigit())
    if len(digits) != 11:
        raise AppError(400, "CPF inválido")
    return digits


def normalize_email(value: str) -> str:
    return value.strip().lower()
