import { ArrowLeft, ArrowLeftRight, Ban, Bell, Calendar, Check, CircleCheck, CircleX, Clock, Download, Eye, FileClock, FilePlus, FileText, Filter, Info, List, Loader2, Lock, Plus, Printer, QrCode, RotateCcw, ScanFace, Search, Send, SlidersHorizontal, Trash2, Upload, X, ChevronLeft, ChevronRight } from "lucide-react"

import { conceptIcon } from "@/utils/concept-icons"
import { FormEvent, useContext, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Link, useNavigate } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { ActionTip } from "@/components/ui/action-tip"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { DatePickerField, YearPickerField } from "@/components/ui/date-picker-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ListPlaceholder } from "@/components/ui/list-placeholder"
import { Spinner } from "@/components/ui/spinner"
import { SiteSelect } from "@/components/ui/site-select"
import { EmployeeCombobox } from "@/components/workforce/employee-combobox"
import { OrganizationFilterFields, useOrganizationFilters } from "@/components/workforce/organization-filters"
import { moduleCardClass, moduleDangerClass, moduleDangerIconClass, moduleFieldClass, moduleIconClass, moduleLabelClass, modulePrimaryClass, moduleQuietClass, moduleTextClass } from "@/components/workforce/module-visual"
import { ListPager, usePagedList } from "@/components/workforce/list-controls"
import { ClosingConfirmDialog } from "@/pages/workforce/ClosingFormPage"
import { CatalogList, DomainTabs, SortArrows, TabAction } from "@/pages/workforce/EntityScreens"
import { CertificatePhotoField, DocumentLink } from "@/components/workforce/TimeOffFields"
import {
  createRecord,
  employeePickFields,
  getReport,
  listRecords,
  notifyNoticesChanged,
  removeRecord,
  updateRecord,
  type Closing,
  type Employee,
  type FiscalFile,
  type FiscalImport,
  type Notice,
  type NoticePreference,
  type PayrollEvent,
  type Report,
  type ReportCatalogItem,
  type TimeRequest,
} from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { toastError } from "@/store/toast.store"
import { cn } from "@/utils/cn"
import { clockMethodLabel } from "@/utils/labels"
import {
  closingEventLabel,
  closingStatusLabel,
  monthOptions,
  noticePhrase,
  certificateText,
  periodText,
  punchDay,
  requestKindLabel,
  requestStatusClass,
  requestStatusLabel,
  showClock,
  showDate,
  showDateTime,
  showDuration,
} from "@/utils/labels"
import { reportPdf } from "@/utils/report-pdf"

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
  const role = useAuthStore((state) => state.user?.role)
  const personId = useAuthStore((state) => state.user?.person_id)
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const navigate = useNavigate()
  useEffect(() => {
    if (role === "admin") navigate("/", { replace: true })
  }, [role, navigate])
  const [mine, setMine] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [failed, setFailed] = useState(false)
  const method = mine?.clock_method || "simple"
  const card = method === "qr" || method === "face" || method === "simple" ? clockCards[method] : null
  const Icon = card?.icon ?? Clock

  useEffect(() => {
    let active = true
    setLoading(true)
    setMine(null)
    if (!personId) {
      setLoading(false)
      return
    }
    listRecords<Employee>("/employees", { page: 1, limit: 1, person_id: personId, fields: employeePickFields })
      .then((page) => {
        if (active) setMine(page.items[0] ?? null)
      })
      .catch((caught: unknown) => {
        if (!active) return
        setFailed(true)
        toastError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [tenantId, personId])

  async function punchSimple(employeeId: number) {
    setMessage("")
    try {
      await createRecord("/punches", { employee_id: employeeId, occurred_at: new Date().toISOString(), note: null })
      setMessage("Marcação registrada.")
    } catch {
      // O interceptor já avisou o erro.
    }
  }

  if (role === "admin") return null

  return (
    <div className="w-full min-w-0 space-y-5">
      <div className="flex gap-3 rounded-xl border border-brand-cta/7 bg-brand-cta/5 px-4 py-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-cta" strokeWidth={1.75} aria-hidden />
        <p className="text-sm leading-6 text-ui-heading">{clockNote}</p>
      </div>
      {loading ? (
        <div className="flex justify-center rounded-[14px] border border-ui-line bg-white px-5 py-10">
          <Spinner />
        </div>
      ) : null}
      {!loading && mine ? (
        <article className="flex flex-col gap-4 rounded-[14px] border border-ui-line bg-white p-5 shadow-[0_8px_24px_rgb(var(--ui-shadow)/0.04)] transition-[border-color,box-shadow] duration-200 hover:border-ui-line-hover hover:shadow-[0_10px_24px_rgb(var(--ui-shadow)/0.06)] motion-reduce:transition-none sm:flex-row sm:items-center sm:p-6">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-cta/8 text-brand-cta">
            <Icon className="h-8 w-8" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-ui-ink">{card?.title || clockMethodLabel[method] || method}</h2>
            <p className="mt-1 text-sm text-brand-muted">{mine.full_name}</p>
            <p className="mt-1 text-sm leading-6 text-brand-muted">
              {card?.text || "Este tipo de registro é feito no aplicativo, com a câmera."}
            </p>
          </div>
          {method === "simple" ? (
            <Button
              type="button"
              className="h-11 shrink-0 rounded-[10px] bg-brand-cta px-4 text-white shadow-[0_8px_20px_rgb(var(--brand-cta)/0.18)] transition-[background-color,box-shadow] duration-200 hover:bg-brand-cta-hover hover:shadow-[0_10px_24px_rgb(var(--brand-cta)/0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta/30 motion-reduce:transition-none"
              onClick={() => punchSimple(mine.id)}
            >
              <Clock className="h-4 w-4" />
              Registrar
            </Button>
          ) : null}
        </article>
      ) : null}
      {!loading && !mine && !failed ? <p className="text-sm text-brand-muted">O cadastro precisa estar ligado ao acesso para o funcionário marcar o próprio ponto.</p> : null}
      {message ? <p className="text-sm text-brand-muted">{message}</p> : null}
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
    iconWrap: "bg-warn-soft text-warn-brown",
    badge: "bg-warn-soft text-warn-brown",
    idle: "hover:border-[rgba(249,168,37,0.45)] hover:bg-warn-tint hover:shadow-[0_10px_24px_rgba(249,168,37,0.14)]",
    selected: "border-warn bg-warn-tint shadow-[0_8px_24px_rgba(249,168,37,0.12)] hover:shadow-[0_12px_28px_rgba(249,168,37,0.16)]",
    ring: "focus-visible:ring-warn/40",
  },
  {
    id: "approved",
    label: "Aprovada",
    description: "Ajustes aplicados",
    icon: CircleCheck,
    iconWrap: "bg-brand-cta/12 text-brand-cta",
    badge: "bg-brand-cta/12 text-brand-ink-strong",
    idle: "hover:border-brand-cta/35 hover:bg-brand-soft-alt hover:shadow-[0_10px_24px_rgb(var(--brand-cta)/0.1)]",
    selected: "border-brand-cta bg-brand-soft shadow-[0_8px_24px_rgb(var(--brand-cta)/0.08)] hover:shadow-[0_12px_28px_rgb(var(--brand-cta)/0.12)]",
    ring: "focus-visible:ring-brand-cta/35",
  },
  {
    id: "rejected",
    label: "Recusada",
    description: "Não foi aprovada",
    icon: CircleX,
    iconWrap: "bg-[rgb(var(--danger-strong)/0.12)] text-danger-strong",
    badge: "bg-[rgb(var(--danger-strong)/0.12)] text-danger-deep",
    idle: "hover:border-[rgb(var(--danger-strong)/0.35)] hover:bg-danger-tint hover:shadow-[0_10px_24px_rgb(var(--danger-strong)/0.1)]",
    selected: "border-danger-strong bg-danger-mist shadow-[0_8px_24px_rgb(var(--danger-strong)/0.08)] hover:shadow-[0_12px_28px_rgb(var(--danger-strong)/0.12)]",
    ring: "focus-visible:ring-danger-strong/35",
  },
  {
    id: "cancelled",
    label: "Cancelada",
    description: "Solicitação cancelada",
    icon: Ban,
    iconWrap: "bg-ui-wash text-ui-slate",
    badge: "bg-ui-wash text-ui-slate-mid",
    idle: "hover:border-ui-line hover:bg-ui-canvas hover:shadow-[0_10px_24px_rgba(100,116,139,0.12)]",
    selected: "border-ui-slate bg-ui-canvas shadow-[0_8px_24px_rgba(100,116,139,0.1)] hover:shadow-[0_12px_28px_rgba(100,116,139,0.14)]",
    ring: "focus-visible:ring-ui-slate/35",
  },
] as const

type RequestDecision = {
  id: number
  action: "approved" | "rejected" | "cancelled"
  kind: string
  kindLabel: string
  person: string
}

function RequestDecisionDialog({
  target,
  note,
  saving,
  onNote,
  onClose,
  onConfirm,
  onRest,
}: {
  target: RequestDecision | null
  note: string
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
  const cancelling = view.action === "cancelled"
  const Icon = approving ? CircleCheck : cancelling ? Ban : CircleX

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center bg-[rgb(var(--ui-shadow)/0.45)] p-4 transition-opacity duration-200 sm:items-center motion-reduce:transition-none",
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
          "w-full max-w-[480px] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgb(var(--ui-shadow)/0.18)] transition-[opacity,transform] duration-200 sm:p-7 motion-reduce:transition-none",
          present ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0",
        )}
      >
        <div className="flex flex-col items-center text-center">
          <span
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full",
              approving
                ? "bg-brand-cta/12 text-brand-cta shadow-[0_0_0_8px_rgb(var(--brand-cta)/0.06)]"
                : cancelling
                  ? "bg-ui-wash text-ui-slate shadow-[0_0_0_8px_rgba(100,116,139,0.08)]"
                  : "bg-[rgb(var(--danger)/0.12)] text-danger shadow-[0_0_0_8px_rgb(var(--danger)/0.06)]",
            )}
          >
            <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
          </span>
          <h2 id="request-decision-title" className="mt-4 text-xl font-semibold tracking-tight text-ui-ink">
            {approving ? "Aprovar solicitação?" : cancelling ? "Cancelar solicitação?" : "Recusar solicitação?"}
          </h2>
          <p id="request-decision-text" className="mt-1.5 max-w-sm text-sm leading-6 text-brand-quiet">
            {cancelling
              ? "A solicitação deixa de seguir para aprovação. O ponto não muda."
              : approving && view.kind === "adjustment"
                ? "As marcações pedidas passam a valer."
                : approving
                  ? "A solicitação passa a valer."
                  : "A solicitação será recusada."}
          </p>
        </div>
        <div id="request-decision-who" className="mt-5 rounded-xl bg-ui-line-muted px-4 py-3 text-left">
          <p className="truncate text-sm font-semibold text-ui-ink" title={view.person}>
            {view.person}
          </p>
          <p className="mt-0.5 text-[13px] text-brand-quiet">{view.kindLabel}</p>
        </div>
        <div className="mt-5 space-y-2 text-left">
          <div className="flex items-baseline justify-between gap-3">
            <Label className={moduleLabelClass} htmlFor="request-decision-note">
              {cancelling ? "Observação" : "Observação da decisão"}
            </Label>
            <span className="text-xs text-ui-slate-soft">Opcional</span>
          </div>
          <textarea
            ref={noteRef}
            id="request-decision-note"
            className={cn(moduleTextClass, "min-h-[92px] bg-ui-canvas-soft shadow-none focus:shadow-[0_0_0_3px_rgb(var(--brand-cta)/0.12)]")}
            maxLength={2000}
            value={note}
            onChange={(event) => onNote(event.target.value)}
          />
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-ui-wash pt-5">
          <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} disabled={saving} onClick={onClose}>
            {cancelling ? <ArrowLeft className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {cancelling ? "Voltar" : "Cancelar"}
          </Button>
          <Button
            type="button"
            className={approving ? modulePrimaryClass : cancelling ? "h-11 rounded-[10px] bg-ui-slate-deep px-4 text-white shadow-[0_8px_20px_rgba(51,65,85,0.28)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-ui-slate-deep hover:shadow-[0_10px_24px_rgba(51,65,85,0.34)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-slate-deep/35 motion-reduce:transition-none motion-reduce:active:translate-y-0" : cn(moduleDangerClass, "h-11 px-4")}
            onClick={() => onConfirm()}
          >
            {approving ? <CircleCheck className="h-4 w-4" aria-hidden /> : cancelling ? <Ban className="h-4 w-4" aria-hidden /> : <CircleX className="h-4 w-4" aria-hidden />}
            {approving ? "Confirmar aprovação" : cancelling ? "Confirmar cancelamento" : "Confirmar recusa"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

type RequestDescription = { text: string; photo: string | null }

const requestPreviewLimit = 50

function requestedPunches(values: string[]) {
  const dayFormat = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  let dayShown = ""
  return values
    .map((value) => {
      const clock = showClock(value)
      if (!value) {
        return clock
      }
      const day = dayFormat.format(new Date(value))
      if (day === dayShown) {
        return clock
      }
      dayShown = day
      return `${day}, ${clock}`
    })
    .join(" -- ")
}

function ClampedRequestText({
  lead,
  detail,
  extra,
  note,
  photo,
  onOpen,
}: {
  lead: string
  detail: string
  extra: string
  note: string
  photo: string | null
  onOpen: (opener: HTMLButtonElement) => void
}) {
  const noteText = note.replace(/\s+/g, " ").trim()
  const truncated = noteText.length > requestPreviewLimit
  const notePreview = truncated ? noteText.slice(0, requestPreviewLimit) : noteText

  return (
    <p className="min-w-0 text-sm leading-5 text-brand-muted [overflow-wrap:anywhere]">
      {lead ? <span className="text-brand-quiet">{lead}</span> : null}
      {detail}
      {extra ? ` · ${extra}` : ""}
      {notePreview ? ` ${notePreview}` : ""}
      {truncated ? (
        <button
          type="button"
          className="ml-1 inline text-[13px] font-semibold text-brand-cta underline-offset-2 transition-colors duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta/30 motion-reduce:transition-none"
          onClick={(event) => onOpen(event.currentTarget)}
        >
          Ver mais
        </button>
      ) : photo ? (
        <>
          {" "}
          <DocumentLink href={photo} />
        </>
      ) : null}
    </p>
  )
}

function RequestDescriptionDialog({ target, onClose, onRest }: { target: RequestDescription | null; onClose: () => void; onRest: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef(onClose)
  const restRef = useRef(onRest)
  closeRef.current = onClose
  restRef.current = onRest
  const [ghost, setGhost] = useState<RequestDescription | null>(null)
  const [present, setPresent] = useState(false)
  const shown = useRef(false)
  const view = target ?? ghost

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
    if (!view) {
      if (shown.current) {
        shown.current = false
        restRef.current()
      }
      return
    }
    shown.current = true
    closeButtonRef.current?.focus()
  }, [view])

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
      const nodes = panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]")
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

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center bg-[rgb(var(--ui-shadow)/0.45)] p-4 transition-opacity duration-200 sm:items-center motion-reduce:transition-none",
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-description-title"
        className={cn(
          "flex max-h-[calc(100dvh-2rem)] w-full max-w-[520px] flex-col rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgb(var(--ui-shadow)/0.18)] transition-[opacity,transform] duration-200 motion-reduce:transition-none",
          present ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="request-description-title" className="text-lg font-semibold text-ui-ink">
            Descrição completa
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ui-slate transition-colors duration-200 hover:bg-ui-paper hover:text-ui-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta/30 motion-reduce:transition-none"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          <p className="whitespace-pre-wrap text-sm leading-6 text-ui-heading [overflow-wrap:anywhere]">{view.text}</p>
          {view.photo ? (
            <p className="mt-4">
              <DocumentLink href={view.photo} />
            </p>
          ) : null}
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
  const ownOnly = role === "member"
  const [status, setStatus] = useState("pending")
  const [listEmployee, setListEmployee] = useState("")
  const [listKind, setListKind] = useState("")
  const [canRequest, setCanRequest] = useState(false)
  const [ownEmployeeId, setOwnEmployeeId] = useState<number | null>(null)
  const [decision, setDecision] = useState<RequestDecision | null>(null)
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const descriptionOpenerRef = useRef<HTMLButtonElement | null>(null)
  const [fullDescription, setFullDescription] = useState<RequestDescription | null>(null)
  const busy = useRef(false)
  const flight = useRef(0)
  const [counts, setCounts] = useState<Partial<Record<string, number>>>({})
  const [countsLoading, setCountsLoading] = useState(true)
  const employeeQuery = ownOnly ? ownEmployeeId ?? undefined : listEmployee ? Number(listEmployee) : undefined
  const inbox = usePagedList<TimeRequest>("/requests", {
    status,
    ...(employeeQuery ? { employee_id: employeeQuery } : {}),
    ...(listKind ? { kind: listKind } : {}),
  })

  async function load() {
    setOwnEmployeeId(null)
    if (!personId) {
      setCanRequest(false)
      return
    }
    const own = await listRecords<Employee>("/employees", { page: 1, limit: 1, person_id: personId, fields: `${employeePickFields},situation` })
    const employee = own.items[0]
    setOwnEmployeeId(employee?.id ?? null)
    setCanRequest(employee != null && employee.situation !== "dismissed")
  }

  useEffect(() => {
    let active = true
    load().catch((caught: unknown) => {
      if (active) {
        toastError(caught instanceof Error ? caught.message : "Não foi possível listar.")
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
      ...(employeeQuery ? { employee_id: employeeQuery } : {}),
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
  }, [inbox.loading, inbox.error, inbox.total, status, employeeQuery, listKind, tenantId])

  function openDecision(item: TimeRequest, action: "approved" | "rejected" | "cancelled", opener: HTMLButtonElement) {
    if (busy.current) {
      return
    }
    openerRef.current = opener
    setNote("")
    setDecision({
      id: item.id,
      action,
      kind: item.kind,
      kindLabel: requestKindLabel[item.kind] || item.kind,
      person: String(item.employee_id),
    })
  }

  function closeDecision() {
    if (busy.current) {
      return
    }
    setDecision(null)
  }

  function openDescription(text: string, photo: string | null, opener: HTMLButtonElement) {
    descriptionOpenerRef.current = opener
    setFullDescription({ text, photo })
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
    try {
      await updateRecord("/requests", current.id, { status: current.action, decision_note: text.trim() || null })
      if (ticket !== flight.current) {
        return
      }
      setNote("")
      setDecision(null)
      inbox.reload()
    } catch {
      // O interceptor já avisou o erro.
      if (ticket !== flight.current) {
        return
      }
      inbox.reload()
    } finally {
      if (ticket === flight.current) {
        busy.current = false
        setSaving(false)
      }
    }
  }

  function ownRequest(item: TimeRequest) {
    return ownEmployeeId != null && item.employee_id === ownEmployeeId
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

  function mayCancel(item: TimeRequest) {
    return item.status === "pending" && ownRequest(item)
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <div className="grid min-w-0 grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-4" role="tablist">
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
                  selected ? tab.selected : cn("border-ui-line-soft bg-white shadow-[0_6px_18px_rgb(var(--ui-shadow)/0.05)]", tab.idle),
                )}
                onClick={() => setStatus(tab.id)}
              >
                <span className={cn("flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-2xl", tab.iconWrap)}>
                  <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-ui-ink">{tab.label}</span>
                  <span className="mt-0.5 block truncate text-[13px] text-brand-quiet">{tab.description}</span>
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
      <section className="rounded-[14px] border border-ui-line-soft bg-white p-5 shadow-[0_8px_24px_rgb(var(--ui-shadow)/0.04)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-cta/10 text-brand-cta">
              <Filter className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-ui-ink">Filtros</h2>
              <p className="text-sm text-brand-quiet">Refine a exibição das solicitações</p>
            </div>
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
        <div className={cn("mt-5 grid gap-4", ownOnly ? "sm:grid-cols-1" : "sm:grid-cols-2")}>
          {ownOnly ? null : (
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="request-employee">
              Funcionário
            </Label>
            <EmployeeCombobox
              id="request-employee"
              value={listEmployee}
              emptyLabel="Todos"
              onChange={setListEmployee}
            />
          </div>
          )}
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
      <section className="rounded-[14px] border border-ui-line-soft bg-white p-5 shadow-[0_8px_24px_rgb(var(--ui-shadow)/0.04)] sm:p-6">
        {inbox.loading ? (
          <ul>
            <ListPlaceholder loading empty="Nenhuma solicitação." />
          </ul>
        ) : null}
        {!inbox.loading && !inbox.error && inbox.items.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <span className="mx-auto flex h-[76px] w-[76px] items-center justify-center rounded-full bg-brand-cta/10 text-brand-cta">
              <FileText className="h-8 w-8" strokeWidth={1.75} aria-hidden />
            </span>
            <p className="mt-4 text-[17px] font-semibold text-ui-ink">Nenhuma solicitação.</p>
            <p className="mt-1 text-sm text-brand-quiet">Quando houver solicitações, elas aparecerão aqui.</p>
          </div>
        ) : null}
        {!inbox.loading && !inbox.error && inbox.items.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {inbox.items.map((item) => {
              const person = String(item.employee_id)
              const kindLabel = requestKindLabel[item.kind] || item.kind
              const punches = requestedPunches(item.punches ?? [])
              const period = periodText(item)
              const detail = item.kind === "adjustment" ? punches || "Nenhuma marcação pedida" : period
              const certificate = certificateText(item)
              const lead = item.kind === "adjustment" ? "Marcações pedidas: " : ""
              const body = [detail, certificate, item.note].filter((part) => part && part.trim()).join("\n")
              const descriptionText = `${lead}${body}`
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
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-cta/12 text-sm font-semibold text-brand-ink-strong">
                    {personInitials(person) || "?"}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ui-ink" title={person}>
                      {person}
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-brand-quiet">{kindLabel}</span>
                  </span>
                </div>
              )
              const detailBlock = () => (
                <div className="flex min-w-0 items-start gap-2">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-ui-slate-soft" strokeWidth={1.75} aria-hidden />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <ClampedRequestText lead={lead} detail={detail} extra={certificate} note={item.note || ""} photo={item.photo_url} onOpen={(opener) => openDescription(descriptionText, item.photo_url, opener)} />
                    {pendingNote ? <p className="mt-1 break-words text-xs leading-5 text-brand-quiet">{pendingNote}</p> : null}
                    {ownNote ? <p className="mt-1 break-words text-xs leading-5 text-brand-quiet">{ownNote}</p> : null}
                  </div>
                </div>
              )
              const originBlock = () => (
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-ui-slate-soft" strokeWidth={1.75} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[11px] text-ui-slate-soft">Origem</p>
                    <p className="truncate text-sm text-brand-muted">{origin}</p>
                  </div>
                </div>
              )
              const historyBlock = () => (
                <div className="flex min-w-0 items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 shrink-0 text-ui-slate-soft" strokeWidth={1.75} aria-hidden />
                  <p className="min-w-0 truncate text-sm text-brand-muted" title={history || undefined}>
                    {history}
                  </p>
                </div>
              )
              return (
                <li
                  key={item.id}
                  className="min-w-0 overflow-hidden rounded-[14px] border border-ui-line-soft bg-white px-4 py-3.5 shadow-[0_6px_18px_rgb(var(--ui-shadow)/0.04)] transition-[transform,border-color,box-shadow] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-ui-line-soft hover:shadow-[0_10px_24px_rgb(var(--ui-shadow)/0.08)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
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
                    <div className="min-w-0 flex-1 overflow-hidden border-l border-ui-panel px-4">{detailBlock()}</div>
                    <div className="w-[12%] min-w-0 shrink-0 overflow-hidden border-l border-ui-panel px-4">{originBlock()}</div>
                    <div className="w-[17%] min-w-0 shrink-0 overflow-hidden border-l border-ui-panel px-4">{historyBlock()}</div>
                    <div className="shrink-0 pl-4">{statusBadge()}</div>
                  </div>
                  {mayDecide(item) || mayCancel(item) ? (
                    <div className="mt-3 flex flex-wrap gap-2 lg:justify-end">
                      {mayCancel(item) ? (
                        <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} onClick={(event) => openDecision(item, "cancelled", event.currentTarget)}>
                          <Ban className="h-4 w-4" aria-hidden />
                          Cancelar
                        </Button>
                      ) : null}
                      {mayDecide(item) ? (
                        <>
                          <Button type="button" className={modulePrimaryClass} onClick={(event) => openDecision(item, "approved", event.currentTarget)}>
                            <CircleCheck className="h-4 w-4" aria-hidden />
                            Aprovar
                          </Button>
                          <Button type="button" className={cn(moduleDangerClass, "h-11 px-4")} onClick={(event) => openDecision(item, "rejected", event.currentTarget)}>
                            <CircleX className="h-4 w-4" aria-hidden />
                            Recusar
                          </Button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : null}
        {!inbox.loading && !inbox.error && inbox.total > 0 ? (
          <div className="mt-4 border-t border-ui-panel pt-4">
            <ListPager page={inbox.page} pageSize={inbox.pageSize} total={inbox.total} onPage={inbox.setPage} onPageSize={inbox.setPageSize} tone="module" />
          </div>
        ) : null}
      </section>
      <RequestDecisionDialog
        target={decision}
        note={note}
        saving={saving}
        onNote={setNote}
        onClose={closeDecision}
        onConfirm={confirmDecision}
        onRest={() => openerRef.current?.focus()}
      />
      <RequestDescriptionDialog target={fullDescription} onClose={() => setFullDescription(null)} onRest={() => descriptionOpenerRef.current?.focus()} />
    </div>
  )
}

const ClosingIcon = conceptIcon.closing

function closingStatusClass(status: string) {
  if (status === "closed") return "bg-brand-cta/14 text-brand-ink-strong"
  if (status === "open") return "bg-warn-soft text-warn-brown"
  return "bg-ui-wash text-ui-slate-mid"
}

function ClosingActions({
  item,
  onClose,
  onAsk,
  onDelete,
}: {
  item: Closing
  onClose: (item: Closing, button: HTMLButtonElement) => void
  onAsk: (item: Closing, status: "cancelled" | "open", button: HTMLButtonElement) => void
  onDelete: (item: Closing, button: HTMLButtonElement) => void
}) {
  const remove = (
    <ActionTip label="Excluir">
      <Button type="button" variant="outline" className={moduleDangerIconClass} aria-label="Excluir fechamento" onClick={(event) => onDelete(item, event.currentTarget)}>
        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
      </Button>
    </ActionTip>
  )
  if (item.status === "open") {
    return (
      <div className="inline-flex justify-center gap-1.5">
        <ActionTip label="Fechar">
          <Button type="button" variant="outline" className={moduleIconClass} aria-label="Fechar período" onClick={(event) => onClose(item, event.currentTarget)}>
            <Lock className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </ActionTip>
        {remove}
      </div>
    )
  }
  return (
    <div className="inline-flex justify-center gap-1.5">
      {item.status === "closed" ? (
        <ActionTip label="Ver resultado">
          <Button asChild variant="outline" className={moduleIconClass}>
            <Link to={`/closings/${item.id}`} aria-label="Ver resultado">
              <Eye className="h-4 w-4" strokeWidth={1.75} />
            </Link>
          </Button>
        </ActionTip>
      ) : null}
      <ActionTip label="Reabrir">
        <Button type="button" variant="outline" className={moduleIconClass} aria-label="Reabrir período" onClick={(event) => onAsk(item, "open", event.currentTarget)}>
          <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </ActionTip>
      {item.status === "closed" ? (
        <ActionTip label="Cancelar">
          <Button type="button" variant="outline" className={moduleDangerIconClass} aria-label="Cancelar fechamento" onClick={(event) => onAsk(item, "cancelled", event.currentTarget)}>
            <Ban className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </ActionTip>
      ) : remove}
    </div>
  )
}

export function ClosingsPage() {
  const role = useAuthStore((state) => state.user?.role)
  const canManage = role === "admin" || role === "manager"
  const setTabAction = useContext(TabAction)
  const [filterYear, setFilterYear] = useState("")
  const [filterMonth, setFilterMonth] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [reasonAsk, setReasonAsk] = useState<null | { id: number; status: "cancelled" | "open"; period: string }>(null)
  const [reason, setReason] = useState("")
  const [closingItem, setClosingItem] = useState<Closing | null>(null)
  const [removing, setRemoving] = useState<Closing | null>(null)
  const [sort, setSort] = useState<{ key: "period" | "status" | "history"; dir: "asc" | "desc" } | null>(null)
  const closeOpenerRef = useRef<HTMLButtonElement | null>(null)
  const reasonOpenerRef = useRef<HTMLButtonElement | null>(null)
  const removeOpenerRef = useRef<HTMLButtonElement | null>(null)
  const periods = usePagedList<Closing>("/closings", {
    ...(/^\d+$/.test(filterYear) ? { year: Number(filterYear) } : {}),
    ...(/^\d+$/.test(filterMonth) ? { month: Number(filterMonth) } : {}),
    ...(filterStatus ? { status: filterStatus } : {}),
  })

  useEffect(() => {
    if (!canManage) {
      setTabAction(null)
      return () => setTabAction(null)
    }
    setTabAction(
      <Button asChild className={modulePrimaryClass}>
        <Link to="/closings/new">
          <Plus className="h-4 w-4" />
          Novo fechamento
        </Link>
      </Button>,
    )
    return () => setTabAction(null)
  }, [canManage, setTabAction])

  async function changePeriod(id: number, status: "closed" | "cancelled" | "open", note = "") {
    const motive = note.trim()
    if (status !== "closed" && !motive) {
      toastError("Informe a observação.")
      return false
    }
    try {
      await updateRecord("/closings", id, { status, note: motive || null })
      periods.reload()
      return true
    } catch {
      return false
    }
  }

  function askReason(item: Closing, status: "cancelled" | "open", button: HTMLButtonElement) {
    setReason("")
    reasonOpenerRef.current = button
    setReasonAsk({ id: item.id, status, period: `${showDate(item.starts_on)} a ${showDate(item.ends_on)}` })
  }

  function toggleSort(key: "period" | "status" | "history") {
    setSort((current) => {
      if (current?.key !== key) return { key, dir: "asc" }
      if (current.dir === "asc") return { key, dir: "desc" }
      return null
    })
  }

  function sortText(item: Closing, key: "period" | "status" | "history") {
    if (key === "status") return closingStatusLabel[item.status] || item.status
    if (key === "history") return item.events.map((event) => closingEventLabel[event.kind] || event.kind).join(" → ")
    return item.starts_on
  }

  const rows = !sort ? periods.items : [...periods.items].sort((left, right) => sortText(left, sort.key).localeCompare(sortText(right, sort.key), "pt-BR") * (sort.dir === "asc" ? 1 : -1))

  function sortButton(key: "period" | "status" | "history", label: string) {
    const active = sort?.key === key
    return (
      <button type="button" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ui-slate transition-colors duration-200 hover:text-ui-slate-deep" onClick={() => toggleSort(key)}>
        {label}
        <SortArrows active={active} dir={sort?.dir ?? "asc"} />
      </button>
    )
  }

  const showEmpty = !periods.loading && !periods.error && periods.items.length === 0

  return (
    <div className="w-full min-w-0 space-y-[18px]">
      <section className={moduleCardClass}>
        <div>
          <h2 className="text-lg font-semibold text-brand-ink">Fechamento</h2>
          <p className="mt-1 text-sm text-brand-quiet">Consulte os períodos de fechamento.</p>
        </div>
        <div className="mt-[18px] grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="closing-filter-year">
              Ano
            </Label>
            <YearPickerField id="closing-filter-year" value={filterYear} placeholder="Selecione o ano" onChange={setFilterYear} />
          </div>
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="closing-filter-month">
              Mês
            </Label>
            <SiteSelect id="closing-filter-month" value={filterMonth} icon={Calendar} placeholder="Todos" options={[{ value: "", label: "Todos" }, ...monthOptions]} onChange={setFilterMonth} />
          </div>
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="closing-filter-status">
              Situação
            </Label>
            <SiteSelect
              id="closing-filter-status"
              value={filterStatus}
              icon={List}
              placeholder="Todos"
              options={[{ value: "", label: "Todos" }, ...Object.entries(closingStatusLabel).map(([value, label]) => ({ value, label }))]}
              onChange={setFilterStatus}
            />
          </div>
        </div>
      </section>
      <div className="overflow-hidden rounded-[14px] border border-ui-line bg-white shadow-[0_8px_24px_rgb(var(--ui-shadow)/0.04)]">
        {periods.loading && periods.items.length === 0 ? (
          <div className="flex justify-center px-6 py-12">
            <Spinner />
          </div>
        ) : null}
        {showEmpty ? (
          <div className="px-6 py-12 text-center">
            <span className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-ui-wash text-ui-slate">
              <ClosingIcon className="h-8 w-8" strokeWidth={1.75} aria-hidden />
            </span>
            <p className="mt-4 text-[17px] font-semibold text-ui-ink">Nenhum fechamento encontrado</p>
            <p className="mt-1 text-sm text-brand-quiet">Não há períodos de fechamento com os filtros selecionados.</p>
          </div>
        ) : null}
        {periods.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-ui-wash">
                  <th className="px-4 py-3 text-left font-semibold">{sortButton("period", "Período")}</th>
                  <th className="px-4 py-3 text-left font-semibold">{sortButton("status", "Situação")}</th>
                  <th className="px-4 py-3 text-left font-semibold">{sortButton("history", "Histórico")}</th>
                  {canManage ? <th className="w-px whitespace-nowrap px-4 py-3 text-center align-middle text-sm font-semibold text-ui-slate">Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const steps = item.events.map((event) => closingEventLabel[event.kind] || event.kind)
                  const motive = [...item.events].reverse().find((event) => event.note?.trim())?.note?.trim() || ""
                  return (
                    <tr key={item.id} className="border-b border-ui-wash transition-colors duration-200 last:border-b-0 hover:bg-brand-soft-alt motion-reduce:transition-none">
                      <td className="px-4 py-3 align-middle">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-tint text-brand-cta" aria-hidden>
                            <ClosingIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                          </span>
                          <span className="block truncate font-semibold leading-5 text-ui-ink">
                            {showDate(item.starts_on)} a {showDate(item.ends_on)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className={cn("inline-flex h-7 items-center rounded-full px-3 text-[13px] font-semibold leading-none", closingStatusClass(item.status))}>
                          {closingStatusLabel[item.status] || item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className={cn("block text-sm leading-5", steps.length > 0 ? "text-ui-slate-deep" : "text-ui-slate-soft")}>
                          {steps.length > 0 ? steps.join(" → ") : "Sem histórico informado"}
                        </span>
                        {motive ? <span className="mt-0.5 block text-sm leading-5 text-ui-slate">{motive}</span> : null}
                      </td>
                      {canManage ? (
                        <td className="w-px whitespace-nowrap px-4 py-3 text-center align-middle">
                          <ClosingActions
                            item={item}
                            onClose={(period, button) => {
                              closeOpenerRef.current = button
                              setClosingItem(period)
                            }}
                            onAsk={(period, status, button) => askReason(period, status, button)}
                            onDelete={(period, button) => {
                              removeOpenerRef.current = button
                              setRemoving(period)
                            }}
                          />
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {!periods.loading && !periods.error && periods.total > 0 ? (
          <div className="border-t border-ui-wash px-4 py-3">
            <ListPager page={periods.page} pageSize={periods.pageSize} total={periods.total} onPage={periods.setPage} onPageSize={periods.setPageSize} tone="module" />
          </div>
        ) : null}
      </div>
      <ClosingConfirmDialog
        open={closingItem !== null}
        period={closingItem ? `${showDate(closingItem.starts_on)} a ${showDate(closingItem.ends_on)}` : ""}
        onClose={() => setClosingItem(null)}
        onConfirm={async () => {
          if (!closingItem) return
          await changePeriod(closingItem.id, "closed")
          setClosingItem(null)
        }}
        onRest={() => closeOpenerRef.current?.focus()}
      />
      <ClosingDeleteDialog
        item={removing}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return
          try {
            await removeRecord("/closings", removing.id)
            setRemoving(null)
            periods.reload()
          } catch {
            return
          }
        }}
        onRest={() => removeOpenerRef.current?.focus()}
      />
      <ClosingReasonDialog
        ask={reasonAsk}
        reason={reason}
        onReason={setReason}
        onClose={() => {
          setReasonAsk(null)
          setReason("")
        }}
        onConfirm={async () => {
          if (!reasonAsk) return
          const done = await changePeriod(reasonAsk.id, reasonAsk.status, reason)
          if (done) {
            setReasonAsk(null)
            setReason("")
          }
        }}
        onRest={() => reasonOpenerRef.current?.focus()}
      />
    </div>
  )
}

function ClosingDeleteDialog({
  item,
  onClose,
  onConfirm,
  onRest,
}: {
  item: Closing | null
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
  const shown = useRef(false)
  restRef.current = onRest
  const open = item !== null

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

  if (!item) return null

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
        aria-labelledby="closing-delete-title"
        aria-describedby="closing-delete-text"
        className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgb(var(--ui-shadow)/0.18)] sm:p-7"
      >
        <h2 id="closing-delete-title" className="text-xl font-semibold tracking-tight text-ui-ink">
          Excluir este fechamento?
        </h2>
        <p id="closing-delete-text" className="mt-2 text-sm leading-6 text-brand-quiet">
          Este período sai da lista.
        </p>
        <p className="mt-4 rounded-xl bg-ui-line-muted px-4 py-3 text-sm font-semibold text-ui-ink">
          {showDate(item.starts_on)} a {showDate(item.ends_on)}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} onClick={dismiss} disabled={pending}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar
          </Button>
          <Button ref={confirmRef} type="button" className={cn(moduleDangerClass, "h-11 px-4")} pending={pending} onClick={() => confirm()}>
            <Trash2 className="h-4 w-4" aria-hidden />
            Excluir
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function ClosingReasonDialog({
  ask,
  reason,
  onReason,
  onClose,
  onConfirm,
  onRest,
}: {
  ask: { id: number; status: "cancelled" | "open"; period: string } | null
  reason: string
  onReason: (value: string) => void
  onClose: () => void
  onConfirm: () => Promise<void>
  onRest: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const reasonRef = useRef<HTMLTextAreaElement>(null)
  const restRef = useRef(onRest)
  const pendingRef = useRef(false)
  const dismissRef = useRef(() => {})
  const [pending, setPending] = useState(false)
  const shown = useRef(false)
  restRef.current = onRest
  const open = ask !== null
  const reopening = ask?.status === "open"

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
    reasonRef.current?.focus()
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
      const nodes = panelRef.current.querySelectorAll<HTMLElement>("textarea:not([disabled]), button:not([disabled])")
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

  if (!ask) return null

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
        aria-labelledby="closing-reason-title"
        className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgb(var(--ui-shadow)/0.18)] sm:p-7"
      >
        <h2 id="closing-reason-title" className="text-xl font-semibold tracking-tight text-ui-ink">
          {reopening ? "Reabrir este período?" : "Cancelar este fechamento?"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-brand-quiet">
          {reopening
            ? "O período volta a aberto. Marcação, ajuste, ocorrência, vigência e banco podem ser lançados de novo. O arquivo fiscal deste período deixa de valer."
            : "Os dias das pessoas voltam a aceitar lançamento. O arquivo fiscal deste período deixa de valer."}
        </p>
        <p className="mt-4 rounded-xl bg-ui-line-muted px-4 py-3 text-sm font-semibold text-ui-ink">{ask.period}</p>
        <div className="mt-4 space-y-2">
          <Label className={moduleLabelClass} htmlFor="closing-reason">Observação</Label>
          <textarea ref={reasonRef} id="closing-reason" className={cn(moduleTextClass, "min-h-[92px]")} maxLength={2000} value={reason} onChange={(event) => onReason(event.target.value)} />
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} onClick={dismiss} disabled={pending}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button type="button" className={modulePrimaryClass} onClick={() => confirm()} disabled={pending}>
            <Check className="h-4 w-4" />
            Confirmar
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function OrganizationPage() {
  return (
    <DomainTabs
      title="Estrutura Organizacional"
      organization
      tabs={[
        { id: "units", label: "Empresas", icon: conceptIcon.unit, panel: <CatalogList catalog="units" presentation="organization" /> },
        { id: "teams", label: "Equipes", icon: conceptIcon.team, panel: <CatalogList catalog="teams" presentation="organization" /> },
        { id: "categories", label: "Categorias", icon: conceptIcon.category, panel: <CatalogList catalog="categories" presentation="organization" /> },
      ]}
    />
  )
}

export function LaborPage() {
  return (
    <DomainTabs
      title="Regras de ponto"
      organization
      tabs={[
        { id: "norms", label: "Normas", icon: conceptIcon.norm, panel: <CatalogList catalog="norms" presentation="organization" /> },
        { id: "holidays", label: "Feriados", icon: conceptIcon.holiday, panel: <CatalogList catalog="holidays" presentation="organization" /> },
        { id: "reasons", label: "Motivos", icon: conceptIcon.reason, panel: <CatalogList catalog="reasons" presentation="organization" /> },
      ]}
    />
  )
}

const noticeChannels = [
  ["system", "Sistema"],
  ["email", "E-mail"],
  ["both", "Os dois"],
] as const

function NoticeChannel({ value, onChange }: { value: (typeof noticeChannels)[number][0]; onChange: (next: (typeof noticeChannels)[number][0]) => void }) {
  return (
    <span className="inline-flex shrink-0 rounded-lg bg-ui-line-muted p-0.5" role="group" aria-label="Canal">
      {noticeChannels.map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          className={cn("h-8 rounded-md px-2.5 text-xs font-medium", value === id ? "bg-white text-brand-ink-strong shadow-[0_1px_2px_rgb(var(--ui-shadow)/0.08)]" : "text-brand-muted")}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </span>
  )
}

export function NotificationsPage() {
  const role = useAuthStore((state) => state.user?.role)
  const canSend = role === "admin" || role === "manager"
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [preferences, setPreferences] = useState<NoticePreference[]>([])
  const [preferenceKind, setPreferenceKind] = useState("")
  const [noticeEmployee, setNoticeEmployee] = useState("")
  const [sent, setSent] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)
  const noticeKinds = Object.entries(noticePhrase).map(([value, label]) => ({ value, label }))
  const notices = usePagedList<Notice>("/notices", noticeEmployee ? { employee_id: Number(noticeEmployee) } : {})

  async function load() {
    const prefs = await listRecords<NoticePreference>("/notice-preferences", { page: 1, limit: 100 })
    setPreferences(prefs.items)
  }

  useEffect(() => {
    let active = true
    setLoaded(false)
    load()
      .then(() => {
        if (active) setLoaded(true)
      })
      .catch((caught: unknown) => {
        if (active) {
          setLoaded(true)
          toastError(caught instanceof Error ? caught.message : "Não foi possível listar.")
        }
      })
    return () => {
      active = false
    }
  }, [tenantId])

  function preferenceRow(kind: string) {
    return preferences.find((item) => item.kind === kind)
  }

  function enabled(kind: string) {
    const row = preferenceRow(kind)
    return row ? row.enabled : true
  }

  function channelOf(kind: string) {
    const value = preferenceRow(kind)?.channel
    return value === "system" || value === "email" || value === "both" ? value : "both"
  }

  async function mark(id: number) {
    try {
      await updateRecord("/notices", id, { read: true })
      notices.reload()
      notifyNoticesChanged()
    } catch {
      // O interceptor já avisou o erro.
    }
  }

  async function setEnabled(kind: string, next: boolean) {
    try {
      const row = preferences.find((item) => item.kind === kind)
      if (row) {
        await updateRecord("/notice-preferences", row.id, { enabled: next })
      } else if (!next) {
        await createRecord("/notice-preferences", { kind, enabled: false, channel: "both" })
      }
      await load()
    } catch {
      // O interceptor já avisou o erro.
    }
  }

  async function setChannel(kind: string, channel: (typeof noticeChannels)[number][0]) {
    try {
      const row = preferenceRow(kind)
      if (row) {
        await updateRecord("/notice-preferences", row.id, { enabled: true, channel })
      } else {
        await createRecord("/notice-preferences", { kind, enabled: true, channel })
      }
      await load()
    } catch {
      // O interceptor já avisou o erro.
    }
  }

  async function sendDaily() {
    try {
      const result = await createRecord<{ created: number }>("/notice-runs", {})
      setSent(result.created)
      notices.reload()
      notifyNoticesChanged()
      await load()
    } catch {
      // O interceptor já avisou o erro.
    }
  }

  const visibleNotices = Object.entries(noticePhrase).filter(([kind]) => !preferenceKind || kind === preferenceKind)

  return (
    <div className="w-full min-w-0 space-y-5">
      <BackLink to="/settings" appearance="detail" />
      <DomainTabs
        title="Notificações"
        module
        tabs={[
          {
            id: "notices",
            label: "Avisos",
            icon: Bell,
            panel: (
      <section className={cn(moduleCardClass, "space-y-5")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-cta/10 text-brand-cta" aria-hidden>
              <Bell className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-ui-ink">Avisos</h2>
              <p className="text-sm text-ui-slate">Avisos recebidos nesta conta.</p>
            </div>
          </div>
          {canSend ? (
            <Button type="button" className={cn(modulePrimaryClass, "w-full shrink-0 sm:w-auto")} onClick={() => sendDaily()}>
              <Send className="h-4 w-4" />
              Enviar os avisos do dia
            </Button>
          ) : null}
        </div>
        {sent !== null ? <p className="text-sm font-medium text-brand-cta">{sent} avisos enviados.</p> : null}
        <div className="space-y-2">
          <Label className={moduleLabelClass} htmlFor="notice-employee">Funcionário</Label>
          <EmployeeCombobox id="notice-employee" value={noticeEmployee} emptyLabel="Todos" onChange={setNoticeEmployee} />
        </div>
        {notices.loading && notices.items.length === 0 && !notices.error ? (
          <div className="flex justify-center py-10" role="status">
            <Spinner label="Carregando as notificações" className="h-8 w-8 text-brand-cta" />
          </div>
        ) : null}
        {!notices.loading && !notices.error && notices.items.length === 0 ? (
          <div className="px-2 py-10 text-center">
            <p className="text-[15px] font-semibold text-ui-ink">Nenhuma notificação</p>
            <p className="mt-1 text-sm text-brand-quiet">A consulta não encontrou registros.</p>
          </div>
        ) : null}
        {notices.items.length > 0 ? (
          <ul className="space-y-2">
            {notices.items.map((item) => (
              <li key={item.id} className="flex min-h-16 flex-col gap-3 rounded-xl border border-ui-line bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-5 text-ui-ink">{item.body || "Não informado"}</span>
                  <span className="mt-0.5 block text-sm text-ui-slate">{showDateTime(item.created_at)}</span>
                </span>
                {item.read_at ? (
                  <span className="shrink-0 rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand-cta">Lida</span>
                ) : (
                  <Button type="button" className={cn(moduleQuietClass, "h-10 shrink-0 px-3")} onClick={() => mark(item.id)}>
                    <Check className="h-4 w-4" />
                    Marcar lida
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        {notices.total > 0 ? (
          <div className="border-t border-ui-wash pt-4">
            <ListPager page={notices.page} pageSize={notices.pageSize} total={notices.total} onPage={notices.setPage} onPageSize={notices.setPageSize} tone="module" />
          </div>
        ) : null}
      </section>
            ),
          },
          {
            id: "notice-preferences",
            label: "Preferências",
            icon: SlidersHorizontal,
            panel: (
      <section className={cn(moduleCardClass, "space-y-5")}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-cta/10 text-brand-cta" aria-hidden>
            <SlidersHorizontal className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ui-ink">Preferências</h2>
            <p className="text-sm text-ui-slate">Escolha os avisos e o canal: sistema, e-mail ou os dois.</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label className={moduleLabelClass} htmlFor="preference-kind">Tipo</Label>
          <SiteSelect id="preference-kind" value={preferenceKind} className="h-12" placeholder="Todos" options={[{ value: "", label: "Todos" }, ...noticeKinds]} onChange={setPreferenceKind} />
        </div>
        {!loaded ? (
          <div className="flex justify-center py-10" role="status">
            <Spinner label="Carregando os avisos" className="h-8 w-8 text-brand-cta" />
          </div>
        ) : visibleNotices.length === 0 ? (
          <div className="px-2 py-10 text-center">
            <p className="text-[15px] font-semibold text-ui-ink">Nenhum aviso</p>
            <p className="mt-1 text-sm text-brand-quiet">A consulta não encontrou registros.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {visibleNotices.map(([kind, phrase]) => (
              <li key={kind} className={cn("flex min-h-16 flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between", enabled(kind) ? "border-brand-glow bg-brand-soft-alt" : "border-ui-line bg-white")}>
                <label htmlFor={`notice-${kind}`} className="flex min-w-0 cursor-pointer items-center gap-3">
                  <span className="relative h-[22px] w-[22px] shrink-0">
                    <input id={`notice-${kind}`} type="checkbox" className="peer sr-only" checked={enabled(kind)} onChange={(event) => void setEnabled(kind, event.target.checked)} />
                    <span className="pointer-events-none flex h-[22px] w-[22px] items-center justify-center rounded-[7px] border border-ui-line-strong bg-white peer-checked:border-brand-cta peer-checked:bg-brand-cta peer-checked:[&>svg]:opacity-100 peer-focus-visible:shadow-[0_0_0_3px_rgb(var(--brand-cta)/0.16)]">
                      <Check className="h-3.5 w-3.5 text-white opacity-0" strokeWidth={2.75} />
                    </span>
                  </span>
                  <span className="min-w-0 text-sm font-medium leading-5 text-ui-ink">{phrase}</span>
                </label>
                {enabled(kind) ? <NoticeChannel value={channelOf(kind)} onChange={(next) => void setChannel(kind, next)} /> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
            ),
          },
        ]}
      />
    </div>
  )
}

function monthStart() {
  return `${punchDay(new Date().toISOString()).slice(0, 8)}01`
}

type ReportQuery = {
  kind: string
  startsOn: string
  endsOn: string
  employeeId: string
  unitIds: string
  teamIds: string
  jobIds: string
  journeyIds: string
  categoryIds: string
  situation: string
}

function reportExtra(query: ReportQuery) {
  const extra: Record<string, string> = {}
  if (query.unitIds) extra.unit_id = query.unitIds
  if (query.teamIds) extra.team_id = query.teamIds
  if (query.jobIds) extra.job_id = query.jobIds
  if (query.journeyIds) extra.journey_id = query.journeyIds
  if (query.categoryIds) extra.category_value_id = query.categoryIds
  if (query.situation) extra.situation = query.situation
  return extra
}

function punchMeasure(detail: string, label: string) {
  const match = new RegExp(`${label} (-?\\d+:\\d{2})`).exec(detail)
  if (!match) return null
  const parts = /^(-?)(\d+):(\d{2})$/.exec(match[1])
  if (!parts) return null
  const total = Number(parts[2]) * 60 + Number(parts[3])
  return parts[1] === "-" ? -total : total
}

function reportGroups(items: Report["items"]) {
  const groups: { date: string; items: Report["items"] }[] = []
  for (const item of items) {
    const date = item.occurred_on.slice(0, 10)
    const last = groups[groups.length - 1]
    if (last && last.date === date) last.items.push(item)
    else groups.push({ date, items: [item] })
  }
  return groups
}

function consultedPerson(query: ReportQuery, items: Report["items"]) {
  if (!query.employeeId) return "Todos"
  return items.find((item) => item.full_name)?.full_name || "Funcionário selecionado"
}

export function ReportsPage() {
  const role = useAuthStore((state) => state.user?.role)
  const canRead = role === "admin" || role === "manager"
  const navigate = useNavigate()
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const requestId = useRef(0)
  const [catalog, setCatalog] = useState<ReportCatalogItem[]>([])
  const [filtersReady, setFiltersReady] = useState(false)
  const [kind, setKind] = useState("punch")
  const [startsOn, setStartsOn] = useState(monthStart)
  const [endsOn, setEndsOn] = useState(() => punchDay(new Date().toISOString()))
  const [employeeId, setEmployeeId] = useState("")
  const places = useOrganizationFilters(canRead)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [result, setResult] = useState<Report | null>(null)
  const [applied, setApplied] = useState<ReportQuery | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!role || canRead) return
    navigate("/", { replace: true })
  }, [role, canRead, navigate])

  useEffect(() => {
    if (!canRead) {
      return
    }
    let active = true
    setFiltersReady(false)
    listRecords<ReportCatalogItem>("/report-catalog", { page: 1, limit: 20 })
      .then((reports) => {
        if (!active) {
          return
        }
        setCatalog(reports.items)
        if (reports.items[0]) {
          setKind(reports.items[0].kind)
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          toastError(caught instanceof Error ? caught.message : "Não foi possível listar os relatórios.")
        }
      })
      .finally(() => {
        if (active) setFiltersReady(true)
      })
    return () => {
      active = false
    }
  }, [canRead, tenantId])

  async function openPage(page: number, next: ReportQuery) {
    const ticket = requestId.current + 1
    requestId.current = ticket
    const sameQuery = applied?.kind === next.kind && applied.startsOn === next.startsOn && applied.endsOn === next.endsOn && applied.employeeId === next.employeeId && applied.unitIds === next.unitIds && applied.teamIds === next.teamIds && applied.jobIds === next.jobIds && applied.journeyIds === next.journeyIds && applied.categoryIds === next.categoryIds && applied.situation === next.situation
    setLoading(true)
    if (!sameQuery) {
      setApplied(null)
      setResult(null)
    }
    try {
      const data = await getReport(next.kind, next.startsOn, next.endsOn, page, next.employeeId ? Number(next.employeeId) : undefined, 20, reportExtra(next))
      if (ticket !== requestId.current) return
      setApplied(next)
      setResult(data)
    } catch (caught) {
      if (ticket !== requestId.current) return
      setApplied(null)
      setResult(null)
      toastError(caught instanceof Error ? caught.message : "Não foi possível consultar.")
    } finally {
      if (ticket === requestId.current) setLoading(false)
    }
  }

  async function consult(event: FormEvent) {
    event.preventDefault()
    if (loading) return
    const employeesReport = kind === "employees"
    await openPage(1, {
      kind,
      startsOn,
      endsOn: employeesReport ? startsOn : endsOn,
      employeeId,
      unitIds: places.params.unit_id || "",
      teamIds: places.params.team_id || "",
      jobIds: places.params.job_id || "",
      journeyIds: places.params.journey_id || "",
      categoryIds: places.params.category_value_id || "",
      situation: places.params.situation || "",
    })
  }

  async function printReport() {
    if (!applied) return
    const employee = applied.employeeId ? Number(applied.employeeId) : undefined
    try {
      const first = await getReport(applied.kind, applied.startsOn, applied.endsOn, 1, employee, 100, reportExtra(applied), true)
      const bytes = reportPdf({
        name: first.name,
        from: showDate(first.starts_on),
        until: showDate(first.ends_on),
        total: first.items.length,
        items: first.items.map((item) => ({
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
      toastError(caught instanceof Error ? caught.message : "Não foi possível imprimir.")
    }
  }

  const groups = useMemo(() => reportGroups(result?.items ?? []), [result])
  const pages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1

  if (!canRead) return null

  return (
    <div className="w-full min-w-0 space-y-4">
      <ActionForm className="rounded-xl border border-ui-line-soft bg-white p-5 shadow-[0_8px_24px_rgb(var(--ui-shadow)/0.04)] sm:p-6" onSubmit={consult}>
        <div className={cn("grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:items-end", kind === "employees" ? "xl:grid-cols-[minmax(180px,1.5fr)_minmax(140px,0.95fr)_minmax(180px,1.15fr)_auto]" : "xl:grid-cols-[minmax(180px,1.5fr)_minmax(140px,0.95fr)_minmax(140px,0.95fr)_minmax(180px,1.15fr)_auto]")}>
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="report-kind">
              Tipo de relatório
            </Label>
            <SiteSelect id="report-kind" value={kind} icon={FileText} loading={!filtersReady} options={catalog.map((item) => ({ value: item.kind, label: item.name }))} onChange={setKind} />
          </div>
          <div className="min-w-0">
            <DatePickerField id="report-start" label={kind === "employees" ? "Dia" : "De"} value={startsOn} onChange={setStartsOn} required />
          </div>
          {kind === "employees" ? null : (
          <div className="min-w-0">
            <DatePickerField id="report-end" label="Até" value={endsOn} onChange={setEndsOn} required />
          </div>
          )}
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="report-employee">
              Funcionário
            </Label>
            <EmployeeCombobox id="report-employee" value={employeeId} emptyLabel="Todos" loading={!filtersReady} onChange={setEmployeeId} />
          </div>
          <Button type="submit" className={cn(modulePrimaryClass, "h-[50px] w-full px-5 sm:col-span-2 xl:col-span-1 xl:w-auto")} disabled={loading}>
            <Search className="h-4 w-4" aria-hidden />
            Consultar
          </Button>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-ui-ink">Filtros</p>
          <button
            type="button"
            className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors", filtersOpen || places.active ? "bg-brand-cta/10 text-brand-cta" : "text-ui-slate hover:bg-ui-paper hover:text-ui-ink")}
            aria-expanded={filtersOpen}
            aria-label={filtersOpen ? "Ocultar filtros" : "Mostrar filtros"}
            onClick={() => setFiltersOpen((current) => !current)}
          >
            <Filter className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        {filtersOpen ? (
        <div className="mt-4 rounded-xl border border-ui-line bg-ui-canvas p-4">
          <OrganizationFilterFields idPrefix="report" filters={places} />
        </div>
        ) : null}
      </ActionForm>
      {result && applied ? (
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(
            [
              [FileText, "Tipo", result.name],
              [Calendar, result.starts_on === result.ends_on ? "Dia" : "Período", result.starts_on === result.ends_on ? showDate(result.starts_on) : `${showDate(result.starts_on)} a ${showDate(result.ends_on)}`],
              [conceptIcon.employee, "Funcionário", consultedPerson(applied, result.items)],
              [List, "Pessoas na consulta", String(result.total)],
            ] as const
          ).map(([Icon, label, value]) => (
            <div key={label} className="flex min-w-0 items-center gap-3 rounded-xl border border-brand-glow bg-brand-wash px-4 py-3 shadow-[0_8px_22px_rgb(var(--brand-cta)/0.1)]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-edge bg-white text-brand-ink-strong">
                <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-brand-nav">{label}</span>
                <span className="mt-0.5 block truncate text-sm font-semibold text-ui-ink" title={value}>
                  {value}
                </span>
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {loading && !result ? (
        <div className="flex justify-center rounded-xl border border-ui-line-soft bg-white px-5 py-10" role="status" aria-live="polite">
          <Spinner label="Consultando o relatório" className="h-8 w-8 text-brand-cta" />
        </div>
      ) : null}
      {!loading && !result ? (
        <div className="rounded-xl border border-ui-line bg-white px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-ui-ink">Nenhum relatório consultado.</p>
          <p className="mt-1 text-sm text-brand-quiet">Escolha o período e consulte para ver os registros.</p>
        </div>
      ) : null}
      {result ? (
        <section className="space-y-4" aria-busy={loading || undefined}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-ui-ink">
                {result.name} · {result.starts_on === result.ends_on ? showDate(result.starts_on) : `${showDate(result.starts_on)} a ${showDate(result.ends_on)}`}
              </h2>
              <p className="text-sm text-brand-quiet">{result.total === 0 ? "Nenhuma pessoa encontrada" : result.total === 1 ? "1 pessoa nesta página de consulta" : `${result.total} pessoas na consulta`}</p>
            </div>
            <Button type="button" variant="outline" className={cn(moduleQuietClass, "hover:border-brand-cta/35 hover:bg-brand-cta/6 hover:text-brand-ink-strong")} disabled={!applied} onClick={printReport}>
              <Printer className="h-4 w-4" aria-hidden />
              Imprimir
            </Button>
          </div>
          {result.total === 0 ? (
            <div className="rounded-xl border border-ui-line bg-white px-6 py-10 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-cta/8 text-brand-cta">
                <FileText className="h-6 w-6" strokeWidth={1.75} aria-hidden />
              </span>
              <p className="mt-4 text-[15px] font-semibold text-ui-ink">Nenhum registro encontrado</p>
              <p className="mt-1 text-sm text-brand-quiet">A consulta terminou sem registros neste período.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map((group) => (
                <section key={group.date} className="overflow-hidden rounded-xl border border-brand-edge bg-white shadow-[0_8px_22px_rgb(var(--ui-shadow)/0.07)]">
                  <h3 className="flex items-center gap-2 border-b border-brand-edge bg-brand-mist px-4 py-2.5 text-sm font-semibold text-brand-ink-strong">
                    <Calendar className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    {showDate(group.date)}
                  </h3>
                  <ul className="divide-y divide-[rgb(var(--ui-panel))]">
                    {group.items.map((item, index) => (
                      <ReportResultRow key={`${group.date}-${item.employee_id ?? "organização"}-${item.title}-${item.detail}-${index}`} item={item} kind={result.kind} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
          {result.total > result.limit ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className={moduleQuietClass}
                disabled={loading || result.page <= 1}
                onClick={() => {
                  if (applied) void openPage(result.page - 1, applied)
                }}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-sm text-brand-quiet">
                Página {result.page} de {pages}
              </span>
              <Button
                type="button"
                variant="outline"
                className={moduleQuietClass}
                disabled={loading || result.page >= pages}
                onClick={() => {
                  if (applied) void openPage(result.page + 1, applied)
                }}
              >
                <ChevronRight className="h-4 w-4" />
                Próxima
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

function ReportResultRow({ item, kind }: { item: Report["items"][number]; kind: string }) {
  if (kind === "marking") {
    const state = item.detail.startsWith("vale") ? "Vale" : "Deixou de valer"
    return (
      <li className="min-w-0 px-4 py-3 text-sm transition-colors duration-[180ms] hover:bg-brand-soft-alt motion-reduce:transition-none">
        <p className="font-medium text-ui-ink">{item.full_name || "Não informado"}</p>
        <p className="mt-1 text-brand-muted">{showDate(item.occurred_on)} · {item.title} · {state}</p>
      </li>
    )
  }
  if (kind === "punch") {
    const worked = punchMeasure(item.detail, "trabalhadas")
    const extra = punchMeasure(item.detail, "hora extra")
    const night = punchMeasure(item.detail, "adicional noturno")
    const shortage = punchMeasure(item.detail, "falta")
    if (worked !== null && extra !== null && night !== null && shortage !== null) {
      const metrics = [
        ["H. trabalhadas", showDuration(worked)],
        ["H. extras", showDuration(extra)],
        ["adicional noturno", showDuration(night)],
      ] as const
      return (
        <li className="flex min-w-0 flex-col gap-2 px-4 py-3 transition-colors duration-[180ms] hover:bg-brand-soft-alt motion-reduce:transition-none sm:flex-row sm:items-center sm:justify-between">
          <span className="flex min-w-0 items-center gap-2 text-sm text-ui-ink">
            <conceptIcon.employee className="h-4 w-4 shrink-0 text-ui-slate-soft" strokeWidth={1.75} aria-hidden />
            <span className="truncate">
              {item.title}
              {item.full_name ? <span className="font-medium"> · {item.full_name}</span> : null}
            </span>
          </span>
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-brand-muted">
            {metrics.map(([label, value], metricIndex) => (
              <span key={label} className="inline-flex items-center gap-2">
                {metricIndex > 0 ? <span aria-hidden>|</span> : null}
                <span>
                  {label} <span className="tabular-nums">{value}</span>
                </span>
              </span>
            ))}
            <span aria-hidden>|</span>
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums", shortage > 0 ? "bg-[rgb(var(--danger)/0.14)] text-danger-ink" : "bg-ui-paper text-brand-muted")}>
              H. faltantes {showDuration(shortage)}
            </span>
          </span>
        </li>
      )
    }
  }
  return (
    <li className="min-w-0 px-4 py-3 text-sm transition-colors duration-[180ms] hover:bg-brand-soft-alt motion-reduce:transition-none">
      <p className="font-medium text-ui-ink">{item.full_name || item.title}</p>
      <p className="mt-1 text-brand-muted [overflow-wrap:anywhere]">{item.full_name ? `${item.title} · ${item.detail}` : item.detail}</p>
    </li>
  )
}

function downloadFiscalFile(file: FiscalFile) {
  if (!file.content) return
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
  const role = useAuthStore((state) => state.user?.role)
  const canRead = role === "admin" || role === "manager"
  const navigate = useNavigate()

  useEffect(() => {
    if (!role || canRead) return
    navigate("/", { replace: true })
  }, [role, canRead, navigate])

  if (!canRead) return null

  return (
    <DomainTabs
      organization
      title="Fiscal / Folha"
      tabs={[
        { id: "fiscal-files", label: "AFD / AEJ", icon: FileText, panel: <AfdPanel /> },
        { id: "payroll-totals", label: "Totais da folha", icon: List, panel: <PayrollTotalsPanel /> },
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
  const [afdFile, setAfdFile] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState(0)
  const [imported, setImported] = useState<FiscalImport | null>(null)
  const [generating, setGenerating] = useState(false)
  const [importing, setImporting] = useState(false)
  const importingLock = useRef(false)

  async function generateFile(event: FormEvent) {
    event.preventDefault()
    if (generating) return
    setGenerating(true)
    try {
      const body = mode === "range" ? { kind, starts_on: startsOn, ends_on: endsOn || null } : { kind, year: Number(fileYear), month: Number(fileMonth) }
      const file = await createRecord<FiscalFile>("/fiscal-files", body)
      downloadFiscalFile(file)
    } catch (caught) {
      // O interceptor já avisou o erro.
    } finally {
      setGenerating(false)
    }
  }

  async function importAfd(file: File | null) {
    if (importingLock.current) return
    setAfdFile(file)
    setImported(null)
    if (!file || !file.name.toLowerCase().endsWith(".txt")) {
      toastError("Selecione um arquivo .txt.")
      return
    }
    importingLock.current = true
    setImporting(true)
    try {
      let content = ""
      try {
        content = (await readTextFile(file)).trim()
      } catch (caught) {
        toastError(caught instanceof Error ? caught.message : "Não foi possível ler o arquivo.")
        return
      }
      if (!content) {
        toastError("O arquivo está vazio.")
        return
      }
      const outcome = await createRecord<FiscalImport>("/fiscal-files/imports", { content })
      setImported(outcome)
      setAfdFile(null)
      setFileKey((current) => current + 1)
    } catch {
      // O interceptor já avisou o erro.
    } finally {
      importingLock.current = false
      setImporting(false)
    }
  }

  if (!canManage) {
    return <p className="text-sm text-ui-slate">Gerar, importar e baixar o arquivo fica com o administrador e o gestor.</p>
  }

  const fileHint = kind === "aej" ? "Arquivo da jornada. Sai de qualquer período." : "Arquivo com as marcações. Sai de qualquer período."

  return (
    <div className="w-full min-w-0 space-y-4">
      <section className={moduleCardClass}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-cta/10 text-brand-cta" aria-hidden>
            <FilePlus className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ui-ink">Gerar arquivo</h2>
            <p className="text-sm text-ui-slate">{fileHint}</p>
          </div>
        </div>
        <ActionForm className="mt-4" onSubmit={generateFile}>
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)_auto]">
            <div className="min-w-0 space-y-2">
              <Label className={moduleLabelClass} htmlFor="file-kind">Tipo de arquivo</Label>
              <SiteSelect id="file-kind" value={kind} className="h-12" options={fiscalFileKinds.map(([value, label]) => ({ value, label }))} onChange={setKind} />
            </div>
            <div className="min-w-0 space-y-2">
              <Label className={moduleLabelClass} htmlFor="file-mode">Período</Label>
              <SiteSelect
                id="file-mode"
                value={mode}
                className="h-12"
                options={[
                  { value: "month", label: "Mês civil" },
                  { value: "range", label: "Intervalo de datas" },
                ]}
                onChange={setMode}
              />
            </div>
            {mode === "month" ? (
              <>
                <div className="min-w-0 space-y-2">
                  <Label className={moduleLabelClass} htmlFor="file-month">Mês</Label>
                  <SiteSelect id="file-month" value={fileMonth} className="h-12" options={monthOptions} onChange={setFileMonth} required />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label className={moduleLabelClass} htmlFor="file-year">Ano</Label>
                  <Input id="file-year" className={moduleFieldClass} inputMode="numeric" value={fileYear} onChange={(event) => setFileYear(event.target.value)} required />
                </div>
              </>
            ) : (
              <>
                <DatePickerField id="file-start" label="De" value={startsOn} onChange={setStartsOn} required />
                <DatePickerField id="file-end" label="Até" value={endsOn} onChange={setEndsOn} />
              </>
            )}
            <Button type="submit" className={cn(modulePrimaryClass, "h-12 w-full shrink-0 sm:col-span-2 xl:col-span-1 xl:w-auto")} disabled={generating} aria-busy={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Download className="h-4 w-4" />}
              {generating ? "Gerando" : kind === "aej" ? "Gerar AEJ" : "Gerar AFD"}
            </Button>
          </div>
        </ActionForm>
      </section>
      <section className={moduleCardClass}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-cta/10 text-brand-cta" aria-hidden>
            <Upload className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ui-ink">Importar AFD</h2>
            <p className="text-sm text-ui-slate">A marcação entra com origem AFD. Se já existir no mesmo instante, só ela é ignorada e as demais seguem.</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label className={moduleLabelClass} htmlFor="afd-file">Arquivo .txt</Label>
          <div className={importing ? "pointer-events-none opacity-60" : undefined} aria-busy={importing || undefined}>
            <CertificatePhotoField id="afd-file" fileKey={fileKey} photo={afdFile} accept=".txt,text/plain" emptyLabel="Arraste ou selecione o arquivo" hint="Arquivo .txt" onChange={(file) => void importAfd(file)} />
          </div>
          {importing ? (
            <p className="flex items-center gap-2 text-sm text-ui-slate" role="status">
              <Spinner className="h-4 w-4 text-brand-cta" />
              Importando
            </p>
          ) : null}
        </div>
        {imported ? (
          <p className="mt-4 text-sm text-ui-slate">
            {imported.created} criadas, {imported.ignored} já existiam e foram ignoradas, {imported.blocked} não entraram.
          </p>
        ) : null}
      </section>
    </div>
  )
}

const payrollEventOptions = [
  ["worked", "Horas trabalhadas"],
  ["overtime", "Horas extras"],
  ["night_additional", "Adicional noturno"],
  ["shortage", "Horas faltantes"],
  ["hour_bank_balance", "Saldo do banco de horas"],
  ["absence_days", "Dias de falta"],
  ["allowance_days", "Dias em abono"],
  ["vacation_days", "Dias de férias"],
  ["leave_days", "Dias de afastamento"],
  ["certificate_days", "Dias de atestado"],
] as const

const payrollEventLabel = Object.fromEntries(payrollEventOptions)

function PayrollTotalsPanel() {
  const role = useAuthStore((state) => state.user?.role)
  const canManage = role === "admin" || role === "manager"
  const [mode, setMode] = useState("month")
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [startsOn, setStartsOn] = useState("")
  const [endsOn, setEndsOn] = useState("")
  const [notice, setNotice] = useState("")
  const [generating, setGenerating] = useState(false)
  const [savingEvent, setSavingEvent] = useState(false)
  const [systemEvent, setSystemEvent] = useState<string>("worked")
  const [externalCode, setExternalCode] = useState("")
  const [timeFormat, setTimeFormat] = useState("centesimal")
  const events = usePagedList<PayrollEvent>("/payroll-events", {}, canManage)
  const usedEvents = events.items.map((item) => item.system_event).join("|")
  const availableEvents = payrollEventOptions.filter(([value]) => !usedEvents.split("|").filter(Boolean).includes(value))

  useEffect(() => {
    const open = payrollEventOptions.filter(([value]) => !usedEvents.split("|").filter(Boolean).includes(value))
    if (open.length === 0) {
      return
    }
    if (!open.some(([value]) => value === systemEvent)) {
      setSystemEvent(open[0][0])
    }
  }, [usedEvents, systemEvent])

  async function generatePayroll(event: FormEvent) {
    event.preventDefault()
    if (generating) return
    setNotice("")
    setGenerating(true)
    try {
      const body =
        mode === "range"
          ? { kind: "payroll", starts_on: startsOn, ends_on: endsOn || null }
          : { kind: "payroll", year: Number(year), month: Number(month) }
      const file = await createRecord<FiscalFile>("/fiscal-files", body)
      downloadFiscalFile(file)
      setNotice("Download iniciado.")
    } catch {
      // O interceptor já avisou o erro.
    } finally {
      setGenerating(false)
    }
  }

  async function saveEvent(event: FormEvent) {
    event.preventDefault()
    if (savingEvent) return
    setSavingEvent(true)
    try {
      await createRecord<PayrollEvent>("/payroll-events", {
        system_event: systemEvent,
        external_code: externalCode.trim(),
        time_format: timeFormat,
        active: true,
      })
      setExternalCode("")
      const remaining = payrollEventOptions
        .map(([value]) => value)
        .filter((value) => value !== systemEvent && !events.items.some((item) => item.system_event === value))
      if (remaining[0]) {
        setSystemEvent(remaining[0])
      }
      events.reload()
    } catch {
      // O interceptor já avisou o erro.
    } finally {
      setSavingEvent(false)
    }
  }

  async function removeEvent(id: number) {
    try {
      await removeRecord("/payroll-events", id)
      events.reload()
    } catch {
      // O interceptor já avisou o erro.
    }
  }

  if (!canManage) {
    return <p className="text-sm text-ui-slate">Gerar o arquivo da folha fica com o administrador e o gestor.</p>
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      <section className={moduleCardClass}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-cta/10 text-brand-cta" aria-hidden>
            <Download className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ui-ink">Gerar arquivo</h2>
            <p className="text-sm text-ui-slate">Escolha o mês civil ou um intervalo de datas e baixe o arquivo com os eventos configurados.</p>
          </div>
        </div>
        <ActionForm className="mt-4 space-y-4" onSubmit={generatePayroll}>
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="min-w-0 space-y-2">
              <Label className={moduleLabelClass} htmlFor="payroll-mode">Período</Label>
              <SiteSelect
                id="payroll-mode"
                value={mode}
                className="h-12"
                options={[
                  { value: "month", label: "Mês civil" },
                  { value: "range", label: "Intervalo de datas" },
                ]}
                onChange={setMode}
              />
            </div>
            {mode === "month" ? (
              <>
                <div className="min-w-0 space-y-2">
                  <Label className={moduleLabelClass} htmlFor="payroll-month">Mês</Label>
                  <SiteSelect id="payroll-month" value={month} className="h-12" options={monthOptions} onChange={setMonth} required />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label className={moduleLabelClass} htmlFor="payroll-year">Ano</Label>
                  <Input id="payroll-year" className={moduleFieldClass} inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value)} required />
                </div>
              </>
            ) : (
              <>
                <DatePickerField id="payroll-start" label="De" value={startsOn} onChange={setStartsOn} required />
                <DatePickerField id="payroll-end" label="Até" value={endsOn} onChange={setEndsOn} />
              </>
            )}
            <Button type="submit" className={cn(modulePrimaryClass, "h-12 w-full shrink-0 sm:col-span-2 xl:col-span-1 xl:w-auto")} disabled={generating} aria-busy={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Download className="h-4 w-4" />}
              Gerar arquivo
            </Button>
          </div>
        </ActionForm>
      </section>
      <section className={moduleCardClass}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-cta/10 text-brand-cta" aria-hidden>
            <SlidersHorizontal className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ui-ink">Eventos da folha</h2>
            <p className="text-sm text-ui-slate">Cadastre quantos eventos precisar. No arquivo, cada pessoa gera uma linha por evento em que tiver valor.</p>
          </div>
        </div>
        <ActionForm className="mt-4 space-y-4" onSubmit={saveEvent}>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="min-w-0 space-y-2">
              <Label className={moduleLabelClass} htmlFor="payroll-event">Evento do ponto</Label>
              <SiteSelect
                id="payroll-event"
                value={systemEvent}
                className="h-12"
                options={availableEvents.map(([value, label]) => ({ value, label }))}
                onChange={setSystemEvent}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label className={moduleLabelClass} htmlFor="payroll-code">Código no destino</Label>
              <Input id="payroll-code" className={moduleFieldClass} value={externalCode} onChange={(event) => setExternalCode(event.target.value)} required />
            </div>
            <div className="min-w-0 space-y-2">
              <Label className={moduleLabelClass} htmlFor="payroll-format">Formato de hora</Label>
              <SiteSelect
                id="payroll-format"
                value={timeFormat}
                className="h-12"
                options={[
                  { value: "centesimal", label: "Centesimal" },
                  { value: "sexagesimal", label: "Sexagesimal" },
                ]}
                onChange={setTimeFormat}
              />
            </div>
            <Button
              type="submit"
              className={cn(modulePrimaryClass, "h-12 w-full lg:mt-7 lg:w-auto")}
              disabled={savingEvent || availableEvents.length === 0}
              aria-busy={savingEvent}
            >
              {savingEvent ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Plus className="h-4 w-4" />}
              Salvar evento
            </Button>
          </div>
        </ActionForm>
        {events.items.length > 0 ? (
          <ul className="mt-5 divide-y divide-[rgb(var(--ui-wash))] overflow-hidden rounded-xl border border-ui-line">
            {events.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-ui-ink">{payrollEventLabel[item.system_event] || item.system_event}</p>
                  <p className="mt-0.5 text-ui-slate">
                    Código {item.external_code} · {item.time_format === "sexagesimal" ? "sexagesimal" : "centesimal"}
                  </p>
                </div>
                <Button type="button" className={cn(moduleDangerClass, "h-10")} onClick={() => void removeEvent(item.id)}>
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-ui-slate">Nenhum evento configurado. Sem isso o arquivo da folha não é gerado.</p>
        )}
      </section>
      {notice ? <p className="text-sm text-ui-slate" role="status">{notice}</p> : null}
    </div>
  )
}
