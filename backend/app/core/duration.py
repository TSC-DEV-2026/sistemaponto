def show_duration(minutes: int) -> str:
    negative = minutes < 0
    total = abs(int(minutes))
    hours, rest = divmod(total, 60)
    text = f"{hours:02d}:{rest:02d}"
    return f"-{text}" if negative else text
