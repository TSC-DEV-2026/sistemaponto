import { FormEvent, useEffect, useState } from "react"
import { Clock, Plus, Save, Trash2 } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { DatePickerField } from "@/components/ui/date-picker-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteSelect } from "@/components/ui/site-select"
import { Spinner } from "@/components/ui/spinner"
import { TimePickerField } from "@/components/ui/time-picker-field"
import { JourneySchedule } from "@/components/workforce/JourneySchedule"
import { moduleCardClass, moduleDangerIconClass, moduleFieldClass, moduleLabelClass, modulePrimaryClass, moduleQuietClass, moduleTextClass } from "@/components/workforce/module-visual"
import { createRecord, getRecord, listRecords, updateRecord, type Employee, type NamedRecord } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/utils/cn"
import { punchDay, showDuration } from "@/utils/labels"
import { catalogs } from "@/pages/workforce/catalogs"
import { journeyKinds, programadaError, standardWeek, weeklyError, type JourneyDay, type JourneyKind } from "@/pages/workforce/journey"

type SpanDraft = { id: string; starts_at: string; ends_at: string }
type DayDraft = { id: string; off: boolean; spans: SpanDraft[] }
type AnchorDraft = { employeeId: number; name: string; cycleDay: string }

function draftId() {
  return crypto.randomUUID()
}

function toDraft(days: JourneyDay[]): DayDraft[] {
  return days.map((day) => ({
    id: draftId(),
    off: day.off,
    spans: (day.off ? [] : day.spans).map((span) => ({ id: draftId(), starts_at: span.starts_at.slice(0, 5), ends_at: span.ends_at.slice(0, 5) })),
  }))
}

function plainDays(days: DayDraft[]): JourneyDay[] {
  return days.map((day) => ({
    off: day.off,
    spans: day.off ? [] : day.spans.map((span) => ({ starts_at: span.starts_at, ends_at: span.ends_at })),
  }))
}

function emptySpan(): SpanDraft {
  return { id: draftId(), starts_at: "", ends_at: "" }
}

async function assignedPeople(journeyId: number) {
  const people: Employee[] = []
  let page = 1
  while (page < 50) {
    const result = await listRecords<Employee>("/employees", { page, limit: 100, journey_id: journeyId })
    people.push(...result.items)
    if (page * 100 >= result.total || result.items.length === 0) break
    page += 1
  }
  return people
}

