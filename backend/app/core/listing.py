def name_matches(name: str | None, term: str) -> bool:
    return term.casefold() in (name or "").casefold()


def employee_matches(full_name: str | None, cpf: str | None, term: str) -> bool:
    if name_matches(full_name, term):
        return True
    digits = "".join(character for character in term if character.isdigit())
    return bool(digits) and digits in (cpf or "")


def like_pattern(term: str) -> str:
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"
