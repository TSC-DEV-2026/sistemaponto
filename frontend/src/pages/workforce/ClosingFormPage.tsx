import { FormEvent, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { DatePickerField, YearPickerField } from "@/components/ui/date-picker-field"
import { Label } from "@/components/ui/label"
import { SiteSelect } from "@/components/ui/site-select"
import { moduleCardClass, moduleLabelClass, modulePrimaryClass, moduleQuietClass } from "@/components/workforce/module-visual"
import { createRecord, updateRecord, type Closing } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/utils/cn"
import { monthOptions, showDate } from "@/utils/labels"

function periodLabel(mode: string, year: string, month: string, startsOn: string, endsOn: string) {
  if (mode === "range") {
    return endsOn ? `${showDate(startsOn)} a ${showDate(endsOn)}` : showDate(startsOn)
  }
  const name = monthOptions.find((item) => item.value === month)?.label || month
  return `${name} de ${year}`
}

export function ClosingFormPage() {
  const navigate = useNavigate()
  const role = useAuthStore((state) => state.user?.role)
  const canManage = role === "admin" || role === "manager"
  const [mode, setMode] = useState("month")
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [startsOn, setStartsOn] = useState("")
  const [endsOn, setEndsOn] = useState("")
  const [error, setError] = useState("")
  const [confirming, setConfirming] = useState(false)
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const busy = useRef(false)

  async function confirmClose() {
    if (busy.current) return
    busy.current = true
    setError("")
    try {
      const body = mode === "range" ? { starts_on: startsOn, ends_on: endsOn || null, note: null } : { year: Number(year), month: Number(month), note: null }
      const created = await createRecord<Closing>("/closings", body)
      await updateRecord("/closings", created.id, { status: "closed" })
      navigate("/closings")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível fechar.")
    } finally {
      busy.current = false
    }
  }

  function askClose(event: FormEvent) {
    event.preventDefault()
    openerRef.current = event.currentTarget.querySelector("button[type='submit']")
    setError("")
    setConfirming(true)
  }

  if (!canManage) {
    return (
      <div className="w-full min-w-0 space-y-5">
        <BackLink to="/closings" appearance="detail" />
        <p className="text-sm text-[#52525B]">Só o gestor ou o administrador fecha o período.</p>
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <BackLink to="/closings" appearance="detail" />
      <ActionForm className={cn(moduleCardClass, "space-y-4")} onSubmit={askClose}>
        <div className="min-w-0 space-y-2">
          <Label className={moduleLabelClass} htmlFor="closing-mode">
            Período
          </Label>
          <SiteSelect
            id="closing-mode"
            value={mode}
            options={[
              { value: "month", label: "Mês civil" },
              { value: "range", label: "Intervalo de datas" },
            ]}
            onChange={setMode}
          />
        </div>
        {mode === "month" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label className={moduleLabelClass} htmlFor="month">
                Mês
              </Label>
              <SiteSelect id="month" value={month} options={monthOptions} onChange={setMonth} />
            </div>
            <div className="min-w-0 space-y-2">
              <Label className={moduleLabelClass} htmlFor="year">
                Ano
              </Label>
              <YearPickerField id="year" value={year} onChange={setYear} required />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DatePickerField id="closing-start" label="De" value={startsOn} onChange={setStartsOn} required />
            <DatePickerField id="closing-end" label="Até" value={endsOn} onChange={setEndsOn} />
          </div>
        )}
        {error && !confirming ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end">
          <Button type="submit" className={modulePrimaryClass} disabled={confirming}>
            Fechar período
          </Button>
        </div>
      </ActionForm>
      <ClosingConfirmDialog
        open={confirming}
        period={periodLabel(mode, year, month, startsOn, endsOn)}
        error={error}
        onClose={() => {
          if (busy.current) return
          setConfirming(false)
        }}
        onConfirm={confirmClose}
        onRest={() => openerRef.current?.focus()}
      />
    </div>
  )
}

export function ClosingConfirmDialog({
  open,
  period,
  error,
  onClose,
  onConfirm,
  onRest,
}: {
  open: boolean
  period: string
  error: string
  onClose: () => void
  onConfirm: () => Promise<void>
  onRest: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const restRef = useRef(onRest)
  const pendingRef = useRef(false)
  const dismissRef = useRef(() => {})
  const [pending, setPending] = useState(false)
  restRef.current = onRest
  const shown = useRef(false)

  function dismiss() {
    if (pendingRef.current) return
    onClose()
  }

  async function confirm() {
    if (pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    try {
      await onConfirm()
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  dismissRef.current = dismiss

  useEffect(() => {
    if (!open) {
      if (shown.current) {
        shown.current = false
        restRef.current()
      }
      return
    }
    shown.current = true
    confirmRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        dismissRef.current()
        return
      }
      if (event.key !== "Tab" || !panelRef.current) return
      const nodes = panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled])")
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(15,23,42,0.45)] p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss()
      }}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="closing-confirm-title"
        aria-describedby="closing-confirm-text"
        className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.18)] sm:p-7"
      >
        <h2 id="closing-confirm-title" className="text-xl font-semibold tracking-tight text-[#0A0A0A]">
          Fechar este período?
        </h2>
        <p id="closing-confirm-text" className="mt-2 text-sm leading-6 text-[#71717A]">
          Depois de fechado, marcação, ajuste, ocorrência, vigência e banco ficam bloqueados até reabrir.
        </p>
        <p className="mt-4 rounded-xl bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#0A0A0A]">{period}</p>
        {error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-[#F1F5F9] pt-5">
          <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} onClick={dismiss} disabled={pending}>
            Cancelar
          </Button>
          <Button ref={confirmRef} type="button" className={modulePrimaryClass} onClick={() => confirm()}>
            Confirmar fechamento
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
