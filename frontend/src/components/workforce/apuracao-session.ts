import type { TimeResult, TimeResults } from "@/services/workforce.service"

const STORAGE_KEY = "sistemaponto.apuracao"

export type ApuracaoQuery = {
  tenantId: number
  employeeId: number
  startsOn: string
  endsOn: string
  result: TimeResults
  scrollY: number
  scrollPending: boolean
}

let memory: ApuracaoQuery | null = null

function dayKey(value: string) {
  return value.slice(0, 10)
}

function isResultItem(value: unknown): value is TimeResult {
  if (!value || typeof value !== "object") return false
  const row = value as TimeResult
  return (
    typeof row.work_date === "string" &&
    typeof row.expected_minutes === "number" &&
    typeof row.worked_minutes === "number" &&
    typeof row.delay_minutes === "number" &&
    typeof row.early_leave_minutes === "number" &&
    typeof row.overtime_minutes === "number" &&
    typeof row.shortage_minutes === "number" &&
    typeof row.bank_minutes === "number" &&
    typeof row.night_minutes === "number" &&
    typeof row.night_additional_minutes === "number" &&
    typeof row.absence === "boolean" &&
    typeof row.incomplete === "boolean" &&
    typeof row.holiday === "boolean" &&
    Array.isArray(row.warnings) &&
    row.warnings.every((warning) => typeof warning === "string") &&
    (row.first_entry_at == null || typeof row.first_entry_at === "string") &&
    (row.last_exit_at == null || typeof row.last_exit_at === "string")
  )
}

function isQuery(value: unknown): value is ApuracaoQuery {
  if (!value || typeof value !== "object") return false
  const row = value as ApuracaoQuery
  return (
    typeof row.tenantId === "number" &&
    typeof row.employeeId === "number" &&
    typeof row.startsOn === "string" &&
    typeof row.endsOn === "string" &&
    typeof row.scrollY === "number" &&
    typeof row.scrollPending === "boolean" &&
    !!row.result &&
    row.result.employee_id === row.employeeId &&
    Array.isArray(row.result.items) &&
    row.result.items.every(isResultItem)
  )
}

function write(next: ApuracaoQuery) {
  memory = next
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    memory = next
  }
}

export function saveApuracaoQuery(next: ApuracaoQuery) {
  write({
    ...next,
    startsOn: dayKey(next.startsOn),
    endsOn: dayKey(next.endsOn),
    result: {
      ...next.result,
      starts_on: dayKey(next.result.starts_on),
      ends_on: dayKey(next.result.ends_on),
      items: next.result.items.map((item) => ({ ...item, work_date: dayKey(item.work_date) })),
    },
  })
}

export function readApuracaoQuery(tenantId: number | null | undefined) {
  if (!tenantId) return null
  if (memory?.tenantId === tenantId && isQuery(memory)) return memory
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isQuery(parsed) || parsed.tenantId !== tenantId) return null
    memory = parsed
    return parsed
  } catch {
    return null
  }
}

export function rememberApuracaoScroll(scrollY: number) {
  if (!memory) return
  write({ ...memory, scrollY, scrollPending: true })
}

export function apuracaoDay(tenantId: number | null | undefined, employeeId: number, startsOn: string, endsOn: string, workDate: string) {
  const saved = readApuracaoQuery(tenantId)
  if (!saved) return null
  if (saved.employeeId !== employeeId || saved.startsOn !== dayKey(startsOn) || saved.endsOn !== dayKey(endsOn)) return null
  return saved.result.items.find((item) => item.work_date === dayKey(workDate)) ?? null
}
