import { AlertTriangle, CheckCircle2, Eye, Timer, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import type { TimeResult } from "@/services/workforce.service"
import { cn } from "@/utils/cn"
import { showClock, showDate, showDuration } from "@/utils/labels"

const weekdays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]
const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]

function capital(value: string) {
  const text = value.trim()
  if (!text) return ""
  return text.charAt(0).toLocaleUpperCase("pt-BR") + text.slice(1)
}

function marks(item: TimeResult) {
  return [item.holiday ? "Feriado" : "", item.absence ? "Falta" : "", item.incomplete ? "Ponto incompleto" : "", ...item.warnings].map(capital).filter(Boolean)
}

export function dayMarks(item: TimeResult) {
  return marks(item).join(" · ")
}

export function calendarParts(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number)
  const date = new Date(year, (month || 1) - 1, day || 1)
  return {
    week: weekdays[date.getDay()] ?? "",
    day: String(day || 0).padStart(2, "0"),
    month: months[(month || 1) - 1] ?? "",
  }
}

export const dayIconClass =
  "group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#E2E8F0] bg-white text-[#64748B] shadow-none transition-[background-color,border-color,color] duration-200 hover:border-[rgba(30,138,58,0.25)] hover:bg-[#EDF6EF] hover:text-[#1E8A3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"

