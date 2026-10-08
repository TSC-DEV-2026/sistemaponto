REPORTS = (
    ("punch", "Ponto"),
    ("journey", "Jornada"),
    ("hour_bank", "Banco de Horas"),
    ("occurrence", "Ocorrências"),
    ("management", "Gestão"),
)

REPORT_NAMES = dict(REPORTS)

OCCURRENCE_TITLES = {
    "adjustment": "Ajuste",
    "punch_entry": "Lançamento",
    "absence": "Falta",
    "certificate": "Atestado",
    "vacation": "Férias",
    "allowance": "Abono",
    "leave": "Afastamento",
}

REQUEST_TITLES = {
    "adjustment": "Ajuste",
    "allowance": "Abono",
    "certificate": "Atestado",
    "leave": "Afastamento",
    "vacation": "Férias",
}

REQUEST_STATUS = {
    "pending": "pendente",
    "approved": "aprovada",
    "rejected": "recusada",
    "cancelled": "cancelada",
}

CLOSING_STATUS = {
    "open": "em conferência",
    "closed": "fechado",
    "cancelled": "cancelado",
}

ENTRY_TITLES = {
    "credit": "Crédito",
    "debit": "Débito",
    "settlement": "Quitação",
}