export function JourneyRecordPage({ mode }: { mode: "new" | "edit" | "view" }) {
  const entry = catalogs.journeys
  const navigate = useNavigate()
  const params = useParams()
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin"
  const id = Number(params.id)
  const [name, setName] = useState("")
  const [note, setNote] = useState("")
  const [kind, setKind] = useState<JourneyKind>("programada")
  const [days, setDays] = useState<DayDraft[]>(() => toDraft(standardWeek()))
  const [weekly, setWeekly] = useState("44:00")
  const [flexible, setFlexible] = useState(false)
  const [tolerance, setTolerance] = useState("10")
  const [validFrom, setValidFrom] = useState(() => punchDay(new Date().toISOString()))
  const [openedLength, setOpenedLength] = useState(7)
  const [openedKind, setOpenedKind] = useState<JourneyKind>("programada")
  const [anchors, setAnchors] = useState<AnchorDraft[]>([])
  const [loaded, setLoaded] = useState(mode === "new")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const lengthChanged = mode === "edit" && openedKind === "programada" && kind === "programada" && days.length !== openedLength

  useEffect(() => {
    if (mode !== "view" && !isAdmin) {
      navigate(mode === "new" ? entry.backTo : `${entry.backTo.split("?")[0]}/journeys/${id}`, { replace: true })
    }
  }, [entry.backTo, id, isAdmin, mode, navigate])

  useEffect(() => {
    if (mode === "new") return
    let active = true
    setLoaded(false)
    setError("")
    getRecord<NamedRecord>("/journeys", id)
      .then((row) => {
        if (!active) return
        const nextKind: JourneyKind = row.kind === "carga" || row.kind === "livre" ? row.kind : "programada"
        const nextDays = row.days && row.days.length > 0 ? toDraft(row.days) : toDraft(standardWeek())
        setName(row.name || "")
        setNote(row.note || "")
        setKind(nextKind)
        setDays(nextDays)
        setOpenedLength(nextDays.length)
        setOpenedKind(nextKind)
        setWeekly(row.weekly_minutes ? showSafe(row.weekly_minutes) : "44:00")
        setFlexible(Boolean(row.flexible))
        setTolerance(String(row.tolerance_minutes ?? 10))
        setLoaded(true)
      })
      .catch((caught: unknown) => {
        if (!active) return
        setError(caught instanceof Error ? caught.message : "Não foi possível carregar.")
        setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [id, mode])

  useEffect(() => {
    if (!lengthChanged) {
      setAnchors([])
      return
    }
    let active = true
    assignedPeople(id)
      .then((people) => {
        if (!active) return
        setAnchors(people.map((person) => ({ employeeId: person.id, name: person.full_name || "Não informado", cycleDay: "" })))
      })
      .catch((caught: unknown) => {
        if (!active) return
        setError(caught instanceof Error ? caught.message : "Não foi possível listar quem está nesta jornada.")
      })
    return () => {
      active = false
    }
  }, [id, lengthChanged])

  function updateDay(dayId: string, change: (day: DayDraft) => DayDraft) {
    setDays((current) => current.map((day) => (day.id === dayId ? change(day) : day)))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Informe o nome")
      return
    }
    if (kind === "programada") {
      const problem = programadaError(plainDays(days))
      if (problem) {
        setError(problem)
        return
      }
      const minutes = Number(tolerance)
      if (!Number.isInteger(minutes) || minutes < 0 || minutes > 120) {
        setError("A tolerância fica entre 0 e 120 minutos")
        return
      }
    }
    if (kind === "carga") {
      const problem = weeklyError(weekly)
      if (problem) {
        setError(problem)
        return
      }
    }
    if (mode === "edit" && !validFrom) {
      setError("Informe a data em que o conteúdo novo passa a valer")
      return
    }
    if (lengthChanged) {
      const missing = anchors.find((item) => {
        const cycle = Number(item.cycleDay)
        return !item.cycleDay || cycle < 1 || cycle > days.length
      })
      if (missing) {
        setError(`Informe o dia da sequência de ${missing.name}.`)
        return
      }
    }
    const body: Record<string, unknown> = {
      name: trimmed,
      note: note.trim() || null,
      kind,
      flexible: kind === "programada" ? flexible : false,
      tolerance_minutes: kind === "programada" ? Number(tolerance) : 10,
    }
    if (kind === "programada") body.days = plainDays(days)
    if (kind === "carga") body.weekly_time = weekly.trim()
    if (mode === "edit") body.valid_from = validFrom
    if (lengthChanged) body.anchors = anchors.map((item) => ({ employee_id: item.employeeId, cycle_day: Number(item.cycleDay) }))
    setSaving(true)
    try {
      if (mode === "new") await createRecord("/journeys", body)
      else await updateRecord("/journeys", id, body)
      navigate(entry.backTo)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.")
    } finally {
      setSaving(false)
    }
  }

  if (mode !== "new" && !loaded) {
    return (
      <div className="w-full min-w-0 space-y-5">
        <BackLink to={entry.backTo} appearance="detail" />
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <section className="flex min-h-[280px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]" role="status" aria-live="polite">
            <Spinner label="Carregando a jornada" className="h-8 w-8 text-[#1E8A3A]" />
            <p className="text-sm font-medium text-[#64748B]">Carregando a jornada</p>
          </section>
        )}
      </div>
    )
  }

  if (mode === "view") {
    return (
      <div className="w-full min-w-0 space-y-5">
        <BackLink to={entry.backTo} appearance="detail" />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <section className="w-full rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-6">
          <h2 className="text-2xl font-bold tracking-tight text-[#111827]">Informações da jornada</h2>
          <JourneySchedule name={name} note={note} kind={kind} days={plainDays(days)} weeklyMinutes={weeklyToMinutes(weekly)} flexible={flexible} toleranceMinutes={Number(tolerance) || 10} />
        </section>
      </div>
    )
  }

  const lead = journeyKinds.find((item) => item.id === kind)?.lead
  return (
    <div className="w-full min-w-0 space-y-5">
      <BackLink to={entry.backTo} appearance="detail" />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ActionForm className={cn(moduleCardClass, "space-y-5")} onSubmit={onSubmit}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
            <Clock className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[#0A0A0A]">{mode === "new" ? entry.newLabel : entry.editTitle}</h2>
            <p className="text-sm text-[#64748B]">{mode === "new" ? "Escolha o tipo e monte a jornada." : "O conteúdo novo vale a partir da data. A apuração anterior permanece."}</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label className={moduleLabelClass} htmlFor="journey-name">Nome</Label>
          <Input id="journey-name" className={moduleFieldClass} required value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className={moduleLabelClass} htmlFor="journey-kind">Tipo</Label>
          <SiteSelect
            id="journey-kind"
            value={kind}
            options={journeyKinds.map((item) => ({ value: item.id, label: item.label }))}
            onChange={(value) => {
              if (value === "programada" || value === "carga" || value === "livre") setKind(value)
            }}
          />
          <p className="text-sm text-[#64748B]">{lead}</p>
        </div>
        {kind === "programada" ? (
          <div className="space-y-3">
            {days.map((day, index) => (
              <section key={day.id} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-[#0A0A0A]">Dia {index + 1}</h3>
                  <div className="flex items-center gap-2">
                    <SiteSelect
                      id={`journey-day-${day.id}`}
                      value={day.off ? "off" : "work"}
                      className="h-10 w-40"
                      options={[{ value: "work", label: "Trabalho" }, { value: "off", label: "Folga" }]}
                      onChange={(value) => updateDay(day.id, (current) => ({ ...current, off: value === "off", spans: value === "off" ? current.spans : current.spans.length > 0 ? current.spans : [emptySpan()] }))}
                    />
                    <Button type="button" variant="outline" className={moduleDangerIconClass} aria-label={`Excluir dia ${index + 1}`} title="Excluir dia" disabled={days.length === 1} onClick={() => setDays((current) => current.filter((item) => item.id !== day.id))}>
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </Button>
                  </div>
                </div>
                {day.off ? <p className="mt-3 text-sm text-[#64748B]">Folga não tem horário.</p> : (
                  <div className="mt-4 space-y-3">
                    {day.spans.map((span, spanIndex) => (
                      <div key={span.id} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                        <TimePickerField id={`journey-${day.id}-${span.id}-start`} label={spanIndex === 0 ? "Entrada" : `Entrada ${spanIndex + 1}`} value={span.starts_at} onChange={(value) => updateDay(day.id, (current) => ({ ...current, spans: current.spans.map((item) => item.id === span.id ? { ...item, starts_at: value } : item) }))} />
                        <TimePickerField id={`journey-${day.id}-${span.id}-end`} label={spanIndex === 0 ? "Saída" : `Saída ${spanIndex + 1}`} value={span.ends_at} onChange={(value) => updateDay(day.id, (current) => ({ ...current, spans: current.spans.map((item) => item.id === span.id ? { ...item, ends_at: value } : item) }))} />
                        <Button type="button" variant="outline" className={cn(moduleDangerIconClass, "mb-0.5")} aria-label="Excluir horário" title="Excluir horário" disabled={day.spans.length === 1} onClick={() => updateDay(day.id, (current) => ({ ...current, spans: current.spans.filter((item) => item.id !== span.id) }))}>
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" className={moduleQuietClass} onClick={() => updateDay(day.id, (current) => ({ ...current, spans: [...current.spans, emptySpan()] }))}>
                      <Plus className="h-4 w-4" />
                      Incluir horário
                    </Button>
                  </div>
                )}
              </section>
            ))}
            <Button type="button" variant="outline" className={moduleQuietClass} onClick={() => setDays((current) => [...current, { id: draftId(), off: false, spans: [emptySpan()] }])}>
              <Plus className="h-4 w-4" />
              Incluir dia
            </Button>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className={moduleLabelClass} htmlFor="journey-flexible">Apuração do dia</Label>
                <SiteSelect id="journey-flexible" value={flexible ? "true" : "false"} options={[{ value: "false", label: "Horário previsto" }, { value: "true", label: "Flexível" }]} onChange={(value) => setFlexible(value === "true")} />
              </div>
              <div className="space-y-2">
                <Label className={moduleLabelClass} htmlFor="journey-tolerance">Tolerância (minutos)</Label>
                <Input id="journey-tolerance" className={moduleFieldClass} inputMode="numeric" value={tolerance} onChange={(event) => setTolerance(event.target.value.replace(/\D/g, "").slice(0, 3))} />
              </div>
            </div>
          </div>
        ) : null}
        {kind === "carga" ? (
          <div className="space-y-2">
            <Label className={moduleLabelClass} htmlFor="journey-weekly">Total da semana</Label>
            <Input id="journey-weekly" className={moduleFieldClass} inputMode="numeric" placeholder="44:00" value={weekly} onChange={(event) => setWeekly(maskWeekly(event.target.value))} required />
            <p className="text-sm text-[#64748B]">A semana corre de segunda a domingo. Exemplo: 44:00.</p>
          </div>
        ) : null}
        {lengthChanged ? (
          <section className="space-y-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div>
              <h3 className="text-base font-semibold text-[#0A0A0A]">Dia da sequência</h3>
              <p className="mt-1 text-sm text-[#64748B]">A quantidade de dias mudou. Informe em qual dia da nova sequência cai a data de cada pessoa.</p>
            </div>
            {anchors.length === 0 ? <p className="text-sm text-[#64748B]">Ninguém está nesta jornada hoje.</p> : anchors.map((person) => (
              <div key={person.employeeId} className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-center">
                <p className="text-sm font-medium text-[#0A0A0A]">{person.name}</p>
                <SiteSelect
                  id={`journey-anchor-${person.employeeId}`}
                  value={person.cycleDay}
                  placeholder="Selecione o dia"
                  options={days.map((item, itemIndex) => ({
                    value: String(itemIndex + 1),
                    label: item.off
                      ? `Dia ${itemIndex + 1} · Folga`
                      : `Dia ${itemIndex + 1} · ${item.spans.filter((span) => span.starts_at && span.ends_at).map((span) => `${span.starts_at}–${span.ends_at}`).join(" · ") || "Trabalho"}`,
                  }))}
                  onChange={(value) => setAnchors((current) => current.map((item) => item.employeeId === person.employeeId ? { ...item, cycleDay: value } : item))}
                />
              </div>
            ))}
          </section>
        ) : null}
        {mode === "edit" ? <DatePickerField id="journey-from" label="Vale a partir de" value={validFrom} required onChange={setValidFrom} /> : null}
        <div className="space-y-2">
          <Label className={moduleLabelClass} htmlFor="journey-note">Observação</Label>
          <textarea id="journey-note" className={moduleTextClass} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <div className="flex justify-end border-t border-[#F1F5F9] pt-5">
          <Button type="submit" className={modulePrimaryClass} disabled={saving}>
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </div>
      </ActionForm>
    </div>
  )
}

function showSafe(minutes: number) {
  return showDuration(minutes)
}

function weeklyToMinutes(value: string) {
  const match = /^(\d{1,3}):(\d{2})$/.exec(value.trim())
  if (!match) return 0
  return Number(match[1]) * 60 + Number(match[2])
}

function maskWeekly(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 5)
  if (digits.length <= 2) return digits
  const minutes = digits.slice(-2)
  const hours = digits.slice(0, -2)
  return `${hours}:${minutes}`
}
