import { api, ensureCsrf } from "@/services/api"
import type { ApiResponse, Page } from "@/types/api"
import { apiErrorMessage } from "@/utils/api-error"

export type NamedRecord = {
  id: number
  name: string
  unit_id?: number
  sector_id?: number
  union_id?: number | null
  kind?: string
  active?: boolean
  morning_start?: string | null
  morning_end?: string | null
  afternoon_start?: string | null
  afternoon_end?: string | null
  note?: string | null
  valid_from?: string | null
  valid_to?: string | null
  holiday_date?: string | null
}

export type Employee = {
  id: number
  full_name: string
  cpf: string
  email: string | null
  person_id: number | null
  admission_date: string
  note: string | null
  hour_bank: boolean
  situation: string | null
  job_label: string | null
  journey_label: string | null
  cost_center_label: string | null
  unit_label: string | null
  sector_label: string | null
  team_label: string | null
  union_label: string | null
  manager_label: string | null
}

export type Vigency = {
  id: number
  employee_id: number
  kind: string
  reference_id: number | null
  label: string
  valid_from: string
  valid_to: string | null
  note: string | null
}

export type Punch = {
  id: number
  employee_id: number
  occurred_at: string
  source: string
  request_id: number | null
  note: string | null
  valid: boolean
  voided_at: string | null
  created_at: string
}

export type Occurrence = {
  id: number
  employee_id: number
  kind: string
  starts_on: string
  ends_on: string
  starts_at: string | null
  ends_at: string | null
  reason_id: number | null
  note: string | null
  source: string
  request_id: number | null
  cid: string | null
  crm: string | null
  doctor_name: string | null
  photo_key: string | null
  photo_url: string | null
  warning: string | null
  created_at: string
}

export type RequestEvent = {
  id: number
  status: string
  note: string | null
  person_id: number
  created_at: string
}

export type TimeRequest = {
  id: number
  employee_id: number
  kind: string
  status: string
  reason_id: number | null
  note: string | null
  starts_on: string | null
  ends_on: string | null
  occurred_at: string | null
  starts_at: string | null
  ends_at: string | null
  cid: string | null
  crm: string | null
  doctor_name: string | null
  photo_key: string | null
  photo_url: string | null
  punches: string[]
  decision_note: string | null
  decided_at: string | null
  decided_by_person_id: number | null
  created_at: string
  events: RequestEvent[]
}

export type ClosingEvent = {
  id: number
  kind: string
  note: string | null
  person_id: number
  created_at: string
}

export type Closing = {
  id: number
  year: number
  month: number
  status: string
  note: string | null
  closed_at: string | null
  closed_by_person_id: number | null
  events: ClosingEvent[]
}

export type Notice = {
  id: number
  person_id: number
  employee_id: number | null
  kind: string
  title: string
  body: string
  read_at: string | null
  created_at: string
}

export type Audit = {
  id: number
  person_id: number
  action: string
  employee_id: number | null
  subject_kind: string
  subject_id: number
  previous_label: string | null
  new_label: string | null
  valid_from: string | null
  created_at: string
}

export type Dashboard = {
  active_employees: number
  punches_today: number
  pending_adjustments: number
  pending_allowances: number
  pending_certificates: number
  pending_leaves: number
  pending_vacations: number
  open_closings: number
  employee_capacity: number
}

export type Payroll = {
  year: number
  month: number
  items: { employee_id: number; full_name: string; punch_count: number }[]
}

export type TimeResult = {
  work_date: string
  expected_minutes: number
  worked_minutes: number
  delay_minutes: number
  early_leave_minutes: number
  overtime_minutes: number
  shortage_minutes: number
  bank_minutes: number
  night_minutes: number
  night_additional_minutes: number
  absence: boolean
  incomplete: boolean
  holiday: boolean
  warnings: string[]
}

export type TimeResults = {
  employee_id: number
  starts_on: string
  ends_on: string
  items: TimeResult[]
}

export type HourBank = {
  employee_id: number
  balance_minutes: number
  credit_minutes: number
  debit_minutes: number
  paid_overtime_minutes: number
  discounted_absence_minutes: number
  warning: string | null
}

export type HourBankEntry = {
  id: number
  employee_id: number
  kind: string
  minutes: number
  effect: string | null
  note: string | null
  entry_on: string
  created_by_person_id: number
  created_at: string
}

async function read<T>(work: () => Promise<{ data: ApiResponse<T> }>): Promise<T> {
  try {
    const response = await work()
    return response.data.data as T
  } catch (error) {
    throw new Error(apiErrorMessage(error))
  }
}

function write<T>(work: () => Promise<{ data: ApiResponse<T> }>): Promise<T> {
  return ensureCsrf().then(() => read(work))
}

export function listRecords<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
  return read<Page<T>>(() => api.get<ApiResponse<Page<T>>>(path, { params }))
}

export function getRecord<T>(path: string, id: number) {
  return read<T>(() => api.get<ApiResponse<T>>(`${path}/${id}`))
}

export function uploadCertificatePhoto(file: File) {
  const body = new FormData()
  body.append("file", file)
  return write<{ key: string }>(() => api.post<ApiResponse<{ key: string }>>("/certificate-photos", body))
}

export function createRecord<T>(path: string, body: Record<string, unknown>) {
  return write<T>(() => api.post<ApiResponse<T>>(path, body))
}

export function updateRecord<T>(path: string, id: number, body: Record<string, unknown>) {
  return write<T>(() => api.put<ApiResponse<T>>(`${path}/${id}`, body))
}

export function removeRecord(path: string, id: number) {
  return write<null>(() => api.delete<ApiResponse<null>>(`${path}/${id}`))
}

export function getDashboard() {
  return read<Dashboard>(() => api.get<ApiResponse<Dashboard>>("/dashboard"))
}

export function getPayroll(year: number, month: number) {
  return read<Payroll>(() => api.get<ApiResponse<Payroll>>("/payroll-totals", { params: { year, month } }))
}

export function getHourBank(employeeId: number) {
  return read<HourBank>(() => api.get<ApiResponse<HourBank>>("/hour-bank", { params: { employee_id: employeeId } }))
}

export function getTimeResults(employeeId: number, startsOn: string, endsOn: string) {
  return read<TimeResults>(() =>
    api.get<ApiResponse<TimeResults>>("/time-results", {
      params: { employee_id: employeeId, starts_on: startsOn, ends_on: endsOn },
    }),
  )
}
