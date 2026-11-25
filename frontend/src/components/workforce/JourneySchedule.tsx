import { CalendarRange, Clock, FileText, Timer, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { dayCaption, journeyKindLabel, type JourneyDay } from "@/pages/workforce/journey"
import { showDuration } from "@/utils/labels"

function EmptyMark() {
  return <span className="font-medium text-ui-slate-soft">Não informado</span>
}

function InfoTile({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon
  label: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-ui-line-soft bg-white px-4 py-4">
      <p className="flex items-center gap-2 text-sm text-brand-muted">
        <Icon className="h-4 w-4 text-brand-cta" strokeWidth={1.75} aria-hidden />
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-brand-ink [overflow-wrap:anywhere]">{children}</p>
    </div>
  )
}

export function JourneySchedule({
  name,
  note,
  kind,
  days,
  weeklyMinutes,
  flexible,
  cycleDay,
}: {
  name?: string | null
  note?: string | null
  kind?: string | null
  days?: JourneyDay[]
  weeklyMinutes?: number | null
  flexible?: boolean
  cycleDay?: number | null
}) {
  const resolved = kind || "programada"
  const sequence = days || []
  return (
    <>
      <dl className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <InfoTile icon={Clock} label="Nome">{name?.trim() ? name : <EmptyMark />}</InfoTile>
        <InfoTile icon={FileText} label="Observação">
          <span className="whitespace-pre-wrap">{note?.trim() ? note : <EmptyMark />}</span>
        </InfoTile>
      </dl>
      <div className="mt-6">
        <h3 className="text-base font-semibold text-brand-ink">{journeyKindLabel(resolved)}</h3>
        {resolved === "carga" ? (
          <div className="mt-4">
            <InfoTile icon={Timer} label="Total da semana">{showDuration(weeklyMinutes || 0)}</InfoTile>
          </div>
        ) : null}
        {resolved === "livre" ? (
          <p className="mt-4 rounded-xl border border-dashed border-ui-line-soft px-4 py-6 text-sm text-brand-quiet">Não há dia nem horário. O tempo marcado é o tempo a receber.</p>
        ) : null}
        {resolved === "programada" ? (
          <>
            <dl className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <InfoTile icon={CalendarRange} label="Início da sequência">
                {cycleDay ? `Dia ${cycleDay} da sequência` : <EmptyMark />}
              </InfoTile>
              <InfoTile icon={Clock} label="Tipo de horário">{flexible ? "Flexível" : "Horário contratado"}</InfoTile>
            </dl>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {sequence.map((day, index) => (
                <div key={`${index}-${day.off}`} className="rounded-xl border border-ui-line-soft bg-white px-4 py-4">
                  <p className="text-xs font-semibold text-brand-cta">
                    {String(index + 1).padStart(2, "0")} · {day.off ? "Folga" : "Trabalho"}
                  </p>
                  <p className="mt-2 text-sm text-brand-muted">{day.off ? "Sem horário" : "Horários"}</p>
                  <p className="mt-1 text-lg font-bold tracking-tight text-brand-ink">
                    {day.off ? "Folga" : dayCaption(day, index + 1).replace(/^Dia \d+ · /, "")}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </>
  )
}
