export const situationLabel: Record<string, string> = {
  active: "Ativo",
  dismissed: "Desligado",
}

export const requestStatusLabel: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Recusada",
  cancelled: "Cancelada",
}

export const requestKindLabel: Record<string, string> = {
  adjustment: "Ajuste",
  allowance: "Abono",
  certificate: "Atestado",
}

export const occurrenceKindLabel: Record<string, string> = {
  adjustment: "Ajuste de ponto",
  punch_entry: "Lançamento de marcação",
  absence: "Falta",
  certificate: "Atestado",
  vacation: "Férias",
  allowance: "Abono",
  leave: "Afastamento",
}

export const vigencyKindLabel: Record<string, string> = {
  job: "Cargo",
  journey: "Jornada",
  cost_center: "Centro de custo",
  unit: "Unidade",
  sector: "Setor",
  team: "Equipe",
  union: "Sindicato",
  manager: "Gestor",
  status: "Situação",
}

export const punchSourceLabel: Record<string, string> = {
  employee: "Funcionário",
  admin: "Manual",
  manual: "Manual",
  approved_request: "Solicitação",
}

export function punchOrigin(source: string) {
  return punchSourceLabel[source] || source
}

export function brazilMoment(day: string, time: string) {
  return new Date(`${day}T${time}:00-03:00`).toISOString()
}

export function punchDay(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value))
}

export const closingStatusLabel: Record<string, string> = {
  open: "Em conferência",
  closed: "Fechado",
}

export const reasonKindLabel: Record<string, string> = {
  adjustment: "Ajustes",
  absence: "Faltas",
  allowance: "Abonos",
  certificate: "Atestados",
}

export function showDate(value: string | null | undefined) {
  if (!value) {
    return "—"
  }
  const [year, month, day] = value.slice(0, 10).split("-")
  if (!year || !month || !day) {
    return value
  }
  return `${day}/${month}/${year}`
}

export function showDateTime(value: string | null | undefined) {
  if (!value) {
    return "—"
  }
  return new Date(value).toLocaleString("pt-BR")
}
