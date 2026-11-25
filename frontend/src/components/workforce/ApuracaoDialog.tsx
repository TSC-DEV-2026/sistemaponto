import { Clock, X, Pencil, RotateCcw, Scale, Plus, Save } from "lucide-react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { SiteSelect } from "@/components/ui/site-select"
import { Spinner } from "@/components/ui/spinner"
import { SlidingHighlight } from "@/components/ui/sliding-highlight"
import { ApuracaoDayDetails } from "@/components/workforce/apuracao-day"
import { PunchCorrectionForm } from "@/components/workforce/PunchDay"
import { moduleLabelClass, modulePrimaryClass, moduleQuietClass, moduleTextClass } from "@/components/workforce/module-visual"
import { DocumentLink, emptyTimeOff, TimeOffFields, timeOffBody, type TimeOffDraft } from "@/components/workforce/TimeOffFields"
import { createRecord, listRecords, uploadCertificatePhoto, type NamedRecord, type Punch, type TimeResult } from "@/services/workforce.service"
import { toastError } from "@/store/toast.store"
import { cn } from "@/utils/cn"
import { punchOrigin, showClock, showDuration } from "@/utils/labels"

export type ApuracaoMode = "details" | "correct" | "absence" | "timeoff"

const dialogTitle: Record<ApuracaoMode, string> = {
  details: "Detalhes do dia",
  correct: "Corrigir marcações",
  absence: "Lançar falta",
  timeoff: "Atestado ou abono",
}

function longDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number)
  return new Date(year, (month || 1) - 1, day || 1).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
}

const detailTabs = [
  { id: "punches", label: "Ponto" },
  { id: "hours", label: "Demonstrativo" },
] as const

async function punchesOnDay(employeeId: number, day: string) {
  const found: Punch[] = []
  let page = 1
  for (;;) {
    const result = await listRecords<Punch>("/punches", {
      employee_id: employeeId,
      starts_on: day,
      ends_on: day,
      page,
      limit: 100,
    })
    found.push(...result.items)
    if (result.items.length === 0 || page * 100 >= result.total || page >= 8) break
    page += 1
  }
  return found.sort((left, right) => left.occurred_at.localeCompare(right.occurred_at))
}

const adjustmentSources = new Set(["manual", "approved_request"])

function DayPunches({ employeeId, day, locked, onRestored }: { employeeId: number; day: string; locked: boolean; onRestored: () => Promise<void> }) {
  const [items, setItems] = useState<Punch[] | null>(null)
  const [reasons, setReasons] = useState<NamedRecord[]>([])
  const [restoring, setRestoring] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    setItems(null)
    punchesOnDay(employeeId, day)
      .then((rows) => {
        if (active) setItems(rows)
      })
      .catch((caught: unknown) => {
        if (!active) return
        toastError(caught instanceof Error ? caught.message : "Não foi possível listar as marcações.")
        setItems([])
      })
    return () => {
      active = false
    }
  }, [employeeId, day, reload])

  useEffect(() => {
    let active = true
    listRecords<NamedRecord>("/reasons", { page: 1, limit: 100, kind: "adjustment", active: true })
      .then((page) => {
        if (active) setReasons(page.items)
      })
      .catch(() => {
        if (active) setReasons([])
      })
    return () => {
      active = false
    }
  }, [])

  const current = (items || []).filter((item) => item.valid)
  const adjusted = current.some((item) => adjustmentSources.has(item.source))
  const reasonId = current.find((item) => item.reason_id)?.reason_id
  const reason = reasons.find((item) => item.id === reasonId)?.name

  async function undo() {
    setRestoring(true)
    try {
      await createRecord("/punches/restorations", { employee_id: employeeId, day })
      setReload((value) => value + 1)
      await onRestored()
    } catch {
      return
    } finally {
      setRestoring(false)
    }
  }

  if (!items) {
    return (
      <div className="flex justify-center rounded-xl border border-ui-line-soft bg-white px-4 py-10" role="status" aria-live="polite">
        <Spinner />
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {adjusted ? (
        <div className="flex flex-col gap-3 rounded-xl border border-warn-glow bg-warn-wash px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-warn-deep">
            Este dia foi ajustado. As marcações abaixo substituem o que a pessoa registrou.
            {reason ? ` Motivo: ${reason}.` : ""}
          </p>
          <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-10 shrink-0")} disabled={restoring || locked} onClick={() => void undo()}>
            {restoring ? <Spinner className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
            Desfazer ajuste
          </Button>
        </div>
      ) : null}
      {current.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ui-line-soft px-4 py-8 text-center text-sm text-brand-quiet">Nenhuma marcação neste dia.</p>
      ) : (
    <ul className="divide-y divide-[rgb(var(--ui-panel))] overflow-hidden rounded-xl border border-ui-line-soft bg-white">
      {current.map((item) => (
        <li key={item.id} className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-cta/10 text-brand-cta">
            <Clock className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold tabular-nums text-ui-ink">{showClock(item.occurred_at)}</span>
            <span className="mt-0.5 block text-xs text-ui-slate">
              {punchOrigin(item.source)}
              {item.channel === "online" ? " · Online" : item.channel === "offline" ? " · Offline" : ""}
            </span>
          </span>
          {item.qr_url || item.selfie_url || item.face_url ? (
            <span className="flex shrink-0 flex-wrap justify-end gap-3 text-xs">
              <DocumentLink href={item.qr_url} label="Ver QR" />
              <DocumentLink href={item.selfie_url} label="Ver selfie" />
              <DocumentLink href={item.face_url} label="Ver rosto" />
            </span>
          ) : null}
        </li>
      ))}
    </ul>
      )}
    </div>
  )
}

