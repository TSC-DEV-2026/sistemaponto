import { ArrowLeftRight, Ban, Calendar, CircleCheck, CircleX, Clock, FileClock, FilePlus, FileText, Filter, Info, Loader2, Printer, QrCode, ScanFace, Search, Upload } from "lucide-react"
import { FormEvent, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Link } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ListPlaceholder } from "@/components/ui/list-placeholder"
import { Spinner } from "@/components/ui/spinner"
import { SiteSelect } from "@/components/ui/site-select"
import { fieldClass } from "@/components/workforce/CatalogPanel"
import { EmployeeCombobox } from "@/components/workforce/employee-combobox"
import { moduleDangerClass, moduleLabelClass, modulePrimaryClass, moduleQuietClass, moduleTextClass } from "@/components/workforce/module-visual"
import { FilterSelect, ListPager, usePagedList } from "@/components/workforce/list-controls"
import { CatalogList, DomainTabs } from "@/pages/workforce/EntityScreens"
import { DocumentLink } from "@/components/workforce/TimeOffFields"
import {
  createRecord,
  getPayroll,
  getReport,
  listRecords,
  updateRecord,
  type Closing,
  type Employee,
  type FiscalFile,
  type FiscalImport,
  type Notice,
  type NoticeEmail,
  type NoticePreference,
  type Payroll,
  type Report,
  type ReportCatalogItem,
  type TimeRequest,
} from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/utils/cn"
import { clockMethodLabel } from "@/utils/labels"
import {
  closingEventLabel,
  closingStatusLabel,
  monthOptions,
  fiscalKindLabel,
  noticePhrase,
  certificateText,
  periodText,
  punchDay,
  requestKindLabel,
  requestStatusClass,
  requestStatusLabel,
  showDate,
  showDateTime,
  showMinutes,
  showSignedMinutes,
} from "@/utils/labels"
import { reportPdf } from "@/utils/report-pdf"

