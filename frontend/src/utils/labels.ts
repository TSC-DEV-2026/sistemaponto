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
  leave: "Afastamento",
  vacation: "Férias",
}

export const manualTimeOffKinds = ["allowance", "certificate", "leave", "vacation"] as const

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
  afd: "AFD",
}

export const fiscalKindLabel: Record<string, string> = {
  afd: "AFD",
  aej: "AEJ",
  payroll: "Folha",
}

export function punchOrigin(source: string) {
  return punchSourceLabel[source] || source
}

export function brazilMoment(day: string, time: string) {
  return new Date(`${day}T${time}:00-03:00`).toISOString()
}

export function periodText(item: { starts_on?: string | null; ends_on?: string | null; starts_at?: string | null; ends_at?: string | null }) {
  if (item.starts_at && item.ends_at) {
    return `${showDateTime(item.starts_at)} até ${showDateTime(item.ends_at)}`
  }
  if (!item.starts_on) {
    return "—"
  }
  return `${showDate(item.starts_on)} a ${showDate(item.ends_on)}`
}

export function certificateText(item: { cid?: string | null; crm?: string | null; doctor_name?: string | null }) {
  if (!item.cid && !item.crm && !item.doctor_name) {
    return ""
  }
  return `CID ${item.cid || "—"} · CRM ${item.crm || "—"} · ${item.doctor_name || "—"}`
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
  open: "Aberto",
  closed: "Fechado",
  cancelled: "Cancelado",
}

export const closingEventLabel: Record<string, string> = {
  started: "Iniciado",
  closed: "Fechado",
  cancelled: "Cancelado",
  reopened: "Reaberto",
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

export const hourBankKindLabel: Record<string, string> = {
  settlement: "Quitação",
  credit: "Crédito",
  debit: "Débito",
}

export const hourBankEffectLabel: Record<string, string> = {
  overtime: "Hora extra",
  absence: "Falta",
}

export function showMinutes(value: number) {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  if (hours === 0) {
    return `${minutes} min`
  }
  if (minutes === 0) {
    return `${hours} h`
  }
  return `${hours} h ${minutes} min`
}

export function showSignedMinutes(value: number) {
  if (value < 0) {
    return `-${showMinutes(Math.abs(value))}`
  }
  return showMinutes(value)
}

export function showDateTime(value: string | null | undefined) {
  if (!value) {
    return "—"
  }
  return new Date(value).toLocaleString("pt-BR")
}
