import { History, Trash2 } from "lucide-react"
import { FormEvent, useState } from "react"

import { ActionForm } from "@/components/ui/action-form"
import { Button } from "@/components/ui/button"
import { EmployeeCombobox } from "@/components/workforce/employee-combobox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ListPlaceholder } from "@/components/ui/list-placeholder"
import { fieldClass } from "@/components/workforce/CatalogPanel"
import { FilterSelect, ListPager, usePagedList } from "@/components/workforce/list-controls"
import { DocumentLink } from "@/components/workforce/TimeOffFields"
import { createRecord, type Employee, type Punch } from "@/services/workforce.service"
import { brazilMoment, punchOrigin, showClock, showDateTime } from "@/utils/labels"

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
                <Trash2 className="h-4 w-4" />
                Remover
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
    <ActionForm className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={onSubmit}>
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
    </ActionForm>
  )
}

function momentParts(value: string | null | undefined) {
  if (!value) return { day: "—", time: "—" }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { day: showDateTime(value), time: "—" }
  return { day: date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }), time: showClock(value) }
}

function punchExtra(item: Punch) {
  const bits = [
    item.channel === "online" ? "online" : item.channel === "offline" ? "offline" : "",
    item.note || "",
    item.voided_at ? `deixou de valer em ${showDateTime(item.voided_at)}` : "",
  ].filter(Boolean)
  return bits.join(" · ")
}