function MonthField({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return (
    <select id={id} className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)} required>
      {monthOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

const clockCards = {
  simple: {
    title: "Registro simples",
    text: "Este tipo de registro é feito nesta tela.",
    icon: Clock,
  },
  qr: {
    title: "QR Code",
    text: "Este tipo de registro é feito no aplicativo, com a câmera.",
    icon: QrCode,
  },
  face: {
    title: "Facial",
    text: "Este tipo de registro é feito no aplicativo.",
    icon: ScanFace,
  },
} as const

const clockNote =
  "O próprio funcionário registra pelo tipo da ficha. O simples é o botão nesta tela. QR Code e reconhecimento facial são feitos no aplicativo."

export function TimeClockPage() {
  const personId = useAuthStore((state) => state.user?.person_id)
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const mine = employees.find((item) => item.person_id === personId) ?? null
  const method = mine?.clock_method || "simple"
  const card = method === "qr" || method === "face" || method === "simple" ? clockCards[method] : null
  const Icon = card?.icon ?? Clock

  useEffect(() => {
    let active = true
    setLoading(true)
    listRecords<Employee>("/employees", { page: 1, limit: 100 })
      .then((page) => {
        if (active) setEmployees(page.items)
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [tenantId])

  async function punchSimple(employeeId: number) {
    setError("")
    setMessage("")
    try {
      await createRecord("/punches", { employee_id: employeeId, occurred_at: new Date().toISOString(), note: null })
      setMessage("Marcação registrada.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível registrar.")
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex gap-3 rounded-xl border border-[rgba(30,138,58,0.07)] bg-[rgba(30,138,58,0.045)] px-4 py-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1E8A3A]" strokeWidth={1.75} aria-hidden />
        <p className="text-sm leading-6 text-[#1B2534]">{clockNote}</p>
      </div>
      {loading ? (
        <div className="flex justify-center rounded-[14px] border border-[#E2E8F0] bg-white px-5 py-10">
          <Spinner />
        </div>
      ) : null}
      {!loading && mine ? (
        <article className="flex flex-col gap-4 rounded-[14px] border border-[#E2E8F0] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow] duration-200 hover:border-[#C5CDD6] hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)] motion-reduce:transition-none sm:flex-row sm:items-center sm:p-6">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[rgba(30,138,58,0.08)] text-[#1E8A3A]">
            <Icon className="h-8 w-8" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-[#0A0A0A]">{card?.title || clockMethodLabel[method] || method}</h2>
            <p className="mt-1 text-sm text-[#52525B]">{mine.full_name}</p>
            <p className="mt-1 text-sm leading-6 text-[#52525B]">
              {card?.text || "Este tipo de registro é feito no aplicativo, com a câmera."}
            </p>
          </div>
          {method === "simple" ? (
            <Button
              type="button"
              className="h-11 shrink-0 rounded-[10px] bg-brand-cta px-4 text-white shadow-[0_8px_20px_rgba(30,138,58,0.18)] transition-[background-color,box-shadow] duration-200 hover:bg-brand-cta-hover hover:shadow-[0_10px_24px_rgba(30,138,58,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30 motion-reduce:transition-none"
              onClick={() => punchSimple(mine.id)}
            >
              Registrar
            </Button>
          ) : null}
        </article>
      ) : null}
      {!loading && !mine && !error ? <p className="text-sm text-brand-muted">O cadastro precisa estar ligado ao acesso para o funcionário marcar o próprio ponto.</p> : null}
      {message ? <p className="text-sm text-brand-muted">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

function personInitials(fullName: string) {
  const particles = new Set(["de", "da", "do", "dos", "das", "e"])
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter((part) => part && !particles.has(part.toLocaleLowerCase("pt-BR")))
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("pt-BR"))
    .join("")
}

const requestTabs = [
  {
    id: "pending",
    label: "Pendente",
    description: "Aguardando aprovação",
    icon: FileClock,
    iconWrap: "bg-[#FFF1E0] text-[#C2410C]",
    badge: "bg-[#FFF1E0] text-[#C2410C]",
    idle: "hover:border-[rgba(249,168,37,0.45)] hover:bg-[#FFF8EE] hover:shadow-[0_10px_24px_rgba(249,168,37,0.14)]",
    selected: "border-[#F9A825] bg-[#FFF8EE] shadow-[0_8px_24px_rgba(249,168,37,0.12)] hover:shadow-[0_12px_28px_rgba(249,168,37,0.16)]",
    ring: "focus-visible:ring-[#F9A825]/40",
  },
  {
    id: "approved",
    label: "Aprovada",
    description: "Ajustes aplicados",
    icon: CircleCheck,
    iconWrap: "bg-[rgba(30,138,58,0.12)] text-[#1E8A3A]",
    badge: "bg-[rgba(30,138,58,0.12)] text-[#146C2E]",
    idle: "hover:border-[rgba(30,138,58,0.35)] hover:bg-[#F7FCF8] hover:shadow-[0_10px_24px_rgba(30,138,58,0.1)]",
    selected: "border-[#1E8A3A] bg-[#F5FBF7] shadow-[0_8px_24px_rgba(30,138,58,0.08)] hover:shadow-[0_12px_28px_rgba(30,138,58,0.12)]",
    ring: "focus-visible:ring-[#1E8A3A]/35",
  },
  {
    id: "rejected",
    label: "Recusada",
    description: "Não foi aprovada",
    icon: CircleX,
    iconWrap: "bg-[rgba(220,38,38,0.12)] text-[#DC2626]",
    badge: "bg-[rgba(220,38,38,0.12)] text-[#B91C1C]",
    idle: "hover:border-[rgba(220,38,38,0.35)] hover:bg-[#FFF8F8] hover:shadow-[0_10px_24px_rgba(220,38,38,0.1)]",
    selected: "border-[#DC2626] bg-[#FFF6F6] shadow-[0_8px_24px_rgba(220,38,38,0.08)] hover:shadow-[0_12px_28px_rgba(220,38,38,0.12)]",
    ring: "focus-visible:ring-[#DC2626]/35",
  },
  {
    id: "cancelled",
    label: "Cancelada",
    description: "Solicitação cancelada",
    icon: Ban,
    iconWrap: "bg-[#F1F5F9] text-[#64748B]",
    badge: "bg-[#F1F5F9] text-[#475569]",
    idle: "hover:border-[#CBD5E1] hover:bg-[#F8FAFC] hover:shadow-[0_10px_24px_rgba(100,116,139,0.12)]",
    selected: "border-[#64748B] bg-[#F8FAFC] shadow-[0_8px_24px_rgba(100,116,139,0.1)] hover:shadow-[0_12px_28px_rgba(100,116,139,0.14)]",
    ring: "focus-visible:ring-[#64748B]/35",
  },
] as const

type RequestDecision = {
  id: number
  action: "approved" | "rejected"
  kind: string
  kindLabel: string
  person: string
}

function RequestDecisionDialog({
  target,
  note,
  error,
  saving,
  onNote,
  onClose,
  onConfirm,
  onRest,
}: {
  target: RequestDecision | null
  note: string
  error: string
  saving: boolean
  onNote: (value: string) => void
  onClose: () => void
  onConfirm: () => Promise<void>
  onRest: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const closeRef = useRef(onClose)
  const restRef = useRef(onRest)
  closeRef.current = onClose
  restRef.current = onRest
  const [ghost, setGhost] = useState<RequestDecision | null>(null)
  const [present, setPresent] = useState(false)
  const shown = useRef(false)
  const view = target ?? ghost
  const openKey = view ? `${view.id}:${view.action}` : ""

  useEffect(() => {
    if (target) {
      setGhost(target)
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      if (reduce) {
        setPresent(true)
        return
      }
      setPresent(false)
      const frame = requestAnimationFrame(() => setPresent(true))
      return () => cancelAnimationFrame(frame)
    }
    setPresent(false)
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const timer = window.setTimeout(() => setGhost(null), reduce ? 0 : 180)
    return () => window.clearTimeout(timer)
  }, [target])

  useEffect(() => {
    if (!openKey) {
      if (shown.current) {
        shown.current = false
        restRef.current()
      }
      return
    }
    shown.current = true
    noteRef.current?.focus()
  }, [openKey])

  useEffect(() => {
    if (!view) {
      return
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== "Tab" || !panelRef.current) {
        return
      }
      const nodes = panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), textarea:not([disabled])")
      if (nodes.length === 0) {
        return
      }
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
  }, [view])

  if (!view) {
    return null
  }

  const approving = view.action === "approved"
  const Icon = approving ? CircleCheck : CircleX

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center bg-[rgba(15,23,42,0.45)] p-4 transition-opacity duration-200 sm:items-center motion-reduce:transition-none",
        present ? "opacity-100" : "opacity-0",
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="request-decision-title"
        aria-describedby="request-decision-text request-decision-who"
        aria-busy={saving || undefined}
        className={cn(
          "w-full max-w-[480px] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.18)] transition-[opacity,transform] duration-200 sm:p-7 motion-reduce:transition-none",
          present ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0",
        )}
      >
        <div className="flex flex-col items-center text-center">
          <span
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full",
              approving ? "bg-[rgba(30,138,58,0.12)] text-[#1E8A3A] shadow-[0_0_0_8px_rgba(30,138,58,0.06)]" : "bg-[rgba(239,83,80,0.12)] text-[#EF5350] shadow-[0_0_0_8px_rgba(239,83,80,0.06)]",
            )}
          >
            <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
          </span>
          <h2 id="request-decision-title" className="mt-4 text-xl font-semibold tracking-tight text-[#0A0A0A]">
            {approving ? "Aprovar solicitação?" : "Recusar solicitação?"}
          </h2>
          <p id="request-decision-text" className="mt-1.5 max-w-sm text-sm leading-6 text-[#71717A]">
            {approving && view.kind === "adjustment"
              ? "As marcações pedidas passam a valer."
              : approving
                ? "A solicitação passa a valer."
                : "A solicitação será recusada."}
          </p>
        </div>
        <div id="request-decision-who" className="mt-5 rounded-xl bg-[#F8FAFC] px-4 py-3 text-left">
          <p className="truncate text-sm font-semibold text-[#0A0A0A]" title={view.person}>
            {view.person}
          </p>
          <p className="mt-0.5 text-[13px] text-[#71717A]">{view.kindLabel}</p>
        </div>
        <div className="mt-5 space-y-2 text-left">
          <div className="flex items-baseline justify-between gap-3">
            <Label className={moduleLabelClass} htmlFor="request-decision-note">
              Observação da decisão
            </Label>
            <span className="text-xs text-[#94A3B8]">Opcional</span>
          </div>
          <textarea
            ref={noteRef}
            id="request-decision-note"
            className={cn(moduleTextClass, "min-h-[92px] bg-[#FAFBFC] shadow-none focus:shadow-[0_0_0_3px_rgba(30,138,58,0.12)]")}
            maxLength={2000}
            value={note}
            onChange={(event) => onNote(event.target.value)}
          />
        </div>
        {error ? (
          <p className="mt-3 text-left text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-[#F1F5F9] pt-5">
          <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} disabled={saving} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" className={approving ? modulePrimaryClass : cn(moduleDangerClass, "h-11 px-4")} onClick={() => onConfirm()}>
            {approving ? <CircleCheck className="h-4 w-4" aria-hidden /> : <CircleX className="h-4 w-4" aria-hidden />}
            {approving ? "Confirmar aprovação" : "Confirmar recusa"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function RequestsPage() {
  const role = useAuthStore((state) => state.user?.role)
  const personId = useAuthStore((state) => state.user?.person_id)
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const canDecide = role === "admin" || role === "manager"
  const [status, setStatus] = useState("pending")
  const [listEmployee, setListEmployee] = useState("")
  const [listKind, setListKind] = useState("")
  const [employees, setEmployees] = useState<Employee[]>([])
  const [canRequest, setCanRequest] = useState(false)
  const [error, setError] = useState("")
  const [decision, setDecision] = useState<RequestDecision | null>(null)
  const [note, setNote] = useState("")
  const [dialogError, setDialogError] = useState("")
  const [saving, setSaving] = useState(false)
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const busy = useRef(false)
  const flight = useRef(0)
  const [counts, setCounts] = useState<Partial<Record<string, number>>>({})
  const [countsLoading, setCountsLoading] = useState(true)
  const inbox = usePagedList<TimeRequest>("/requests", {
    status,
    ...(listEmployee ? { employee_id: Number(listEmployee) } : {}),
    ...(listKind ? { kind: listKind } : {}),
  })

  async function load() {
    const [people, own] = await Promise.all([
      listRecords<Employee>("/employees", { page: 1, limit: 100 }),
      personId ? listRecords<Employee>("/employees", { page: 1, limit: 1, person_id: personId }) : Promise.resolve(null),
    ])
    setEmployees(people.items)
    const employee = own?.items[0]
    setCanRequest(employee != null && employee.situation !== "dismissed")
  }

  useEffect(() => {
    let active = true
    load().catch((caught: unknown) => {
      if (active) {
        setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      }
    })
    return () => {
      active = false
    }
  }, [tenantId, personId])

  useEffect(() => {
    if (inbox.loading) {
      setCountsLoading(true)
      return
    }
    if (inbox.error) {
      setCountsLoading(false)
      return
    }
    let active = true
    setCountsLoading(true)
    const openStatus = status
    const openTotal = inbox.total
    const base = {
      page: 1,
      limit: 1,
      ...(listEmployee ? { employee_id: Number(listEmployee) } : {}),
      ...(listKind ? { kind: listKind } : {}),
    }
    Promise.all(
      requestTabs.map((tab) =>
        listRecords<TimeRequest>("/requests", { ...base, status: tab.id }).then((result) => [tab.id, result.total] as const),
      ),
    )
      .then((rows) => {
        if (!active) {
          return
        }
        const next = Object.fromEntries(rows)
        next[openStatus] = openTotal
        setCounts(next)
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setCountsLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [inbox.loading, inbox.error, inbox.total, status, listEmployee, listKind, tenantId])

  function openDecision(item: TimeRequest, action: "approved" | "rejected", opener: HTMLButtonElement) {
    if (busy.current) {
      return
    }
    const person = employees.find((employee) => employee.id === item.employee_id)?.full_name || String(item.employee_id)
    openerRef.current = opener
    setNote("")
    setDialogError("")
    setDecision({
      id: item.id,
      action,
      kind: item.kind,
      kindLabel: requestKindLabel[item.kind] || item.kind,
      person,
    })
  }

  function closeDecision() {
    if (busy.current) {
      return
    }
    setDecision(null)
  }

  async function confirmDecision() {
    if (!decision || busy.current) {
      return
    }
    const current = decision
    const text = note
    const ticket = ++flight.current
    busy.current = true
    setSaving(true)
    setDialogError("")
    try {
      await updateRecord("/requests", current.id, { status: current.action, decision_note: text.trim() || null })
      if (ticket !== flight.current) {
        return
      }
      setNote("")
      setDecision(null)
      inbox.reload()
    } catch (caught) {
      if (ticket !== flight.current) {
        return
      }
      setDialogError(caught instanceof Error ? caught.message : "Não foi possível decidir.")
      inbox.reload()
    } finally {
      if (ticket === flight.current) {
        busy.current = false
        setSaving(false)
      }
    }
  }

  function ownRequest(item: TimeRequest) {
    const employee = employees.find((person) => person.id === item.employee_id)
    return employee?.person_id != null && employee.person_id === personId
  }

  function mayDecide(item: TimeRequest) {
    if (!canDecide || item.status !== "pending") {
      return false
    }
    if (role === "manager" && ownRequest(item)) {
      return false
    }
    return true
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-4" role="tablist">
          {requestTabs.map((tab) => {
            const selected = status === tab.id
            const Icon = tab.icon
            const count = selected && !inbox.loading && !inbox.error ? inbox.total : counts[tab.id]
            const waiting = countsLoading && !(selected && !inbox.loading && !inbox.error)
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={cn(
                  "flex min-h-[94px] w-full items-center gap-3 rounded-2xl border px-5 py-4 text-left transition-[transform,background-color,border-color,box-shadow] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                  tab.ring,
                  selected ? tab.selected : cn("border-[#E4E4E7] bg-white shadow-[0_6px_18px_rgba(15,23,42,0.05)]", tab.idle),
                )}
                onClick={() => setStatus(tab.id)}
              >
                <span className={cn("flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-2xl", tab.iconWrap)}>
                  <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-[#0A0A0A]">{tab.label}</span>
                  <span className="mt-0.5 block truncate text-[13px] text-[#71717A]">{tab.description}</span>
                </span>
                {waiting ? (
                  <span className={cn("inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full", tab.badge)} role="status" aria-label="Carregando">
                    <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
                  </span>
                ) : count !== undefined ? (
                  <span className={cn("inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-2.5 text-sm font-semibold tabular-nums", tab.badge)}>{count}</span>
                ) : null}
              </button>
            )
          })}
        </div>
        {canRequest ? (
          <Button asChild className={cn(modulePrimaryClass, "shrink-0")}>
            <Link to="/requests/new">
              <FilePlus className="h-4 w-4" />
              Nova solicitação
            </Link>
          </Button>
        ) : null}
      </div>
      <section className="rounded-[14px] border border-[#E4E4E7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]">
            <Filter className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold text-[#0A0A0A]">Filtros</h2>
            <p className="text-sm text-[#71717A]">Refine a exibição das solicitações</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="request-employee">
              Funcionário
            </Label>
            <EmployeeCombobox
              id="request-employee"
              value={listEmployee}
              employees={employees}
              emptyLabel="Todos"
              extendSearch={employees.length >= 100}
              onChange={setListEmployee}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="request-kind">
              Tipo
            </Label>
            <SiteSelect
              id="request-kind"
              value={listKind}
              icon={FileText}
              options={[{ value: "", label: "Todos" }, ...Object.entries(requestKindLabel).map(([value, label]) => ({ value, label }))]}
              onChange={setListKind}
            />
          </div>
        </div>
      </section>
      <section className="rounded-[14px] border border-[#E4E4E7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-6">
        {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
        {inbox.error ? <p className="mb-4 text-sm text-destructive">{inbox.error}</p> : null}
        {inbox.loading ? (
          <ul>
            <ListPlaceholder loading empty="Nenhuma solicitação." />
          </ul>
        ) : null}
        {!inbox.loading && !inbox.error && inbox.items.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <span className="mx-auto flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]">
              <FileText className="h-8 w-8" strokeWidth={1.75} aria-hidden />
            </span>
            <p className="mt-4 text-[17px] font-semibold text-[#0A0A0A]">Nenhuma solicitação.</p>
            <p className="mt-1 text-sm text-[#71717A]">Quando houver solicitações, elas aparecerão aqui.</p>
          </div>
        ) : null}
        {!inbox.loading && !inbox.error && inbox.items.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {inbox.items.map((item) => {
              const person = employees.find((employee) => employee.id === item.employee_id)?.full_name || String(item.employee_id)
              const kindLabel = requestKindLabel[item.kind] || item.kind
              const punches = (item.punches ?? []).map((value) => showDateTime(value))
              const period = periodText(item)
              const detail = item.kind === "adjustment" ? (punches.length > 0 ? punches.join(" · ") : "Nenhuma marcação pedida") : period === "—" ? "Sem período informado" : period
              const extra = [certificateText(item), item.note].filter(Boolean).join(" · ")
              const history = item.events.map((event) => requestStatusLabel[event.status] || event.status).join(" → ") || requestStatusLabel[item.status] || item.status
              const origin = "solicitação"
              const pendingNote = item.status === "pending" ? (item.kind === "adjustment" ? "Pendente. Não altera as marcações que valem." : "Pendente. Não altera o ponto.") : ""
              const ownNote = role === "manager" && item.status === "pending" && ownRequest(item) ? "Você não decide a própria solicitação." : ""
              const statusBadge = () => (
                <span className={cn("inline-flex h-7 shrink-0 items-center rounded-full px-3 text-[13px] font-semibold", requestStatusClass(item.status))}>
                  {requestStatusLabel[item.status] || item.status}
                </span>
              )
              const personBlock = () => (
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgba(30,138,58,0.12)] text-sm font-semibold text-[#146C2E]">
                    {personInitials(person) || "?"}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#0A0A0A]" title={person}>
                      {person}
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-[#71717A]">{kindLabel}</span>
                  </span>
                </div>
              )
              const detailBlock = () => (
                <div className="flex min-w-0 items-center gap-2">
                  <Calendar className="h-4 w-4 shrink-0 text-[#94A3B8]" strokeWidth={1.75} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm leading-5 text-[#52525B]">
                      {item.kind === "adjustment" ? <span className="text-[#71717A]">Marcações pedidas: </span> : null}
                      {detail}
                      {extra ? ` · ${extra}` : ""}
                      {item.photo_url ? " · " : ""}
                      <DocumentLink href={item.photo_url} />
                    </p>
                    {pendingNote ? <p className="mt-1 text-xs leading-5 text-[#71717A]">{pendingNote}</p> : null}
                    {ownNote ? <p className="mt-1 text-xs leading-5 text-[#71717A]">{ownNote}</p> : null}
                  </div>
                </div>
              )
              const originBlock = () => (
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-[#94A3B8]" strokeWidth={1.75} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#94A3B8]">Origem</p>
                    <p className="truncate text-sm text-[#52525B]">{origin}</p>
                  </div>
                </div>
              )
              const historyBlock = () => (
                <div className="flex min-w-0 items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 shrink-0 text-[#94A3B8]" strokeWidth={1.75} aria-hidden />
                  <p className="min-w-0 text-sm text-[#52525B]" title={history || undefined}>
                    {history}
                  </p>
                </div>
              )
              return (
                <li
                  key={item.id}
                  className="rounded-[14px] border border-[#E4E4E7] bg-white px-4 py-3.5 shadow-[0_6px_18px_rgba(15,23,42,0.04)] transition-[transform,border-color,box-shadow] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-[#D4D4D8] hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <div className="flex flex-col gap-3 lg:hidden">
                    <div className="flex items-center justify-between gap-3">
                      {personBlock()}
                      {statusBadge()}
                    </div>
                    {detailBlock()}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {originBlock()}
                      {historyBlock()}
                    </div>
                  </div>
                  <div className="hidden min-w-0 items-center lg:flex">
                    <div className="w-[22%] min-w-0 shrink-0 pr-4">{personBlock()}</div>
                    <div className="min-w-0 flex-1 border-l border-[#F0F0F2] px-4">{detailBlock()}</div>
                    <div className="w-[12%] min-w-0 border-l border-[#F0F0F2] px-4">{originBlock()}</div>
                    <div className="w-[17%] min-w-0 border-l border-[#F0F0F2] px-4">{historyBlock()}</div>
                    <div className="shrink-0 pl-4">{statusBadge()}</div>
                  </div>
                  {mayDecide(item) ? (
                    <div className="mt-3 flex flex-wrap gap-2 lg:justify-end">
                      <Button type="button" className={modulePrimaryClass} onClick={(event) => openDecision(item, "approved", event.currentTarget)}>
                        <CircleCheck className="h-4 w-4" aria-hidden />
                        Aprovar
                      </Button>
                      <Button type="button" className={cn(moduleDangerClass, "h-11 px-4")} onClick={(event) => openDecision(item, "rejected", event.currentTarget)}>
                        <CircleX className="h-4 w-4" aria-hidden />
                        Recusar
                      </Button>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : null}
        {!inbox.loading && !inbox.error && inbox.total > 0 ? (
          <div className="mt-4 border-t border-[#F0F0F2] pt-4">
            <ListPager page={inbox.page} pageSize={inbox.pageSize} total={inbox.total} onPage={inbox.setPage} onPageSize={inbox.setPageSize} tone="module" />
          </div>
        ) : null}
      </section>
      <RequestDecisionDialog
        target={decision}
        note={note}
        error={dialogError}
        saving={saving}
        onNote={setNote}
        onClose={closeDecision}
        onConfirm={confirmDecision}
        onRest={() => openerRef.current?.focus()}
      />
    </div>
  )
}

export function ClosingsPage() {
  const role = useAuthStore((state) => state.user?.role)
  const canManage = role === "admin" || role === "manager"
  const [mode, setMode] = useState("month")
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [startsOn, setStartsOn] = useState("")
  const [endsOn, setEndsOn] = useState("")
  const [filterYear, setFilterYear] = useState("")
  const [filterMonth, setFilterMonth] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [reasons, setReasons] = useState<Record<number, string>>({})
  const [reopenId, setReopenId] = useState<number | null>(null)
  const [error, setError] = useState("")
  const periods = usePagedList<Closing>("/closings", {
    ...(/^\d+$/.test(filterYear) ? { year: Number(filterYear) } : {}),
    ...(/^\d+$/.test(filterMonth) ? { month: Number(filterMonth) } : {}),
    ...(filterStatus ? { status: filterStatus } : {}),
  })

  async function closeNewPeriod(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      const body = mode === "range" ? { starts_on: startsOn, ends_on: endsOn || null, note: null } : { year: Number(year), month: Number(month), note: null }
      const created = await createRecord<Closing>("/closings", body)
      try {
        await updateRecord("/closings", created.id, { status: "closed" })
      } catch (caught) {
        periods.reload()
        throw caught
      }
      periods.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível fechar.")
    }
  }

  async function changePeriod(id: number, status: "closed" | "cancelled" | "open") {
    setError("")
    const note = (reasons[id] || "").trim()
    if (status !== "closed" && !note) {
      setError("Informe o motivo.")
      return
    }
    try {
      await updateRecord("/closings", id, { status, note: note || null })
      setReasons((current) => ({ ...current, [id]: "" }))
      setReopenId(null)
      periods.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível atualizar o período.")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="text-sm text-muted-foreground">
        O gestor ou o administrador fecha o mês, ou um intervalo, num passo. Não fecha se houver solicitação pendente, ponto incompleto ou conflito entre abono ou atestado e marcação. O aviso de intervalo menor não impede. Depois de fechado, marcação, ajuste, ocorrência, vigência e banco ficam bloqueados até reabrir. Cancelar e reabrir exigem motivo.
      </p>
      {canManage ? (
        <ActionForm className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={closeNewPeriod}>
          <div className="space-y-2">
            <Label htmlFor="closing-mode">Período</Label>
            <select id="closing-mode" className={fieldClass} value={mode} onChange={(event) => setMode(event.target.value)}>
              <option value="month">Mês civil</option>
              <option value="range">Intervalo de datas</option>
            </select>
          </div>
          {mode === "month" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="month">Mês</Label>
                <MonthField id="month" value={month} onChange={setMonth} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Ano</Label>
                <Input id="year" inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value)} required />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="closing-start">De</Label>
                <input id="closing-start" className={fieldClass} type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closing-end">Até</Label>
                <input id="closing-end" className={fieldClass} type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} />
              </div>
            </div>
          )}
          <Button type="submit">Fechar período</Button>
        </ActionForm>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="closing-filter-year">Ano</Label>
          <Input id="closing-filter-year" inputMode="numeric" value={filterYear} onChange={(event) => setFilterYear(event.target.value)} />
        </div>
        <FilterSelect id="closing-filter-month" label="Mês" value={filterMonth} options={monthOptions} onChange={setFilterMonth} />
        <FilterSelect id="closing-filter-status" label="Situação" value={filterStatus} options={Object.entries(closingStatusLabel).map(([value, label]) => ({ value, label }))} onChange={setFilterStatus} />
      </div>
      {periods.error ? <p className="text-sm text-destructive">{periods.error}</p> : null}
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {periods.items.map((item) => (
          <li key={item.id} className="space-y-2 px-4 py-3 text-sm">
            <p>
              {showDate(item.starts_on)} a {showDate(item.ends_on)} · {closingStatusLabel[item.status] || item.status}
            </p>
            <p className="text-muted-foreground">
              {item.events.map((event) => `${closingEventLabel[event.kind] || event.kind}${event.note ? ` (${event.note})` : ""}`).join(" → ")}
            </p>
            {canManage && item.status === "open" ? (
              <Button type="button" size="sm" onClick={() => changePeriod(item.id, "closed")}>
                Fechar
              </Button>
            ) : null}
            {canManage && item.status !== "open" ? (
              <div className="grid gap-2">
                {reopenId === item.id ? (
                  <p>O período volta a aberto. Marcação, ajuste, ocorrência, vigência e banco podem ser lançados de novo. O arquivo fiscal deste período deixa de valer.</p>
                ) : null}
                <Label htmlFor={`reason-${item.id}`}>Motivo</Label>
                <Input id={`reason-${item.id}`} value={reasons[item.id] || ""} onChange={(event) => setReasons((current) => ({ ...current, [item.id]: event.target.value }))} />
                <div className="flex flex-wrap gap-2">
                  {reopenId === item.id ? (
                    <>
                      <Button type="button" size="sm" onClick={() => changePeriod(item.id, "open")}>
                        Confirmar
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setReopenId(null)}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      {item.status === "closed" ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => changePeriod(item.id, "cancelled")}>
                          Cancelar
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setError("")
                          setReopenId(item.id)
                        }}
                      >
                        Reabrir
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </li>
        ))}
        {periods.items.length === 0 ? <ListPlaceholder loading={periods.loading} empty="Nenhum fechamento." /> : null}
      </ul>
      <ListPager page={periods.page} pageSize={periods.pageSize} total={periods.total} onPage={periods.setPage} onPageSize={periods.setPageSize} />
    </div>
  )
}

export function OrganizationPage() {
  return (
    <DomainTabs
      title="Estrutura Organizacional"
      lead="Unidades, setores e equipes. A mudança do funcionário preserva vigência."
      tabs={[
        { id: "unidades", label: "Unidades", panel: <CatalogList catalog="units" /> },
        { id: "setores", label: "Setores", panel: <CatalogList catalog="sectors" /> },
        { id: "equipes", label: "Equipes", panel: <CatalogList catalog="teams" /> },
      ]}
    />
  )
}

export function LaborPage() {
  return (
    <DomainTabs
      title="Regras Trabalhistas"
      lead="A apuração usa o feriado. Sindicato e acordo ainda não alteram tolerância, intervalo nem adicional."
      tabs={[
        { id: "sindicatos", label: "Sindicatos", panel: <CatalogList catalog="unions" /> },
        { id: "convencoes", label: "Convenções e acordos", panel: <CatalogList catalog="agreements" /> },
        { id: "feriados", label: "Feriados", panel: <CatalogList catalog="holidays" /> },
        { id: "regras", label: "Regras de ponto", panel: <CatalogList catalog="punch-rules" /> },
      ]}
    />
  )
}

export function ReasonsPage() {
  return (
    <DomainTabs
      title="Motivos"
      lead="Catálogo da empresa. A observação complementar continua possível no lançamento."
      tabs={[
        { id: "ajustes", label: "Ajustes", panel: <CatalogList catalog="reason-adjustment" /> },
        { id: "faltas", label: "Faltas", panel: <CatalogList catalog="reason-absence" /> },
        { id: "abonos", label: "Abonos", panel: <CatalogList catalog="reason-allowance" /> },
        { id: "atestados", label: "Atestados", panel: <CatalogList catalog="reason-certificate" /> },
      ]}
    />
  )
}

export function NotificationsPage() {
  const role = useAuthStore((state) => state.user?.role)
  const canSend = role === "admin" || role === "manager"
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [preferences, setPreferences] = useState<NoticePreference[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [preferenceKind, setPreferenceKind] = useState("")
  const [noticeEmployee, setNoticeEmployee] = useState("")
  const [emailKind, setEmailKind] = useState("")
  const [sent, setSent] = useState<number | null>(null)
  const [error, setError] = useState("")
  const noticeKinds = Object.entries(noticePhrase).map(([value, label]) => ({ value, label }))
  const notices = usePagedList<Notice>("/notifications", noticeEmployee ? { employee_id: Number(noticeEmployee) } : {})
  const emails = usePagedList<NoticeEmail>("/notice-emails", emailKind ? { kind: emailKind } : {})

  async function load() {
    const [prefs, people] = await Promise.all([
      listRecords<NoticePreference>("/notification-preferences", { page: 1, limit: 100 }),
      listRecords<Employee>("/employees", { page: 1, limit: 100 }),
    ])
    setPreferences(prefs.items)
    setEmployees(people.items)
  }

  useEffect(() => {
    let active = true
    load().catch((caught: unknown) => {
      if (active) {
        setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      }
    })
    return () => {
      active = false
    }
  }, [tenantId])

  function enabled(kind: string) {
    const row = preferences.find((item) => item.kind === kind)
    return row ? row.enabled : true
  }

  async function mark(id: number) {
    setError("")
    try {
      await updateRecord("/notifications", id, { read: true })
      notices.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível marcar.")
    }
  }

  async function setEnabled(kind: string, next: boolean) {
    setError("")
    try {
      const row = preferences.find((item) => item.kind === kind)
      if (row) {
        await updateRecord("/notification-preferences", row.id, { enabled: next })
      } else if (!next) {
        await createRecord("/notification-preferences", { kind, enabled: false })
      }
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar o aviso.")
    }
  }

  async function sendDaily() {
    setError("")
    try {
      const result = await createRecord<{ created: number }>("/notification-runs", {})
      setSent(result.created)
      notices.reload()
      emails.reload()
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível enviar.")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-4">
        <BackLink to="/settings" />
        <div>
          <p className="text-sm text-muted-foreground">
            O texto no sistema é o mesmo do e-mail. Cada aviso pode ser desligado. Sem preferência gravada, ele fica ligado. O envio é diário. Fechamento próximo e trial terminando começam 3 dias antes. A frequência customizável fica para depois.
          </p>
        </div>
      </div>
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Avisos</h2>
        <FilterSelect id="preference-kind" label="Tipo" value={preferenceKind} options={noticeKinds} onChange={setPreferenceKind} />
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {Object.entries(noticePhrase)
            .filter(([kind]) => !preferenceKind || kind === preferenceKind)
            .map(([kind, phrase]) => (
            <li key={kind} className="px-4 py-3 text-sm">
              <label className="flex items-start gap-2" htmlFor={`notice-${kind}`}>
                <input id={`notice-${kind}`} type="checkbox" className="mt-1" checked={enabled(kind)} onChange={(event) => void setEnabled(kind, event.target.checked)} />
                <span>{phrase}</span>
              </label>
            </li>
          ))}
        </ul>
        {canSend ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => sendDaily()}>
              Enviar os avisos do dia
            </Button>
            {sent !== null ? <p className="text-sm text-muted-foreground">{sent} avisos enviados.</p> : null}
          </div>
        ) : null}
      </section>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <section className="space-y-3">
        <h2 className="text-sm font-medium">No sistema</h2>
        <FilterSelect
          id="notice-employee"
          label="Funcionário"
          value={noticeEmployee}
          options={employees.map((item) => ({ value: String(item.id), label: item.full_name }))}
          onChange={setNoticeEmployee}
        />
        {notices.error ? <p className="text-sm text-destructive">{notices.error}</p> : null}
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {notices.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
              <span>
                {item.body}
                <span className="mt-1 block text-muted-foreground">{showDateTime(item.created_at)}</span>
              </span>
              {item.read_at ? (
                <span className="text-muted-foreground">Lida</span>
              ) : (
                <Button type="button" size="sm" variant="outline" onClick={() => mark(item.id)}>
                  Marcar lida
                </Button>
              )}
            </li>
          ))}
          {notices.items.length === 0 ? <ListPlaceholder loading={notices.loading} empty="Nenhuma notificação." /> : null}
        </ul>
        <ListPager page={notices.page} pageSize={notices.pageSize} total={notices.total} onPage={notices.setPage} onPageSize={notices.setPageSize} />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-medium">No e-mail</h2>
        <p className="text-sm text-muted-foreground">O e-mail fica gravado com o mesmo texto.</p>
        <FilterSelect id="email-kind" label="Tipo" value={emailKind} options={noticeKinds} onChange={setEmailKind} />
        {emails.error ? <p className="text-sm text-destructive">{emails.error}</p> : null}
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {emails.items.map((item) => (
            <li key={item.id} className="px-4 py-3 text-sm">
              {item.body}
              <span className="mt-1 block text-muted-foreground">
                {item.address || "Sem endereço"} · {showDateTime(item.created_at)}
              </span>
            </li>
          ))}
          {emails.items.length === 0 ? <ListPlaceholder loading={emails.loading} empty="Nenhum e-mail gravado." /> : null}
        </ul>
        <ListPager page={emails.page} pageSize={emails.pageSize} total={emails.total} onPage={emails.setPage} onPageSize={emails.setPageSize} />
      </section>
    </div>
  )
}

function monthStart() {
  return `${punchDay(new Date().toISOString()).slice(0, 8)}01`
}

export function ReportsPage() {
  const role = useAuthStore((state) => state.user?.role)
  const canRead = role === "admin" || role === "manager"
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [catalog, setCatalog] = useState<ReportCatalogItem[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [kind, setKind] = useState("punch")
  const [startsOn, setStartsOn] = useState(monthStart)
  const [endsOn, setEndsOn] = useState(() => punchDay(new Date().toISOString()))
  const [employeeId, setEmployeeId] = useState("")
  const [result, setResult] = useState<Report | null>(null)
  const [query, setQuery] = useState({ kind: "", startsOn: "", endsOn: "", employeeId: "" })
  const [error, setError] = useState("")

  useEffect(() => {
    if (!canRead) {
      return
    }
    let active = true
    Promise.all([
      listRecords<ReportCatalogItem>("/report-catalog", { page: 1, limit: 20 }),
      listRecords<Employee>("/employees", { page: 1, limit: 100 }),
    ])
      .then(([reports, people]) => {
        if (!active) {
          return
        }
        setCatalog(reports.items)
        setEmployees(people.items)
        if (reports.items[0]) {
          setKind(reports.items[0].kind)
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Não foi possível listar os relatórios.")
        }
      })
    return () => {
      active = false
    }
  }, [canRead, tenantId])

  async function openPage(page: number, next = query) {
    setError("")
    try {
      setQuery(next)
      setResult(await getReport(next.kind, next.startsOn, next.endsOn, page, next.employeeId ? Number(next.employeeId) : undefined))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível consultar.")
    }
  }

  async function consult(event: FormEvent) {
    event.preventDefault()
    await openPage(1, { kind, startsOn, endsOn, employeeId })
  }

  async function printReport() {
    setError("")
    const employee = query.employeeId ? Number(query.employeeId) : undefined
    try {
      const first = await getReport(query.kind, query.startsOn, query.endsOn, 1, employee, 100)
      const items = [...first.items]
      const pageCount = Math.max(1, Math.ceil(first.total / first.limit))
      for (let page = 2; page <= pageCount; page += 1) {
        const next = await getReport(query.kind, query.startsOn, query.endsOn, page, employee, 100)
        items.push(...next.items)
      }
      const bytes = reportPdf({
        name: first.name,
        from: showDate(first.starts_on),
        until: showDate(first.ends_on),
        total: first.total,
        items: items.map((item) => ({
          occurredOn: showDate(item.occurred_on),
          title: item.title,
          fullName: item.full_name || "",
          detail: item.detail,
        })),
      })
      const blob = new Blob([bytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${first.kind}-${first.starts_on}-${first.ends_on}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível imprimir.")
    }
  }

  const pages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Um relatório por grupo: Ponto, Jornada, Banco de Horas, Ocorrências e Gestão. A consulta é analítica e histórica, de até 366 dias. Dia futuro não entra no ponto nem no movimento do banco. O dashboard continua operacional. O gestor vê a própria equipe. O fechamento, sem filtro de funcionário, continua da empresa.
      </p>
      {canRead ? (
        <ActionForm className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={consult}>
          <div className="space-y-2">
            <Label htmlFor="report-kind">Tipo de relatório</Label>
            <select id="report-kind" className={fieldClass} value={kind} onChange={(event) => setKind(event.target.value)}>
              {catalog.map((item) => (
                <option key={item.kind} value={item.kind}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="report-start">De</Label>
              <input id="report-start" className={fieldClass} type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-end">Até</Label>
              <input id="report-end" className={fieldClass} type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-employee">Funcionário</Label>
            <select id="report-employee" className={fieldClass} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
              <option value="">Todos</option>
              {employees.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">
            <Search className="h-4 w-4" />
            Consultar
          </Button>
        </ActionForm>
      ) : (
        <p className="text-sm text-muted-foreground">O funcionário não consulta relatório gerencial.</p>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {result ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">
                {result.name} · {showDate(result.starts_on)} a {showDate(result.ends_on)}
              </h2>
              <p className="text-sm text-muted-foreground">
                {result.total === 0 ? "Nenhum registro neste período." : `${result.total} registros encontrados`}
              </p>
            </div>
            <Button type="button" variant="outline" onClick={printReport}>
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
          {result.items.length > 0 ? (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {result.items.map((item, index) => (
                <li key={`${item.occurred_on}-${item.employee_id ?? "empresa"}-${item.title}-${index}`} className="px-4 py-3 text-sm">
                  <p className="font-medium">
                    {showDate(item.occurred_on)} · {item.title}
                    {item.full_name ? ` · ${item.full_name}` : ""}
                  </p>
                  <p className="mt-1 text-muted-foreground">{item.detail}</p>
                </li>
              ))}
            </ul>
          ) : null}
          {result.total > result.limit ? (
            <div className="flex items-center gap-3">
              <Button type="button" size="sm" variant="outline" disabled={result.page <= 1} onClick={() => openPage(result.page - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {result.page} de {pages}
              </span>
              <Button type="button" size="sm" variant="outline" disabled={result.page >= pages} onClick={() => openPage(result.page + 1)}>
                Próxima
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

function downloadFiscalFile(file: FiscalFile) {
  const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${file.kind}-${file.starts_on}-${file.ends_on}.txt`
  link.click()
  URL.revokeObjectURL(url)
}

const fiscalFileKinds = [
  ["afd", "AFD"],
  ["aej", "AEJ"],
] as const

function readTextFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "")
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."))
    reader.readAsText(file)
  })
}

export function PayrollPage() {
  return (
    <DomainTabs
      title="Fiscal / Folha"
      lead="Arquivos fiscais e os totais do mês. Se o período for cancelado ou reaberto, o arquivo deixa de valer e precisa ser gerado de novo."
      tabs={[
        { id: "afd", label: "AFD", panel: <AfdPanel /> },
        { id: "folha", label: "Totais da folha", panel: <PayrollTotalsPanel /> },
      ]}
    />
  )
}

function AfdPanel() {
  const role = useAuthStore((state) => state.user?.role)
  const canManage = role === "admin" || role === "manager"
  const [kind, setKind] = useState("afd")
  const [mode, setMode] = useState("month")
  const [fileYear, setFileYear] = useState(String(new Date().getFullYear()))
  const [fileMonth, setFileMonth] = useState(String(new Date().getMonth() + 1))
  const [startsOn, setStartsOn] = useState("")
  const [endsOn, setEndsOn] = useState("")
  const [filterKind, setFilterKind] = useState("")
  const [filterValid, setFilterValid] = useState("")
  const [afdFile, setAfdFile] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState(0)
  const [imported, setImported] = useState<FiscalImport | null>(null)
  const [error, setError] = useState("")
  const files = usePagedList<FiscalFile>(
    "/fiscal-files",
    {
      ...(filterKind ? { kind: filterKind } : {}),
      ...(filterValid ? { valid: filterValid === "true" } : {}),
    },
    canManage,
  )

  async function generateFile(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      const body = mode === "range" ? { kind, starts_on: startsOn, ends_on: endsOn || null } : { kind, year: Number(fileYear), month: Number(fileMonth) }
      await createRecord<FiscalFile>("/fiscal-files", body)
      files.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível gerar o arquivo.")
    }
  }

  async function importAfd(event: FormEvent) {
    event.preventDefault()
    setError("")
    if (!afdFile || !afdFile.name.toLowerCase().endsWith(".txt")) {
      setError("Selecione um arquivo .txt.")
      return
    }
    try {
      const content = (await readTextFile(afdFile)).trim()
      if (!content) {
        setError("O arquivo está vazio.")
        return
      }
      const outcome = await createRecord<FiscalImport>("/fiscal-files/imports", { content })
      setImported(outcome)
      setAfdFile(null)
      setFileKey((current) => current + 1)
      files.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível importar.")
    }
  }

  if (!canManage) {
    return <p className="text-sm text-muted-foreground">Gerar, importar e baixar o arquivo fica com o administrador e o gestor.</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">O AFD sai de qualquer período. O AEJ sai só de um período fechado, com o mesmo início e o mesmo fim.</p>
      <ActionForm className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={generateFile}>
        <div className="space-y-2">
          <Label htmlFor="file-kind">Tipo de arquivo</Label>
          <select id="file-kind" className={fieldClass} value={kind} onChange={(event) => setKind(event.target.value)}>
            {fiscalFileKinds.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {kind === "afd" ? <p className="text-sm text-muted-foreground">Arquivo com as marcações. Sai de qualquer período.</p> : null}
          {kind === "aej" ? <p className="text-sm text-muted-foreground">Arquivo da jornada. Sai só de um período fechado.</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="file-mode">Período</Label>
          <select id="file-mode" className={fieldClass} value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="month">Mês civil</option>
            <option value="range">Intervalo de datas</option>
          </select>
        </div>
        {mode === "month" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="file-month">Mês</Label>
              <MonthField id="file-month" value={fileMonth} onChange={setFileMonth} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file-year">Ano</Label>
              <Input id="file-year" inputMode="numeric" value={fileYear} onChange={(event) => setFileYear(event.target.value)} required />
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="file-start">De</Label>
              <input id="file-start" className={fieldClass} type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file-end">Até</Label>
              <input id="file-end" className={fieldClass} type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} />
            </div>
          </div>
        )}
        <Button type="submit">
          <FilePlus className="h-4 w-4" />
          {kind === "aej" ? "Gerar AEJ" : "Gerar AFD"}
        </Button>
      </ActionForm>
      <ActionForm className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={importAfd}>
        <h2 className="text-sm font-medium">Importar AFD</h2>
        <p className="text-sm text-muted-foreground">A marcação entra com origem AFD. Se já existir no mesmo instante, só ela é ignorada e as demais seguem.</p>
        <div className="space-y-2">
          <Label htmlFor="afd-file">Arquivo .txt</Label>
          <input
            key={fileKey}
            id="afd-file"
            className={fieldClass}
            type="file"
            accept=".txt,text/plain"
            required
            onChange={(event) => setAfdFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <Button type="submit">
          <Upload className="h-4 w-4" />
          Importar
        </Button>
      </ActionForm>
      {imported ? (
        <p className="text-sm text-muted-foreground">
          {imported.created} criadas, {imported.ignored} já existiam e foram ignoradas, {imported.blocked} não entraram.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <FilterSelect id="fiscal-kind" label="Tipo" value={filterKind} options={Object.entries(fiscalKindLabel).map(([value, label]) => ({ value, label }))} onChange={setFilterKind} />
        <FilterSelect
          id="fiscal-valid"
          label="Validade"
          value={filterValid}
          options={[
            { value: "true", label: "Vale" },
            { value: "false", label: "Não vale" },
          ]}
          onChange={setFilterValid}
        />
      </div>
      {files.error ? <p className="text-sm text-destructive">{files.error}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {files.items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>
              {fiscalKindLabel[item.kind] || item.kind} · {showDate(item.starts_on)} a {showDate(item.ends_on)} · {item.valid ? "Vale" : "Não vale. Gere de novo."}
            </span>
            <Button type="button" size="sm" variant="outline" onClick={() => downloadFiscalFile(item)}>
              Baixar
            </Button>
          </li>
        ))}
        {files.items.length === 0 ? <ListPlaceholder loading={files.loading} empty="Nenhum arquivo gerado." /> : null}
      </ul>
      <ListPager page={files.page} pageSize={files.pageSize} total={files.total} onPage={files.setPage} onPageSize={files.setPageSize} />
    </div>
  )
}

function PayrollTotalsPanel() {
  const role = useAuthStore((state) => state.user?.role)
  const canManage = role === "admin" || role === "manager"
  const isAdmin = role === "admin"
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [result, setResult] = useState<Payroll | null>(null)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!isAdmin) {
      await generatePayroll()
      return
    }
    setError("")
    setNotice("")
    try {
      setResult(await getPayroll(Number(year), Number(month)))
    } catch (caught) {
      setResult(null)
      setError(caught instanceof Error ? caught.message : "Não foi possível consultar.")
    }
  }

  async function generatePayroll() {
    setError("")
    setNotice("")
    try {
      await createRecord<FiscalFile>("/fiscal-files", { kind: "payroll", year: Number(year), month: Number(month) })
      setNotice("Arquivo gerado. Ele aparece na opção AFD.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível gerar o arquivo.")
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">A folha traz horas trabalhadas, hora extra, adicional noturno, falta de tempo e saldo do banco.</p>
      {canManage ? (
        <ActionForm className="flex flex-wrap items-end gap-3" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="month">Mês</Label>
            <MonthField id="month" value={month} onChange={setMonth} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Ano</Label>
            <Input id="year" value={year} onChange={(event) => setYear(event.target.value)} required />
          </div>
          {isAdmin ? (
            <Button type="submit">
              <Search className="h-4 w-4" />
              Consultar totais
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => void generatePayroll()}>
            <FilePlus className="h-4 w-4" />
            Gerar arquivo
          </Button>
        </ActionForm>
      ) : (
        <p className="text-sm text-muted-foreground">Consultar os totais fica com o administrador.</p>
      )}
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {result ? (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {result.items.map((item) => (
            <li key={item.employee_id} className="space-y-1 px-4 py-3 text-sm">
              <p className="font-medium">{item.full_name}</p>
              <p className="text-muted-foreground">
                Trabalhado {showMinutes(item.worked_minutes)} · Hora extra {showMinutes(item.overtime_minutes)} · Adicional noturno {showMinutes(item.night_additional_minutes)} · Falta de tempo {showMinutes(item.shortage_minutes)} · Banco {showSignedMinutes(item.balance_minutes)}
              </p>
            </li>
          ))}
          {result.items.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhum funcionário.</li> : null}
        </ul>
      ) : null}
    </div>
  )
}
