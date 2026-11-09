import { Clock, FileText, Timer } from "lucide-react"

import { dayCaption, journeyKindLabel, type JourneyDay } from "@/pages/workforce/journey"
import { showDuration } from "@/utils/labels"

function EmptyMark() {
  return <span className="font-medium text-[#94A3B8]">Não informado</span>
}

export function JourneySchedule({
  name,
  note,
  kind,
  days,
  weeklyMinutes,
  flexible,
  toleranceMinutes,
  cycleDay,
}: {
  name?: string | null
  note?: string | null
  kind?: string | null
  days?: JourneyDay[]
  weeklyMinutes?: number | null
  flexible?: boolean
  toleranceMinutes?: number
  cycleDay?: number | null
}) {
  const resolved = kind || "programada"
  const sequence = days || []
  return (
    <>
      <dl className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-4">
          <p className="flex items-center gap-2 text-sm text-brand-muted"><Clock className="h-4 w-4 text-brand-cta" strokeWidth={1.75} /> Nome</p>
          <p className="mt-1 text-base font-semibold text-brand-ink">{name?.trim() ? name : <EmptyMark />}</p>
        </div>
        <div className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-4">
          <p className="flex items-center gap-2 text-sm text-brand-muted"><FileText className="h-4 w-4 text-brand-cta" strokeWidth={1.75} /> Observação</p>
          <p className="mt-1 whitespace-pre-wrap text-base font-semibold text-brand-ink">{note?.trim() ? note : <EmptyMark />}</p>
        </div>
      </dl>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-brand-ink">{journeyKindLabel(resolved)}</h3>
        {name ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-brand-cta">{name}</span> : null}
      </div>
      {cycleDay ? <p className="mt-2 text-sm text-[#64748B]">Esta vigência começa no dia {cycleDay} da sequência.</p> : null}
      {resolved === "carga" ? (
        <div className="mt-5 rounded-xl border border-[#E4E4E7] bg-white px-4 py-4">
          <p className="flex items-center gap-2 text-sm text-brand-muted"><Timer className="h-4 w-4 text-brand-cta" strokeWidth={1.75} /> Total da semana</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-brand-ink">{showDuration(weeklyMinutes || 0)}</p>
        </div>
      ) : null}
      {resolved === "livre" ? (
        <p className="mt-5 rounded-xl border border-dashed border-[#E4E4E7] px-4 py-6 text-sm text-brand-quiet">Não há dia nem horário. O tempo marcado é o tempo a receber.</p>
      ) : null}
      {resolved === "programada" ? (
        <>
          <p className="mt-2 text-sm text-[#64748B]">
            {flexible ? "Flexível. " : "Horário previsto. "}
            Tolerância de {toleranceMinutes ?? 10} minutos.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sequence.map((day, index) => (
              <div key={`${index}-${day.off}`} className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-4">
                <p className="text-xs font-semibold text-brand-cta">{String(index + 1).padStart(2, "0")} · {day.off ? "Folga" : "Trabalho"}</p>
                <p className="mt-2 text-sm text-brand-muted">{day.off ? "Sem horário" : "Horários"}</p>
                <p className="mt-1 text-lg font-bold tracking-tight text-brand-ink">{day.off ? "Folga" : dayCaption(day, index + 1).replace(/^Dia \d+ · /, "")}</p>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </>
  )
}
