REPORTS = (
    ("punch", "Ponto"),
    ("journey", "Jornada"),
    ("hour_bank", "Banco de Horas"),
    ("occurrence", "Ocorrências"),
    ("management", "Gestão"),
    ("marking", "Marcações"),
    ("people", "Pessoas"),
)

REPORT_NAMES = dict(REPORTS)

OCCURRENCE_TITLES = {
    "adjustment": "Ajuste",
    "punch_entry": "Lançamento",
    "absence": "Falta",
    "absences": "Falta",
    "certificate": "Atestado",
    "certificates": "Atestado",
    "vacation": "Férias",
    "vacations": "Férias",
    "allowance": "Abono",
    "allowances": "Abono",
    "leave": "Afastamento",
    "leaves": "Afastamento",
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
    "credit": "Somar ao saldo",
    "debit": "Diminuir o saldo",
    "settlement": "Quitação",
}
