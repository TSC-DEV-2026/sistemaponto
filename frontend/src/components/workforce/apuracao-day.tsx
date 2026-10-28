import { AlertTriangle, FileText } from "lucide-react"
import { Link } from "react-router-dom"

import type { TimeResult } from "@/services/workforce.service"
import { cn } from "@/utils/cn"
import { showClock, showDuration } from "@/utils/labels"

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

export function SituationBadge({ item }: { item: TimeResult }) {
  const labels = marks(item)
  const shown = labels.length > 0 ? labels : ["Sem ocorrência"]
  return (
    <span className="flex min-w-0 max-w-full flex-wrap gap-1.5">
      {shown.map((label) => {
        const absence = label === "Falta"
        return (
          <span
            key={label}
            className={cn(
              "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-left text-xs font-semibold leading-4",
              absence ? "bg-[rgba(239,83,80,0.12)] text-[#C62828]" : "bg-[#F4F4F5] text-[#52525B]",
            )}
          >
            {absence ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden /> : null}
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
      <p className="text-xs text-[#52525B]">{label}</p>
      <p className={cn("mt-0.5 text-sm font-semibold tabular-nums text-[#0A0A0A]", alert && "text-[#C62828]")}>{value}</p>
    </div>
  )
}

export function ApuracaoDaySummary({ item, to, onOpen }: { item: TimeResult; to: string; onOpen: () => void }) {
  const date = calendarParts(item.work_date)
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] sm:p-[18px] lg:flex-row lg:items-center">
      <div className="flex h-[72px] w-16 shrink-0 flex-col items-center justify-center rounded-[10px] bg-[#F4F4F5]" aria-hidden>
        <span className="text-[10px] font-semibold tracking-[0.08em] text-[#52525B]">{date.week}</span>
        <span className="text-xl font-bold leading-none tabular-nums text-[#0A0A0A]">{date.day}</span>
        <span className="mt-0.5 text-[10px] font-semibold tracking-[0.08em] text-[#52525B]">{date.month}</span>
      </div>
      <div className="min-w-0 flex-1">
        <SituationBadge item={item} />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <Metric label="Entrada" value={showClock(item.first_entry_at)} />
          <Metric label="Saída" value={showClock(item.last_exit_at)} />
          <Metric label="Previsto" value={showDuration(item.expected_minutes)} />
          <Metric label="Trabalhado" value={showDuration(item.worked_minutes)} />
          <Metric label="Falta de tempo" value={showDuration(item.shortage_minutes)} alert={item.shortage_minutes > 0} />
        </div>
      </div>
      <Link
        to={to}
        onClick={onOpen}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[10px] border border-[#D9DEE5] bg-white px-3.5 text-sm font-semibold text-[#0A0A0A] shadow-[0_2px_6px_rgba(15,23,42,0.04)] transition-[background-color,border-color,color,box-shadow] duration-200 hover:border-[rgba(30,138,58,0.45)] hover:bg-[rgba(30,138,58,0.08)] hover:text-[#1E8A3A] hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30 motion-reduce:transition-none"
      >
        <FileText className="h-[17px] w-[17px]" strokeWidth={1.75} aria-hidden />
        Ver detalhes
      </Link>
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
      <h3 className="text-base font-semibold text-brand-ink">Demonstrativo de horas</h3>
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