export function ApuracaoDialog({
  item,
  employeeId,
  mode,
  lockMessage,
  lockRange,
  onClose,
  onSaved,
}: {
  item: TimeResult
  employeeId: number
  mode: ApuracaoMode
  lockMessage: string
  lockRange?: (start: string, end: string) => string
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const day = item.work_date.slice(0, 10)
  const [detailTab, setDetailTab] = useState<(typeof detailTabs)[number]["id"]>("punches")
  const [dayOnly, setDayOnly] = useState(false)
  const [offKind, setOffKind] = useState<"certificate" | "allowance">("certificate")
  const [draft, setDraft] = useState<TimeOffDraft>({ ...emptyTimeOff(), startsOn: day, endsOn: day })
  const [fileKey, setFileKey] = useState(0)
  const [reasonId, setReasonId] = useState("")
  const [note, setNote] = useState("")
  const [reasons, setReasons] = useState<NamedRecord[]>([])
  const [saving, setSaving] = useState(false)
  const reasonKind = mode === "absence" ? "absence" : mode === "timeoff" ? offKind : ""
  const asksReason = reasonKind === "absence" || reasonKind === "certificate" || reasonKind === "allowance"

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  useEffect(() => {
    if (!asksReason) {
      setReasons([])
      return
    }
    let active = true
    listRecords<NamedRecord>("/reasons", { page: 1, limit: 100, kind: reasonKind, active: true })
      .then((page) => {
        if (active) setReasons(page.items)
      })
      .catch(() => {
        if (active) setReasons([])
      })
    return () => {
      active = false
    }
  }, [asksReason, reasonKind])

  async function saveAbsence() {
    if (lockMessage) {
      toastError(lockMessage)
      return
    }
    if (reasons.length > 0 && !reasonId) {
      toastError("Selecione o motivo.")
      return
    }
    setSaving(true)
    try {
      await createRecord("/occurrences", {
        employee_id: employeeId,
        kind: "absences",
        starts_on: day,
        ends_on: day,
        reason_id: reasonId ? Number(reasonId) : null,
        note: note.trim() || null,
      })
      await onSaved()
      onClose()
    } catch {
      return
    } finally {
      setSaving(false)
    }
  }

  async function saveTimeOff() {
    const blocked = lockRange?.(day, day) || lockMessage
    if (blocked) {
      toastError(blocked)
      return
    }
    if (reasons.length > 0 && !reasonId) {
      toastError("Selecione o motivo.")
      return
    }
    setSaving(true)
    try {
      const span = timeOffBody({ ...draft, startsOn: day, endsOn: day }, offKind)
      if (offKind === "certificate" && draft.photo) {
        span.photo_key = (await uploadCertificatePhoto(draft.photo)).key
      }
      await createRecord("/occurrences", {
        employee_id: employeeId,
        kind: offKind,
        ...span,
        reason_id: reasonId ? Number(reasonId) : null,
        note: note.trim() || null,
      })
      await onSaved()
      onClose()
    } catch {
      return
    } finally {
      setSaving(false)
    }
  }

  const balance = dayOnly ? item.bank_minutes : item.balance_minutes

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(var(--ui-shadow)/0.45)] p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="apuracao-dialog-title" className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgb(var(--ui-shadow)/0.18)]">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 id="apuracao-dialog-title" className="text-xl font-bold tracking-tight text-ui-ink">{dialogTitle[mode]}</h2>
            <p className="mt-0.5 text-sm text-ui-slate">{longDate(item.work_date)}</p>
          </div>
          <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ui-ink transition-colors duration-200 hover:bg-ui-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta/30 motion-reduce:transition-none" aria-label="Fechar" onClick={onClose}>
            <X className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          </button>
        </div>
        <div className="-mx-5 mt-3 min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5 pt-2">
          {mode === "details" ? (
            <div className="flex justify-center">
            <SlidingHighlight className="inline-flex max-w-full rounded-xl bg-ui-line-muted p-1" role="tablist" aria-label="Detalhe do dia">
              {detailTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={detailTab === tab.id}
                  data-slide-active={detailTab === tab.id ? "true" : undefined}
                  className={cn("relative z-10 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none", detailTab === tab.id ? "text-brand-cta" : "text-brand-muted hover:text-ui-ink")}
                  onClick={() => setDetailTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </SlidingHighlight>
            </div>
          ) : null}
          {mode === "details" && detailTab === "punches" ? <DayPunches employeeId={employeeId} day={day} locked={Boolean(lockMessage)} onRestored={onSaved} /> : null}
          {mode === "details" && detailTab === "hours" ? <ApuracaoDayDetails item={item} /> : null}
          {mode === "details" && detailTab === "hours" && item.balance_minutes != null ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ui-line-soft px-4 py-3">
              <p className="text-sm text-brand-muted">
                {dayOnly ? "Saldo deste dia" : "Saldo acumulado até este dia"}
                <span className="ml-2 font-semibold tabular-nums text-ui-ink">{showDuration(balance ?? 0)}</span>
              </p>
              <Button type="button" variant="outline" className="h-10" onClick={() => setDayOnly((current) => !current)}>
                <Scale className="h-4 w-4" />
                {dayOnly ? "Ver saldo acumulado" : "Ver saldo só deste dia"}
              </Button>
            </div>
          ) : null}
          {mode === "correct" ? (
            <PunchCorrectionForm
              employeeId={employeeId}
              appearance="module"
              fixedDay={day}
              formId="apuracao-correction"
              guard={() => lockMessage}
              onSaved={async () => {
                await onSaved()
                onClose()
              }}
            />
          ) : null}
          {mode === "absence" ? (
            <div className="space-y-4">
              {asksReason ? (
                <div className="space-y-2">
                  <Label className={moduleLabelClass} htmlFor="apuracao-absence-reason">Motivo</Label>
                  <SiteSelect id="apuracao-absence-reason" value={reasonId} searchable searchPath="/reasons" searchParams={{ kind: "absence", active: true }} searchPlaceholder="Pesquisar motivo" placeholder="Selecione" className="h-12 w-full shadow-none hover:shadow-none focus-visible:shadow-none" options={reasons.map((reason) => ({ value: String(reason.id), label: reason.name }))} onChange={setReasonId} />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label className={moduleLabelClass} htmlFor="apuracao-absence-note">Observação</Label>
                <textarea id="apuracao-absence-note" className={cn(moduleTextClass, "min-h-24 shadow-none hover:shadow-none focus:shadow-none")} value={note} onChange={(event) => setNote(event.target.value)} />
              </div>
            </div>
          ) : null}
          {mode === "timeoff" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className={moduleLabelClass} htmlFor="apuracao-off-kind">Tipo</Label>
                <SiteSelect
                  id="apuracao-off-kind"
                  value={offKind}
                  className="h-12 w-full shadow-none hover:shadow-none focus-visible:shadow-none"
                  options={[{ value: "certificate", label: "Atestado" }, { value: "allowance", label: "Abono" }]}
                  onChange={(value) => {
                    setOffKind(value as "certificate" | "allowance")
                    setReasonId("")
                    setDraft({ ...emptyTimeOff(), startsOn: day, endsOn: day })
                    setFileKey((current) => current + 1)
                  }}
                />
              </div>
              <TimeOffFields
                idPrefix="apuracao-off"
                kind={offKind}
                draft={draft}
                fileKey={fileKey}
                appearance="module"
                fixedDay
                onChange={(next) => setDraft({ ...next, startsOn: day, endsOn: day })}
              />
              <div className="space-y-2">
                <Label className={moduleLabelClass} htmlFor="apuracao-off-reason">Motivo</Label>
                <SiteSelect id="apuracao-off-reason" value={reasonId} searchable searchPath="/reasons" searchParams={{ kind: offKind, active: true }} searchPlaceholder="Pesquisar motivo" placeholder="Selecione" className="h-12 w-full shadow-none hover:shadow-none focus-visible:shadow-none" options={reasons.map((reason) => ({ value: String(reason.id), label: reason.name }))} onChange={setReasonId} />
              </div>
              <div className="space-y-2">
                <Label className={moduleLabelClass} htmlFor="apuracao-off-note">Observação</Label>
                <textarea id="apuracao-off-note" className={cn(moduleTextClass, "min-h-24 shadow-none hover:shadow-none focus:shadow-none")} value={note} onChange={(event) => setNote(event.target.value)} />
              </div>
            </div>
          ) : null}
        </div>
        {mode === "details" ? null : (
          <div className="mt-5 flex shrink-0 justify-end">
            {mode === "correct" ? (
              <Button type="submit" form="apuracao-correction" className={modulePrimaryClass} disabled={Boolean(lockMessage)}>
                <Pencil className="h-4 w-4" />
                Corrigir o dia
              </Button>
            ) : null}
            {mode === "absence" ? (
              <Button type="button" className={modulePrimaryClass} disabled={saving || Boolean(lockMessage)} onClick={() => void saveAbsence()}>
                {saving ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                Lançar falta
              </Button>
            ) : null}
            {mode === "timeoff" ? (
              <Button type="button" className={modulePrimaryClass} disabled={saving || Boolean(lockMessage)} onClick={() => void saveTimeOff()}>
                {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
