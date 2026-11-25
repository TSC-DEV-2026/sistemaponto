import { FormEvent, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Check, CircleCheck, Filter, Search, X, Lock } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { DatePickerField, YearPickerField } from "@/components/ui/date-picker-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteSelect } from "@/components/ui/site-select"
import { Spinner } from "@/components/ui/spinner"
import { ListPager } from "@/components/workforce/list-controls"
import { moduleCardClass, moduleFieldClass, moduleLabelClass, modulePrimaryClass, moduleQuietClass } from "@/components/workforce/module-visual"
import { OrganizationFilterFields, useOrganizationFilters } from "@/components/workforce/organization-filters"
import { api, ensureCsrf } from "@/services/api"
import { closingCandidates, type Closing, type ClosingCandidate } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { toastError, toastSuccess } from "@/store/toast.store"
import { apiErrorMessage, apiErrorPeople } from "@/utils/api-error"
import type { ApiResponse } from "@/types/api"
import { cn } from "@/utils/cn"
import { monthOptions, showDate } from "@/utils/labels"

function registration(value: string | null) {
  return value?.trim() ? value : "Não informada"
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function closingNotice(message: string) {
  if (message === "Há ponto incompleto no período") return "Ponto incompleto"
  if (message === "Há pessoas que já estão em um fechamento deste período") return "Já está em um fechamento"
  if (message === "Há solicitação pendente no período") return "Solicitação pendente"
  if (message === "Há conflito entre abono ou atestado e marcação no período") return "Conflito no período"
  return ""
}

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
  const places = useOrganizationFilters(canManage)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [personDraft, setPersonDraft] = useState("")
  const [person, setPerson] = useState("")
  const [candidates, setCandidates] = useState<ClosingCandidate[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [peopleReady, setPeopleReady] = useState(false)
  const [chosen, setChosen] = useState<number[]>([])
  const [notices, setNotices] = useState<Record<number, string>>({})
  const [confirming, setConfirming] = useState(false)
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const busy = useRef(false)

  const periodReady = mode === "month" || Boolean(startsOn)
  const allMarked = candidates.length > 0 && candidates.every((item) => chosen.includes(item.id))
  const visible = candidates.slice((page - 1) * pageSize, page * pageSize)
  const scopeKey = `${mode}|${year}|${month}|${startsOn}|${endsOn}|${places.key}`
  const scopeRef = useRef("")

  useEffect(() => {
    if (!canManage || !periodReady) return
    let active = true
    setPeopleReady(false)
    setPage(1)
    const params = mode === "range"
      ? { starts_on: startsOn, ends_on: endsOn || undefined }
      : { year: Number(year), month: Number(month) }
    closingCandidates({
      ...params,
      ...places.params,
      q: person || undefined,
    })
      .then((rows) => {
        if (!active) return
        setCandidates(rows)
        if (scopeRef.current !== scopeKey) {
          scopeRef.current = scopeKey
          setChosen(rows.map((item) => item.id))
        }
      })
      .catch((caught: unknown) => {
        if (!active) return
        setCandidates([])
        toastError(caught instanceof Error ? caught.message : "Não foi possível listar as pessoas.")
      })
      .finally(() => {
        if (active) setPeopleReady(true)
      })
    return () => {
      active = false
    }
  }, [canManage, periodReady, mode, year, month, startsOn, endsOn, places.key, person, scopeKey])

  useEffect(() => {
    const timer = window.setTimeout(() => setPerson(personDraft.trim()), 280)
    return () => window.clearTimeout(timer)
  }, [personDraft])

  useEffect(() => {
    setNotices({})
  }, [mode, year, month, startsOn, endsOn])

  async function confirmClose() {
    if (busy.current) return
    busy.current = true
    let createdId: number | null = null
    try {
      await ensureCsrf()
      const period = mode === "range" ? { starts_on: startsOn, ends_on: endsOn || null } : { year: Number(year), month: Number(month) }
      const body = { ...period, note: null, employee_ids: chosen }
      const created = await api.post<ApiResponse<Closing>>("/closings", body, { silent: true })
      const row = created.data.data
      if (!row) throw new Error("Não foi possível concluir a ação.")
      createdId = row.id
      await api.put(`/closings/${createdId}`, { status: "closed" }, { silent: true })
      toastSuccess("Registro salvo.")
      navigate(`/closings/${createdId}`)
    } catch (caught) {
      const message = apiErrorMessage(caught)
      const label = closingNotice(message)
      const people = apiErrorPeople(caught)
      setConfirming(false)
      setNotices(label ? Object.fromEntries(people.map((id) => [id, label])) : {})
      toastError(message)
      if (createdId !== null) {
        await api.delete(`/closings/${createdId}`, { silent: true }).catch(() => undefined)
      }
    } finally {
      busy.current = false
    }
  }

  function togglePerson(id: number) {
    setChosen((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function askClose(event: FormEvent) {
    event.preventDefault()
    if (chosen.length === 0) {
      toastError("Selecione quem entra no fechamento.")
      return
    }
    openerRef.current = event.currentTarget.querySelector("button[type='submit']")
    setConfirming(true)
  }

  if (!canManage) {
    return (
      <div className="w-full min-w-0 space-y-5">
        <BackLink to="/closings" appearance="detail" />
        <p className="text-sm text-brand-muted">Só o gestor ou o administrador fecha o período.</p>
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <BackLink to="/closings" appearance="detail" />
      <ActionForm className={cn(moduleCardClass, "space-y-5")} onSubmit={askClose}>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-ui-ink-strong">Novo fechamento</h2>
          <p className="mt-1 text-sm text-ui-slate">Selecione o período e quem entra no fechamento.</p>
        </div>
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
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-ui-ink">Quem entra no fechamento</h3>
          <div className="space-y-2">
            <Label className={moduleLabelClass} htmlFor="closing-person">Pesquisar</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ui-slate-soft" strokeWidth={1.75} aria-hidden />
              <Input id="closing-person" value={personDraft} placeholder="Pesquisar por nome, CPF ou matrícula" className={cn(moduleFieldClass, "pl-10 pr-12")} onChange={(event) => setPersonDraft(event.target.value)} />
              <button
                type="button"
                className={cn("absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg transition-colors", filtersOpen || places.active ? "bg-brand-cta/10 text-brand-cta" : "text-ui-slate hover:bg-ui-paper hover:text-ui-ink")}
                aria-expanded={filtersOpen}
                aria-label={filtersOpen ? "Ocultar filtros" : "Mostrar filtros"}
                onClick={() => setFiltersOpen((current) => !current)}
              >
                <Filter className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className={cn("inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50", allMarked ? "border-brand-cta bg-brand-tint text-brand-cta" : "border-ui-line bg-white text-ui-ink hover:border-brand-glow hover:bg-brand-soft-alt active:bg-brand-tint")}
              disabled={!peopleReady || candidates.length === 0}
              aria-pressed={allMarked}
              onClick={() => setChosen((current) => [...new Set([...current, ...candidates.map((item) => item.id)])])}
            >
              <span className={cn("flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border", allMarked ? "border-brand-cta bg-brand-cta text-white" : "border-ui-line-strong bg-white")}>
                {allMarked ? <Check className="h-3.5 w-3.5" strokeWidth={2.75} /> : null}
              </span>
              Selecionar todos do filtro ({candidates.length})
            </button>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-10 shrink-0 whitespace-nowrap px-3")} disabled={!peopleReady || chosen.length === 0} onClick={() => setChosen([])}>
                <X className="h-4 w-4 shrink-0" />
                Limpar seleção
              </Button>
              <p className="whitespace-nowrap text-sm font-medium text-brand-cta">{chosen.length} selecionados</p>
            </div>
          </div>
          {filtersOpen ? (
            <div className="rounded-xl border border-ui-line bg-ui-canvas p-4">
              <h4 className="text-sm font-semibold text-ui-ink">Filtros</h4>
              <div className="mt-4">
                <OrganizationFilterFields idPrefix="closing" filters={places} />
              </div>
            </div>
          ) : null}
          {!peopleReady ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-ui-slate">Nenhuma pessoa neste filtro.</p>
          ) : (
            <ul className="space-y-2">
              {visible.map((person) => {
                const marked = chosen.includes(person.id)
                const notice = marked ? notices[person.id] : undefined
                return (
                  <li key={person.id}>
                    <label htmlFor={`closing-person-${person.id}`} className={cn("flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3", notice ? "border-warn-edge bg-warn-cream" : marked ? "border-brand-glow bg-brand-soft-alt" : "border-ui-line bg-white")}>
                      <span className="relative h-[22px] w-[22px] shrink-0">
                        <input id={`closing-person-${person.id}`} type="checkbox" className="peer sr-only" checked={marked} onChange={() => togglePerson(person.id)} />
                        <span className="pointer-events-none flex h-[22px] w-[22px] items-center justify-center rounded-[7px] border border-ui-line-strong bg-white peer-checked:border-brand-cta peer-checked:bg-brand-cta peer-checked:[&>svg]:opacity-100 peer-focus-visible:shadow-[0_0_0_3px_rgb(var(--brand-cta)/0.16)]">
                          <Check className="h-3.5 w-3.5 text-white opacity-0" strokeWidth={2.75} />
                        </span>
                      </span>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xs font-semibold text-brand-cta">{initials(person.full_name || "")}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-ui-ink">{person.full_name || "Não informado"}</span>
                        <span className="mt-0.5 block truncate text-sm text-ui-slate">Matrícula {registration(person.registration_number)}</span>
                        {notice ? <span className="mt-0.5 block truncate text-sm font-medium text-warn-brown">{notice}</span> : null}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
          {candidates.length > 0 ? (
            <div className="border-t border-ui-wash pt-4">
              <ListPager
                page={page}
                pageSize={pageSize}
                total={candidates.length}
                onPage={setPage}
                onPageSize={(size) => {
                  setPageSize(size)
                  setPage(1)
                }}
              />
            </div>
          ) : null}
        </div>
        <div className="flex justify-end">
          <Button type="submit" className={modulePrimaryClass} disabled={confirming || !peopleReady}>
            <Lock className="h-4 w-4" />
            Fechar período
          </Button>
        </div>
      </ActionForm>
      <ClosingConfirmDialog
        open={confirming}
        period={`${periodLabel(mode, year, month, startsOn, endsOn)} · ${chosen.length} pessoas`}
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
  onClose,
  onConfirm,
  onRest,
}: {
  open: boolean
  period: string
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(var(--ui-shadow)/0.45)] p-4 sm:items-center"
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
        className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgb(var(--ui-shadow)/0.18)] sm:p-7"
      >
        <h2 id="closing-confirm-title" className="text-xl font-semibold tracking-tight text-ui-ink">
          Fechar este período?
        </h2>
        <p id="closing-confirm-text" className="mt-2 text-sm leading-6 text-brand-quiet">
          Depois de fechado, marcação, ajuste, ocorrência, vigência e banco ficam bloqueados para as pessoas deste fechamento até reabrir.
        </p>
        <p className="mt-4 rounded-xl bg-ui-line-muted px-4 py-3 text-sm font-semibold text-ui-ink">{period}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} onClick={dismiss} disabled={pending}>
            <X className="h-4 w-4" aria-hidden />
            Cancelar
          </Button>
          <Button ref={confirmRef} type="button" className={modulePrimaryClass} onClick={() => confirm()}>
            <CircleCheck className="h-4 w-4" aria-hidden />
            Confirmar fechamento
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
