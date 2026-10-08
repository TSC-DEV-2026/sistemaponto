def render_code(unit_id: int, cpf: str, registration: str) -> str:
    return f"{unit_id}|{cpf}|{registration}"


def read_code(content: str) -> tuple[int, str, str] | None:
    parts = str(content).split("|")
    if len(parts) != 3 or not parts[0].isdigit() or not parts[2]:
        return None
    return int(parts[0]), parts[1], parts[2]