export function DayIconButton({ label, disabled = false, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={cn(dayIconClass, disabled && "pointer-events-none")} disabled={disabled} aria-label={label} onClick={onClick}>
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-xs font-medium text-[#0A0A0A] opacity-0 shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
        {label}
      </span>
    </button>
  )
}

export function dayFilter(item: TimeResult) {
  if (item.absence) return "absence" as const
  if (item.warnings.some((warning) => warning.toLocaleLowerCase("pt-BR").includes("sem jornada prevista"))) return "unscheduled" as const
  return dayStatus(item).kind === "clear" ? "clear" as const : "alert" as const
}

export function dayStatus(item: TimeResult) {
  if (item.absence) return { kind: "absence" as const, label: "Falta" }
  const notes = marks(item)
  if (notes.length === 0 && item.shortage_minutes <= 0 && !item.incomplete) return { kind: "clear" as const, label: "Sem ocorrência" }
  const label = notes[0] || (item.shortage_minutes > 0 ? "Falta de tempo" : "Ponto a conferir")
  return { kind: "alert" as const, label }
}

function situationIcon(label: string): LucideIcon {
  if (label === "Falta") return AlertTriangle
  if (label === "Sem ocorrência") return CheckCircle2
  return Timer
}

export function SituationBadge({ item }: { item: TimeResult }) {
  const labels = marks(item)
  const shown = labels.length > 0 ? labels : ["Sem ocorrência"]
  return (
    <span className="flex min-w-0 max-w-full flex-wrap gap-1.5">
      {shown.map((label) => {
        const Icon = situationIcon(label)
        const absence = label === "Falta"
        const clear = label === "Sem ocorrência"
        return (
          <span
            key={label}
            className={cn(
              "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-left text-xs font-semibold leading-4",
              absence ? "bg-[rgba(239,83,80,0.12)] text-[#C62828]" : clear ? "bg-[rgba(30,138,58,0.10)] text-[#187432]" : "bg-[#FFF6D8] text-[#8A5A00]",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="min-w-0 break-words">{label}</span>
          </span>
        )
      })}
    </span>
  )
}

function Metric({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-[#52525B]">{label}</p>
      <p className={cn("mt-0.5 truncate text-sm font-semibold tabular-nums text-[#0A0A0A]", alert && "text-[#C62828]")}>{value}</p>
    </div>
  )
}

function StatusPill({ item }: { item: TimeResult }) {
  const status = dayStatus(item)
  const tone = status.kind === "absence"
    ? "bg-[#FDECEC] text-[#C62828]"
    : status.kind === "clear"
      ? "bg-[rgba(30,138,58,0.10)] text-[#187432]"
      : "bg-[#FFF6D8] text-[#8A5A00]"
  const Icon = situationIcon(status.label)
  return (
    <span className={cn("inline-flex w-max max-w-full items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-center text-xs font-semibold leading-4", tone)}>
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
      <span className="min-w-0 break-words">{status.label}</span>
    </span>
  )
}

export function ApuracaoDaySummary({
  item,
  onOpen,
  balance,
  actions,
}: {
  item: TimeResult
  onOpen: () => void
  balance?: number | null
  actions?: ReactNode
}) {
  const date = calendarParts(item.work_date)
  const showBank = balance != null
  return (
    <article className="rounded-xl border border-[#E4E8E6] bg-[#F7F8F7] px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-white" aria-hidden>
          <span className="text-[10px] font-semibold tracking-[0.08em] text-[#187432]">{date.week}</span>
          <span className="text-lg font-bold leading-none tabular-nums text-[#0A0A0A]">{date.day}</span>
          <span className="text-[10px] font-semibold tracking-[0.08em] text-[#187432]">{date.month}</span>
        </div>
        <div className="flex w-48 shrink-0 justify-center">
          <StatusPill item={item} />
        </div>
        <div className={cn("grid min-w-0 flex-1 gap-x-3", showBank ? "grid-cols-5" : "grid-cols-4")}>
          <Metric label="Entrada" value={showClock(item.first_entry_at)} />
          <Metric label="Saída" value={showClock(item.last_exit_at)} />
          <Metric label="Hora extra" value={showDuration(item.overtime_minutes)} />
          <Metric label="Falta de tempo" value={showDuration(item.shortage_minutes)} alert={item.shortage_minutes > 0} />
          {showBank ? <Metric label="Banco de horas" value={showDuration(balance)} /> : null}
        </div>
        <div className="flex w-48 shrink-0 flex-wrap items-center justify-end gap-1.5">
          <DayIconButton label="Ver detalhes" onClick={onOpen}>
            <Eye className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </DayIconButton>
          {actions}
        </div>
      </div>
    </article>
  )
}

const detailRows = (item: TimeResult) =>
  [
    ["Primeira entrada", showClock(item.first_entry_at), false],
    ["Última saída", showClock(item.last_exit_at), false],
    ["Horas previstas", showDuration(item.expected_minutes), false],
    ["Horas trabalhadas", showDuration(item.worked_minutes), false],
    ["Atraso", showDuration(item.delay_minutes), false],
    ["Saída antecipada", showDuration(item.early_leave_minutes), false],
    ["Hora extra", showDuration(item.overtime_minutes), false],
    ["Falta de tempo", showDuration(item.shortage_minutes), item.shortage_minutes > 0],
    ["Banco de horas", showDuration(item.bank_minutes), false],
    ["Noturno", showDuration(item.night_minutes), false],
    ["Adicional", showDuration(item.night_additional_minutes), false],
  ] as const

export function ApuracaoDayDetails({ item }: { item: TimeResult }) {
  return (
    <section className="w-full rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-2xl font-bold tracking-tight text-[#111827]">{showDate(item.work_date)}</h3>
        <SituationBadge item={item} />
      </div>
      <h4 className="mt-5 text-base font-semibold text-brand-ink">Demonstrativo de horas</h4>
      <table className="mt-4 w-full text-sm">
        <caption className="sr-only">Demonstrativo de horas do dia</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Descrição</th>
            <th scope="col">Valor</th>
          </tr>
        </thead>
        <tbody>
          {detailRows(item).map(([label, value, alert]) => (
            <tr key={label} className="border-t border-[#F0F0F2]">
              <th scope="row" className="py-3 pr-4 text-left font-normal text-[#52525B]">
                {label}
              </th>
              <td className={cn("py-3 text-right font-semibold tabular-nums text-[#0A0A0A]", alert && "text-[#C62828]")}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