export function PunchLists({ employeeId, employees, reloadKey = 0, appearance }: { employeeId?: number; employees?: Employee[]; reloadKey?: number; appearance?: "module" }) {
  const [person, setPerson] = useState(employeeId ? String(employeeId) : "")
  const chosen = employeeId ?? (person ? Number(person) : undefined)
  const scope = chosen ? { employee_id: chosen } : {}
  const current = usePagedList<Punch>("/punches", { ...scope, valid: true }, true, reloadKey)
  const history = usePagedList<Punch>("/punches", { ...scope, valid: false }, true, reloadKey)
  const employeeName = employees ? (id: number) => employees.find((item) => item.id === id)?.full_name || String(id) : undefined

  if (appearance === "module") {
    return (
      <div className="space-y-4">
        <section className="rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-6">
          <h2 className="text-lg font-semibold text-brand-ink">Marcações</h2>
          {employeeId ? null : (
            <div className="mt-5 w-full space-y-2">
              <Label className="text-sm font-semibold text-[#1B2534]" htmlFor="punch-employee">
                Funcionário
              </Label>
              <EmployeeCombobox id="punch-employee" value={person} employees={employees || []} extendSearch={(employees || []).length >= 100} onChange={setPerson} />
            </div>
          )}
          <h3 className="mt-6 text-sm font-semibold text-brand-ink">Marcações que valem</h3>
          {current.error ? <p className="mt-3 text-sm text-destructive">{current.error}</p> : null}
          <PunchTable className="mt-3" empty="Nenhuma marcação válida." loading={current.loading} punches={current.items} employeeName={employeeName} />
          {current.total > 0 ? (
            <div className="mt-4 border-t border-[#F0F0F2] pt-4">
              <ListPager page={current.page} pageSize={current.pageSize} total={current.total} onPage={current.setPage} onPageSize={current.setPageSize} tone="module" />
            </div>
          ) : null}
        </section>
        <section className="rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-6">
          <h2 className="text-base font-semibold text-brand-ink">Histórico — deixaram de valer</h2>
          {history.error ? <p className="mt-3 text-sm text-destructive">{history.error}</p> : null}
          <PunchTable className="mt-4" empty="Nenhuma marcação antiga." loading={history.loading} punches={history.items} employeeName={employeeName} quietEmpty />
          {history.total > 0 ? (
            <div className="mt-4 border-t border-[#F0F0F2] pt-4">
              <ListPager page={history.page} pageSize={history.pageSize} total={history.total} onPage={history.setPage} onPageSize={history.setPageSize} tone="module" />
            </div>
          ) : null}
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {employeeId ? null : (
        <FilterSelect
          id="punch-employee"
          label="Funcionário"
          value={person}
          options={(employees || []).map((item) => ({ value: String(item.id), label: item.full_name }))}
          onChange={setPerson}
        />
      )}
      <PunchGroup title="Marcações que valem" empty="Nenhuma marcação válida." loading={current.loading} punches={current.items} employeeName={employeeName} />
      <ListPager page={current.page} pageSize={current.pageSize} total={current.total} onPage={current.setPage} onPageSize={current.setPageSize} />
      {current.error ? <p className="text-sm text-destructive">{current.error}</p> : null}
      <PunchGroup title="Histórico — deixaram de valer" empty="Nenhuma marcação antiga." loading={history.loading} punches={history.items} employeeName={employeeName} />
      <ListPager page={history.page} pageSize={history.pageSize} total={history.total} onPage={history.setPage} onPageSize={history.setPageSize} />
      {history.error ? <p className="text-sm text-destructive">{history.error}</p> : null}
    </div>
  )
}

function PunchTable({
  className,
  empty,
  loading,
  punches,
  employeeName,
  quietEmpty = false,
}: {
  className?: string
  empty: string
  loading: boolean
  punches: Punch[]
  employeeName?: (id: number) => string
  quietEmpty?: boolean
}) {
  if (punches.length === 0) {
    if (quietEmpty && !loading) {
      return (
        <div className={`${className || ""} flex items-center gap-3 rounded-xl border border-[#E4E4E7] px-4 py-4 text-sm text-brand-quiet`}>
          <History className="h-4 w-4 shrink-0" aria-hidden />
          <p>{empty}</p>
        </div>
      )
    }
    return (
      <ul className={className}>
        <ListPlaceholder loading={loading} empty={empty} className="rounded-xl border border-dashed border-[#E4E4E7] px-4 py-8 text-center" />
      </ul>
    )
  }
  return (
    <div className={`${className || ""} overflow-x-auto rounded-xl border border-[#E4E4E7]`}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-[#F4F4F5] text-brand-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Funcionário</th>
            <th className="px-4 py-3 font-medium">Data</th>
            <th className="px-4 py-3 font-medium">Hora</th>
            <th className="px-4 py-3 font-medium">Origem</th>
          </tr>
        </thead>
        <tbody>
          {punches.map((item) => {
            const when = momentParts(item.occurred_at)
            const extra = punchExtra(item)
            return (
              <tr key={item.id} className="border-t border-[#F0F0F2]">
                <td className="px-4 py-3 align-top text-brand-ink">{employeeName ? employeeName(item.employee_id) : item.employee_id}</td>
                <td className="px-4 py-3 align-top text-brand-muted">{when.day}</td>
                <td className="px-4 py-3 align-top font-semibold tabular-nums text-brand-ink">{when.time}</td>
                <td className="px-4 py-3 align-top text-brand-quiet">
                  <span>{punchOrigin(item.source)}</span>
                  {extra ? <span className="mt-1 block text-xs text-brand-quiet">{extra}</span> : null}
                  {item.qr_url || item.selfie_url || item.face_url ? (
                    <span className="mt-1 flex flex-wrap gap-3">
                      <DocumentLink href={item.qr_url} label="Ver QR" />
                      <DocumentLink href={item.selfie_url} label="Ver selfie" />
                      <DocumentLink href={item.face_url} label="Ver rosto" />
                    </span>
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function PunchGroup({
  title,
  empty,
  loading = false,
  punches,
  employeeName,
}: {
  title: string
  empty: string
  loading?: boolean
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
            {item.qr_url || item.selfie_url || item.face_url ? (
              <span className="mt-1 flex flex-wrap gap-3">
                <DocumentLink href={item.qr_url} label="Ver QR" />
                <DocumentLink href={item.selfie_url} label="Ver selfie" />
                <DocumentLink href={item.face_url} label="Ver rosto" />
              </span>
            ) : null}
          </li>
        ))}
        {punches.length === 0 ? <ListPlaceholder loading={loading ?? false} empty={empty} /> : null}
      </ul>
    </section>
  )
}
