import { showDuration } from "@/utils/labels"

export type JourneyKind = "programada" | "carga" | "livre"

export type JourneySpan = { starts_at: string; ends_at: string }

export type JourneyDay = { off: boolean; spans: JourneySpan[] }

export const journeyKinds: { id: JourneyKind; label: string; lead: string }[] = [
  { id: "programada", label: "Programada", lead: "Uma sequência de dias de trabalho e folga. Ela se repete." },
  { id: "carga", label: "Carga", lead: "Um total de horas na semana, de segunda a domingo." },
  { id: "livre", label: "Livre", lead: "O tempo marcado é o tempo a receber." },
]

export function journeyKindLabel(kind?: string | null) {
  return journeyKinds.find((item) => item.id === kind)?.label || "Programada"
}

export function journeyDetail(item: {
  kind?: string
  days?: JourneyDay[]
  weekly_minutes?: number | null
  flexible?: boolean
  morning_start?: string | null
  morning_end?: string | null
  afternoon_start?: string | null
  afternoon_end?: string | null
}) {
  if (item.kind === "carga") return `Carga · ${showDuration(item.weekly_minutes || 0)} por semana`
  if (item.kind === "livre") return "Livre"
  if (item.kind === "programada" || (item.days && item.days.length > 0)) {
    const days = item.days || []
    const work = days.find((day) => !day.off && day.spans.length > 0)
    const clocks = work ? work.spans.map((span) => `${span.starts_at.slice(0, 5)}–${span.ends_at.slice(0, 5)}`).join(" · ") : ""
    const count = days.length
    const size = count === 1 ? "1 dia" : `${count} dias`
    return `Programada · ${size}${clocks ? ` · ${clocks}` : ""}${item.flexible ? " · Flexível" : ""}`
  }
  if (item.morning_start !== undefined || item.morning_end !== undefined || item.afternoon_start !== undefined || item.afternoon_end !== undefined) {
    const hour = (value?: string | null) => (value ? value.slice(0, 5) : "Não informado")
    return `${hour(item.morning_start)}–${hour(item.morning_end)} / ${hour(item.afternoon_start)}–${hour(item.afternoon_end)}`
  }
  return ""
}

export function dayCaption(day: JourneyDay, position: number) {
  if (day.off || day.spans.length === 0) return `Dia ${position} · Folga`
  const clocks = day.spans.map((span) => `${span.starts_at.slice(0, 5)}–${span.ends_at.slice(0, 5)}`).join(" · ")
  return `Dia ${position} · ${clocks}`
}

export function isoWeekday(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return 1
  const weekday = new Date(year, month - 1, day).getDay()
  return weekday === 0 ? 7 : weekday
}

export function resultNote(kind?: string | null) {
  const shared = "Feriado, férias, afastamento, abono integral e atestado integral ficam por cima do tipo. O adicional noturno não entra no banco."
  if (kind === "carga") return `Carga. De segunda a sábado aparece o tempo trabalhado. No domingo, ou no último dia em que a carga vale na semana, o total vira hora extra ou falta de tempo. ${shared}`
  if (kind === "livre") return `Livre. O tempo marcado é o tempo a receber. Dia sem marcação fica em zero, sem falta. ${shared}`
  if (kind === "programada") return `Programada. O dia segue a sequência da vigência. A tolerância e a flexível são as desta jornada. Folga trabalhada vira hora extra. ${shared}`
  return `A apuração segue a jornada vigente: programada, carga ou livre. ${shared}`
}

function minutesOf(clock: string) {
  const [hour, minute] = clock.split(":").map(Number)
  return hour * 60 + minute
}

export function programadaError(days: JourneyDay[]) {
  if (days.length < 1) return "Informe os dias da jornada"
  for (let index = 0; index < days.length; index += 1) {
    const day = days[index]
    const label = `Dia ${index + 1}`
    if (day.off) continue
    if (day.spans.length === 0) return `${label}: dia de trabalho precisa de entrada e saída`
    let previous = -1
    let overnight = false
    for (const span of day.spans) {
      if (!/^\d{2}:\d{2}$/.test(span.starts_at) || !/^\d{2}:\d{2}$/.test(span.ends_at)) return `${label}: informe a entrada e a saída`
      if (overnight) return `${label}: o turno que passa da meia-noite encerra o dia`
      const begin = minutesOf(span.starts_at)
      let finish = minutesOf(span.ends_at)
      if (begin > 23 * 60 + 59 || finish > 23 * 60 + 59) return `${label}: informe a entrada e a saída`
      if (finish <= begin) {
        finish += 24 * 60
        overnight = true
      }
      if (begin < previous) return `${label}: os horários se sobrepõem`
      previous = finish
    }
  }
  return ""
}

export function weeklyError(value: string) {
  const match = /^(\d{1,3}):(\d{2})$/.exec(value.trim())
  if (!match) return "Carga inválida"
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 168 || minutes > 59 || hours * 60 + minutes <= 0) return "Carga inválida"
  return ""
}

export function standardWeek(): JourneyDay[] {
  return Array.from({ length: 7 }, (_, index) => ({
    off: index >= 5,
    spans: index >= 5 ? [] : [
      { starts_at: "08:00", ends_at: "12:00" },
      { starts_at: "13:30", ends_at: "17:30" },
    ],
  }))
}
