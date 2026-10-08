import { FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fieldClass } from "@/components/workforce/CatalogPanel"
import { createRecord, type Employee, type Punch } from "@/services/workforce.service"
import { brazilMoment, punchOrigin, showDateTime } from "@/utils/labels"

export function momentsOf(day: string, times: string[]) {
  const filled = times.map((item) => item.trim()).filter(Boolean)
  if (!day || filled.length === 0) {
    throw new Error("Informe o dia e ao menos uma marcação.")
  }
  return filled.map((time) => brazilMoment(day, time))
}

export function DayTimesFields({
  dayId,
  day,
  times,
  onDay,
  onTimes,
}: {
  dayId: string
  day: string
  times: string[]
  onDay: (value: string) => void
  onTimes: (value: string[]) => void
}) {
  function changeTime(index: number, value: string) {
    onTimes(times.map((item, position) => (position === index ? value : item)))
  }

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={dayId}>Dia</Label>
        <input id={dayId} className={fieldClass} type="date" value={day} onChange={(event) => onDay(event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Marcações do dia</Label>
        {times.map((time, index) => (
          <div key={index} className="flex gap-2">
            <input className={fieldClass} type="time" value={time} aria-label={`Marcação ${index + 1}`} onChange={(event) => changeTime(index, event.target.value)} required={index === 0} />
            {times.length > 1 ? (
              <Button type="button" variant="outline" onClick={() => onTimes(times.filter((_, position) => position !== index))}>
                Tirar
              </Button>
            ) : null}
          </div>
        ))}
        {times.length < 20 ? (
          <Button type="button" variant="outline" size="sm" onClick={() => onTimes([...times, ""])}>
            Incluir horário
          </Button>
        ) : null}
      </div>
    </>
  )
}

export function PunchCorrectionForm({
  employees,
  employeeId,
  onSaved,
}: {
  employees?: Employee[]
  employeeId?: number
  onSaved: () => Promise<void>
}) {
  const [selected, setSelected] = useState("")
  const [day, setDay] = useState("")
  const [times, setTimes] = useState(["", ""])
  const [note, setNote] = useState("")
  const [error, setError] = useState("")

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      await createRecord("/punches/corrections", {
        employee_id: employeeId ?? Number(selected),
        punches: momentsOf(day, times),
        note: note.trim() || null,
      })
      setTimes(["", ""])
      setNote("")
      await onSaved()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível corrigir.")
    }
  }

  return (
    <form className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={onSubmit}>
      <p className="text-sm text-muted-foreground">A correção manual substitui as marcações que valem neste dia. As antigas deixam de valer e ficam no histórico. Origem: manual.</p>
      {employees ? (
        <div className="space-y-2">
          <Label htmlFor="correction-employee">Funcionário</Label>
          <select id="correction-employee" className={fieldClass} value={selected} onChange={(event) => setSelected(event.target.value)} required>
            <option value="">Selecione</option>
            {employees.map((item) => (
              <option key={item.id} value={item.id}>
                {item.full_name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <DayTimesFields dayId="correction-day" day={day} times={times} onDay={setDay} onTimes={setTimes} />
      <div className="space-y-2">
        <Label htmlFor="correction-note">Observação</Label>
        <Input id="correction-note" value={note} onChange={(event) => setNote(event.target.value)} />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit">Corrigir o dia</Button>
    </form>
  )
}

export function PunchLists({ punches, employeeName }: { punches: Punch[]; employeeName?: (id: number) => string }) {
  const current = punches.filter((item) => item.valid !== false).sort(byTime)
  const history = punches.filter((item) => item.valid === false).sort(byTime)

  return (
    <div className="space-y-4">
      <PunchGroup title="Marcações que valem" empty="Nenhuma marcação válida." punches={current} employeeName={employeeName} />
      <PunchGroup title="Histórico — deixaram de valer" empty="Nenhuma marcação antiga." punches={history} employeeName={employeeName} />
    </div>
  )
}

function PunchGroup({
  title,
  empty,
  punches,
  employeeName,
}: {
  title: string
  empty: string
  punches: Punch[]
  employeeName?: (id: number) => string
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium">{title}</h2>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {punches.map((item) => (
          <li key={item.id} className="px-4 py-3 text-sm">
            {employeeName ? `${employeeName(item.employee_id)} · ` : ""}
            {showDateTime(item.occurred_at)} · {punchOrigin(item.source)}
            {item.channel === "online" ? " · online" : item.channel === "offline" ? " · offline" : ""}
            {item.note ? ` · ${item.note}` : ""}
            {item.voided_at ? ` · deixou de valer em ${showDateTime(item.voided_at)}` : ""}
          </li>
        ))}
        {punches.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">{empty}</li> : null}
      </ul>
    </section>
  )
}

function byTime(left: Punch, right: Punch) {
  return left.occurred_at.localeCompare(right.occurred_at)
}
