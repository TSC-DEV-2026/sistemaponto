import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { SiteSelect } from "@/components/ui/site-select"
import { Spinner } from "@/components/ui/spinner"
import { ApuracaoDayDetails } from "@/components/workforce/apuracao-day"
import { PunchCorrectionForm } from "@/components/workforce/PunchDay"
import { moduleLabelClass, modulePrimaryClass, moduleTextClass } from "@/components/workforce/module-visual"
import { emptyTimeOff, TimeOffFields, timeOffBody, type TimeOffDraft } from "@/components/workforce/TimeOffFields"
import { createRecord, listRecords, uploadCertificatePhoto, type NamedRecord, type TimeResult } from "@/services/workforce.service"
import { cn } from "@/utils/cn"
import { showDuration } from "@/utils/labels"

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
  const [dayOnly, setDayOnly] = useState(false)
  const [offKind, setOffKind] = useState<"certificate" | "allowance">("certificate")
  const [draft, setDraft] = useState<TimeOffDraft>({ ...emptyTimeOff(), startsOn: day, endsOn: day })
  const [fileKey, setFileKey] = useState(0)
  const [reasonId, setReasonId] = useState("")
  const [note, setNote] = useState("")
  const [reasons, setReasons] = useState<NamedRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
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
    setError("")
    if (lockMessage) {
      setError(lockMessage)
      return
    }
    if (reasons.length > 0 && !reasonId) {
      setError("Selecione o motivo.")
      return
    }
    setSaving(true)
    try {
      await createRecord("/occurrences", {
        employee_id: employeeId,
        kind: "absence",
        starts_on: day,
        ends_on: day,
        reason_id: reasonId ? Number(reasonId) : null,
        note: note.trim() || null,
      })
      await onSaved()
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível lançar a falta.")
    } finally {
      setSaving(false)
    }
  }

  async function saveTimeOff() {
    setError("")
    const blocked = lockRange?.(day, day) || lockMessage
    if (blocked) {
      setError(blocked)
      return
    }
    if (reasons.length > 0 && !reasonId) {
      setError("Selecione o motivo.")
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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível lançar.")
    } finally {
      setSaving(false)
    }
  }

  const balance = dayOnly ? item.bank_minutes : item.balance_minutes

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(15,23,42,0.45)] p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="apuracao-dialog-title" className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 id="apuracao-dialog-title" className="text-xl font-bold tracking-tight text-[#0A0A0A]">{dialogTitle[mode]}</h2>
            <p className="mt-0.5 text-sm text-[#64748B]">{longDate(item.work_date)}</p>
          </div>
          <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#0A0A0A] transition-colors duration-200 hover:bg-[#F4F4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30 motion-reduce:transition-none" aria-label="Fechar" onClick={onClose}>
            <X className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          </button>
        </div>
        <div className="-mx-5 mt-3 min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5 pt-2">
          {mode === "details" ? <ApuracaoDayDetails item={item} /> : null}
          {mode === "details" && item.balance_minutes != null ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E4E4E7] px-4 py-3">
              <p className="text-sm text-[#52525B]">
                {dayOnly ? "Saldo deste dia" : "Saldo acumulado até este dia"}
                <span className="ml-2 font-semibold tabular-nums text-[#0A0A0A]">{showDuration(balance ?? 0)}</span>
              </p>
              <Button type="button" variant="outline" className="h-10" onClick={() => setDayOnly((current) => !current)}>
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
              {lockMessage || error ? <p className="text-sm text-destructive">{lockMessage || error}</p> : null}
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
              {lockMessage || error ? <p className="text-sm text-destructive">{lockMessage || error}</p> : null}
            </div>
          ) : null}
        </div>
        {mode === "details" ? null : (
          <div className="mt-5 flex shrink-0 justify-end">
            {mode === "correct" ? (
              <Button type="submit" form="apuracao-correction" className={modulePrimaryClass} disabled={Boolean(lockMessage)}>
                Corrigir o dia
              </Button>
            ) : null}
            {mode === "absence" ? (
              <Button type="button" className={modulePrimaryClass} disabled={saving || Boolean(lockMessage)} onClick={() => void saveAbsence()}>
                {saving ? <Spinner className="h-4 w-4" /> : null}
                Lançar falta
              </Button>
            ) : null}
            {mode === "timeoff" ? (
              <Button type="button" className={modulePrimaryClass} disabled={saving || Boolean(lockMessage)} onClick={() => void saveTimeOff()}>
                {saving ? <Spinner className="h-4 w-4" /> : null}
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
