import { ArrowLeftRight, Briefcase, Building2, Calendar, CalendarDays, ClipboardList, Clock, FileText, Hash, History, IdCard, Landmark, Layers, Mail, Pencil, QrCode, ScanFace, Settings, Tags, Timer, Trash2, User, UserRound, Users, X, type LucideIcon } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Link, useNavigate, useParams } from "react-router-dom"

import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ListPlaceholder } from "@/components/ui/list-placeholder"
import { SiteSelect } from "@/components/ui/site-select"
import { SlidingHighlight } from "@/components/ui/sliding-highlight"
import { Spinner } from "@/components/ui/spinner"
import { moduleDangerClass, moduleLabelClass, moduleQuietClass } from "@/components/workforce/module-visual"
import { ListPager, usePagedList } from "@/components/workforce/list-controls"
import { PunchLists } from "@/components/workforce/PunchDay"
import { HourBankPanel } from "@/components/workforce/HourBankPanel"
import { JourneySchedule } from "@/components/workforce/JourneySchedule"
import { TimeResultsPanel } from "@/components/workforce/TimeResultsPanel"
import { DocumentLink } from "@/components/workforce/TimeOffFields"
import {
  getRecord,
  listRecords,
  removeRecord,
  type Audit,
  type Employee,
  type NamedRecord,
  type Occurrence,
  type TimeRequest,
  type Vigency,
} from "@/services/workforce.service"
import { resultNote } from "@/pages/workforce/journey"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/utils/cn"
import { formatCpf } from "@/utils/digits"
import {
  certificateText,
  clockMethodLabel,
  occurrenceKindLabel,
  periodText,
  punchOrigin,
  requestKindLabel,
  requestStatusClass,
  requestStatusLabel,
  showClock,
  showDate,
  showDateTime,
  situationLabel,
  vigencyKindLabel,
} from "@/utils/labels"

const tabs = [
  ["data", "Dados", User],
  ["work", "Trabalho", Briefcase],
  ["punch", "Ponto", Clock],
  ["events", "Ocorrências", ClipboardList],
  ["history", "Histórico", History],
] as const

const fichaCardClass = "w-full min-w-0 rounded-[16px] border border-[#E6EBE8] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_rgba(16,24,40,0.06)] lg:p-6"
const fichaFrameClass = "w-full min-w-0 space-y-5"
function EmptyMark() {
  return <span className="font-medium text-[#94A3B8]">Não informado</span>
}

function shown(value: string) {
  return value.trim() ? value : <EmptyMark />
}

function FieldMark({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[#E8F7ED] text-[#1E8A3A]" aria-hidden>
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
    </span>
  )
}

function FieldTile({ icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[66px] min-w-0 items-center gap-3 rounded-xl border border-[#E8EEEA] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-[border-color,box-shadow] duration-200 hover:border-[#CFE3D4] hover:shadow-[0_4px_12px_rgba(16,24,40,0.05)] motion-reduce:transition-none">
      <FieldMark icon={icon} />
      <div className="min-w-0">
        <dt className="text-xs leading-4 text-[#64748B]">{label}</dt>
        <dd className="mt-0.5 min-w-0 text-[15px] font-semibold leading-5 text-[#111827] [overflow-wrap:anywhere]">{children}</dd>
      </div>
    </div>
  )
}

function ClassificationTile({ items }: { items: { classification_id: number; name: string; value_name: string }[] }) {
  const rows = [...items].sort((left, right) => left.name.localeCompare(right.name, "pt-BR"))
  return (
    <div className="flex min-h-[66px] min-w-0 items-start gap-3 rounded-xl border border-[#E8EEEA] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-[border-color,box-shadow] duration-200 hover:border-[#CFE3D4] hover:shadow-[0_4px_12px_rgba(16,24,40,0.05)] motion-reduce:transition-none md:col-span-2">
      <FieldMark icon={Tags} />
      <div className="min-w-0 flex-1">
        <dt className="text-xs leading-4 text-[#64748B]">Classificações</dt>
        {rows.length === 0 ? (
          <dd className="mt-0.5 text-[15px] font-semibold leading-5 text-[#111827]"><EmptyMark /></dd>
        ) : (
          <dd className="mt-2 h-[7.75rem] overflow-y-auto rounded-md border border-[#D5DEE8] bg-white p-1.5">
            <ul className="space-y-1.5">
              {rows.map((item) => (
                <li key={item.classification_id} className="truncate rounded-md bg-[#F4F1EA] px-3 py-2 text-sm font-medium leading-5 text-[#3F3F46]">
                  {item.name}: {item.value_name?.trim() ? item.value_name : "Não informado"}
                </li>
              ))}
            </ul>
          </dd>
        )}
      </div>
    </div>
  )
}

function requestInitials(fullName: string) {
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

function requestedPunchText(values: string[]) {
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
      if (!value) return clock
      const day = dayFormat.format(new Date(value))
      if (day === dayShown) return clock
      dayShown = day
      return `${day}, ${clock}`
    })
    .join(" -- ")
}

function EmployeeRequestCard({ item, person }: { item: TimeRequest; person: string }) {
  const [open, setOpen] = useState(false)
  const kindLabel = requestKindLabel[item.kind] || item.kind
  const punches = requestedPunchText(item.punches ?? [])
  const period = periodText(item)
  const detail = item.kind === "adjustment" ? punches || "Nenhuma marcação pedida" : period
  const certificate = certificateText(item)
  const lead = item.kind === "adjustment" ? "Marcações pedidas: " : ""
  const noteText = (item.note || "").replace(/\s+/g, " ").trim()
  const truncated = noteText.length > 50
  const notePreview = truncated ? noteText.slice(0, 50) : noteText
  const history = item.events.map((event) => requestStatusLabel[event.status] || event.status).join(" → ") || requestStatusLabel[item.status] || item.status
  const pendingNote = item.status === "pending" ? (item.kind === "adjustment" ? "Pendente. Não altera as marcações que valem." : "Pendente. Não altera o ponto.") : ""
  const description = [lead + detail, certificate, item.note || ""].filter((part) => part.trim()).join("\n")

  return (
    <li className="min-w-0 overflow-hidden rounded-[14px] border border-[#E4E4E7] bg-white px-4 py-3.5 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <RequestPerson person={person} kindLabel={kindLabel} />
          <RequestStatus status={item.status} />
        </div>
        <RequestDetail lead={lead} detail={detail} certificate={certificate} notePreview={notePreview} truncated={truncated} photo={item.photo_url} pendingNote={pendingNote} onOpen={() => setOpen(true)} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RequestOrigin />
          <RequestHistory history={history} />
        </div>
      </div>
      <div className="hidden min-w-0 items-center lg:flex">
        <div className="w-[22%] min-w-0 shrink-0 pr-4">
          <RequestPerson person={person} kindLabel={kindLabel} />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden border-l border-[#F0F0F2] px-4">
          <RequestDetail lead={lead} detail={detail} certificate={certificate} notePreview={notePreview} truncated={truncated} photo={item.photo_url} pendingNote={pendingNote} onOpen={() => setOpen(true)} />
        </div>
        <div className="w-[12%] min-w-0 shrink-0 overflow-hidden border-l border-[#F0F0F2] px-4">
          <RequestOrigin />
        </div>
        <div className="w-[17%] min-w-0 shrink-0 overflow-hidden border-l border-[#F0F0F2] px-4">
          <RequestHistory history={history} />
        </div>
        <div className="shrink-0 pl-4">
          <RequestStatus status={item.status} />
        </div>
      </div>
      <EmployeeNoteDialog text={open ? description : null} title="Solicitação" onClose={() => setOpen(false)} />
    </li>
  )
}

function RequestPerson({ person, kindLabel }: { person: string; kindLabel: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgba(30,138,58,0.12)] text-sm font-semibold text-[#146C2E]">{requestInitials(person) || "?"}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[#0A0A0A]" title={person}>
          {person}
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-[#71717A]">{kindLabel}</span>
      </span>
    </div>
  )
}

function RequestStatus({ status }: { status: string }) {
  return <span className={cn("inline-flex h-7 shrink-0 items-center rounded-full px-3 text-[13px] font-semibold", requestStatusClass(status))}>{requestStatusLabel[status] || status}</span>
}

function RequestDetail({
  lead,
  detail,
  certificate,
  notePreview,
  truncated,
  photo,
  pendingNote,
  onOpen,
}: {
  lead: string
  detail: string
  certificate: string
  notePreview: string
  truncated: boolean
  photo: string | null
  pendingNote: string
  onOpen: () => void
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#94A3B8]" strokeWidth={1.75} aria-hidden />
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="min-w-0 text-sm leading-5 text-[#52525B] [overflow-wrap:anywhere]">
          {lead ? <span className="text-[#71717A]">{lead}</span> : null}
          {detail}
          {certificate ? ` · ${certificate}` : ""}
          {notePreview ? ` ${notePreview}` : ""}
          {truncated ? (
            <button type="button" className="ml-1 inline text-[13px] font-semibold text-[#1E8A3A] underline-offset-2 transition-colors duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30 motion-reduce:transition-none" onClick={onOpen}>
              Ver mais
            </button>
          ) : photo ? (
            <>
              {" "}
              <DocumentLink href={photo} />
            </>
          ) : null}
        </p>
        {pendingNote ? <p className="mt-1 break-words text-xs leading-5 text-[#71717A]">{pendingNote}</p> : null}
      </div>
    </div>
  )
}

function RequestOrigin() {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <FileText className="h-4 w-4 shrink-0 text-[#94A3B8]" strokeWidth={1.75} aria-hidden />
      <div className="min-w-0">
        <p className="text-[11px] text-[#94A3B8]">Origem</p>
        <p className="truncate text-sm text-[#52525B]">solicitação</p>
      </div>
    </div>
  )
}

function RequestHistory({ history }: { history: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <ArrowLeftRight className="h-4 w-4 shrink-0 text-[#94A3B8]" strokeWidth={1.75} aria-hidden />
      <p className="min-w-0 truncate text-sm text-[#52525B]" title={history || undefined}>
        {history}
      </p>
    </div>
  )
}

function EmployeeNoteDialog({ text, title = "Observação", onClose }: { text: string | null; title?: string; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!text) {
      return
    }
    panelRef.current?.querySelector<HTMLElement>("button")?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        closeRef.current()
      }
    }
    document.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [text])

  if (!text) {
    return null
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(15,23,42,0.45)] p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="employee-note-title" className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[520px] flex-col rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-3">
          <h2 id="employee-note-title" className="text-lg font-semibold text-[#111827]">
            {title}
          </h2>
          <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#64748B] transition-colors duration-200 hover:bg-[#F4F4F5] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30 motion-reduce:transition-none" aria-label="Fechar" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          <p className="whitespace-pre-wrap text-sm leading-6 text-[#111827] [overflow-wrap:anywhere]">{text}</p>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function EmployeePage() {
  const params = useParams()
  const navigate = useNavigate()
  const id = Number(params.id)
  const role = useAuthStore((state) => state.user?.role)
  const isAdmin = role === "admin"
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("data")
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [vigencies, setVigencies] = useState<Vigency[]>([])
  const [journeys, setJourneys] = useState<NamedRecord[]>([])
  const [classificationNames, setClassificationNames] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState(0)
  const [historyKind, setHistoryKind] = useState("")
  const [eventKind, setEventKind] = useState("")
  const [requestKind, setRequestKind] = useState("")
  const [requestState, setRequestState] = useState("")
  const ready = Number.isInteger(id) && id > 0
  const history = usePagedList<Vigency>("/employee-vigencies", { employee_id: id, ...(historyKind ? { kind: historyKind } : {}) }, ready, saved)
  const events = usePagedList<Occurrence>("/occurrences", { employee_id: id, ...(eventKind ? { kind: eventKind } : {}) }, ready, saved)
  const inbox = usePagedList<TimeRequest>("/requests", { employee_id: id, ...(requestKind ? { kind: requestKind } : {}), ...(requestState ? { status: requestState } : {}) }, ready, saved)
  const trail = usePagedList<Audit>("/audits", { employee_id: id }, ready && isAdmin, saved)
  const [error, setError] = useState("")
  const [fullName, setFullName] = useState("")
  const [cpf, setCpf] = useState("")
  const [email, setEmail] = useState("")
  const [admission, setAdmission] = useState("")
  const [note, setNote] = useState("")
  const [hourBank, setHourBank] = useState(false)
  const [registration, setRegistration] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)

  async function load() {
    const [person, links, journeyPage] = await Promise.all([
      getRecord<Employee>("/employees", id),
      listRecords<Vigency>("/employee-vigencies", { page: 1, limit: 100, employee_id: id, kind: "journey" }),
      listRecords<NamedRecord>("/journeys", { page: 1, limit: 100 }),
    ])
    setEmployee(person)
    setFullName(person.full_name)
    setCpf(formatCpf(person.cpf))
    setEmail(person.email || "")
    setAdmission(person.admission_date)
    setNote(person.note || "")
    setHourBank(Boolean(person.hour_bank))
    setRegistration(person.registration_number || "")
    setVigencies(links.items)
    setJourneys(journeyPage.items)
    try {
      const classificationPage = await listRecords<NamedRecord>("/classifications", { page: 1, limit: 100 })
      setClassificationNames(Object.fromEntries(classificationPage.items.map((item) => [item.id, item.name])))
    } catch {
      setClassificationNames({})
    }
    setSaved((current) => current + 1)
  }

  useEffect(() => {
    let active = true
    setEmployee(null)
    setError("")
    load()
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Não foi possível carregar.")
        }
      })
    return () => {
      active = false
    }
  }, [id])

  async function removeEmployee() {
    setError("")
    try {
      await removeRecord("/employees", id)
      navigate("/people")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível excluir.")
    }
  }

  const journey = vigencies.find((item) => item.kind === "journey" && item.valid_to === null)
  const schedule = journeys.find((item) => item.id === journey?.reference_id)

  if (!employee) {
    return (
      <div className={fichaFrameClass}>
        <BackLink to="/people" appearance="detail" />
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <section className={cn(fichaCardClass, "flex min-h-[280px] flex-col items-center justify-center gap-3")} role="status" aria-live="polite">
            <Spinner label="Carregando a ficha" className="h-8 w-8 text-[#1E8A3A]" />
            <p className="text-sm font-medium text-[#64748B]">Carregando a ficha</p>
          </section>
        )}
      </div>
    )
  }

  const personName = employee.full_name || "Funcionário"
  const personParts = personName.trim().split(/\s+/).filter(Boolean)
  const personInitials = personParts.length === 0 ? "?" : personParts.length === 1 ? personParts[0].slice(0, 2).toUpperCase() : `${personParts[0][0]}${personParts[personParts.length - 1][0]}`.toUpperCase()
  const situation = situationLabel[employee.situation || ""] || "Sem situação"
  const clockLabel = clockMethodLabel[employee.clock_method] || employee.clock_method
  const ClockIcon = employee.clock_method === "face" ? ScanFace : employee.clock_method === "qr" ? QrCode : User
  const noteText = note.trim()
  const noteLong = noteText.length > 160 || noteText.split("\n").length > 3

  return (
    <div className={fichaFrameClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink to="/people" appearance="detail" />
        {isAdmin ? (
          confirmDelete ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-sm text-[#111827]">Excluir {personName}?</span>
              <Button type="button" className={moduleDangerClass} onClick={removeEmployee}>
                Excluir
              </Button>
              <Button type="button" variant="outline" className={moduleQuietClass} onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button asChild variant="outline" className="h-10 gap-2 rounded-[10px] border-[#E2E8F0] bg-white px-3.5 text-sm font-semibold text-[#111827] shadow-[0_2px_6px_rgba(15,23,42,0.04)] transition-[background-color,border-color,color] duration-200 hover:border-[rgba(30,138,58,0.25)] hover:bg-[#EAF7EF] hover:text-[#086B35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30 motion-reduce:transition-none">
                <Link to={`/people/${id}/edit`}>
                  <Pencil className="h-4 w-4" strokeWidth={1.75} />
                  Editar
                </Link>
              </Button>
              <Button type="button" variant="outline" className="h-10 gap-2 rounded-[10px] border-[rgba(239,83,80,0.35)] bg-white px-3.5 text-sm font-semibold text-[#EF5350] shadow-[0_2px_6px_rgba(15,23,42,0.04)] transition-[background-color,border-color] duration-200 hover:bg-[rgba(239,83,80,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF5350]/30 motion-reduce:transition-none" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                Excluir
              </Button>
            </div>
          )
        ) : null}
      </div>
      <section className="relative min-h-[120px] w-full min-w-0 overflow-hidden rounded-[16px] border border-[#D7E8DC] bg-[linear-gradient(105deg,#F7FCF8_0%,#E7F6EC_46%,#D4EFD9_100%)] px-5 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_rgba(16,24,40,0.06)] md:px-6">
        <span className="pointer-events-none absolute right-8 top-1/2 hidden h-[72px] w-[72px] -translate-y-1/2 md:block" aria-hidden>
          <span className="absolute left-1/2 top-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#8ED4A8_0%,rgba(142,212,168,0.45)_38%,rgba(142,212,168,0)_72%)] blur-xl" />
          <span className="absolute left-1/2 top-1/2 h-[112px] w-[112px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#7DCAA0_0%,rgba(125,202,160,0.35)_55%,rgba(125,202,160,0)_78%)] blur-md" />
          <span className="absolute left-1/2 top-1/2 flex h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#E7F6EC] text-[#1E8A3A] shadow-[0_0_28px_rgba(30,138,58,0.22)]">
            <User className="h-8 w-8" strokeWidth={1.75} />
          </span>
        </span>
        <div className="relative flex min-w-0 items-center gap-4 md:pr-36">
          <span className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full border-2 border-[#BFE6CB] bg-[#DDF3E4] text-[22px] font-bold text-[#086B35]" aria-hidden>
            {personInitials}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="break-words text-[22px] font-bold leading-none text-[#111827]">{personName}</h2>
              <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border bg-white px-2.5 text-[13px] font-semibold leading-none shadow-[0_1px_4px_rgba(16,24,40,0.06)]", employee.situation === "active" ? "border-[#8ED4A8] text-[#086B35]" : "border-[#E2E8F0] text-[#475569]")}>
                <span className={cn("h-1.5 w-1.5 rounded-full", employee.situation === "active" ? "bg-[#1E8A3A]" : "bg-[#94A3B8]")} aria-hidden />
                {situation}
              </span>
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm leading-5 text-[#64748B]">
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon className="h-4 w-4 text-[#1E8A3A]" strokeWidth={1.75} aria-hidden />
                {clockLabel ? clockLabel : "Não informado"}
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-[#1E8A3A]" strokeWidth={1.75} aria-hidden />
                {employee.admission_date ? `Admissão em ${showDate(employee.admission_date)}` : "Admissão não informada"}
              </span>
            </p>
          </div>
        </div>
      </section>
      <SlidingHighlight className="inline-flex max-w-full gap-0 overflow-x-auto rounded-xl bg-[#E7E8EA] p-1" role="tablist">
        {tabs.map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            data-slide-active={tab === value ? "true" : undefined}
            className={cn(
              "relative z-10 inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none",
              tab === value ? "text-brand-cta" : "text-zinc-600 hover:text-zinc-900",
            )}
            onClick={() => setTab(value)}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            {label}
          </button>
        ))}
      </SlidingHighlight>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div key={tab} className="motion-safe:animate-[ficha-fade_200ms_ease-out]">
      {tab === "data" ? (
        <div className="space-y-4">
          <section className={fichaCardClass}>
            <div className="mb-4 flex items-center gap-3 border-b border-[#EEF2EF] pb-4">
              <FieldMark icon={User} />
              <h2 className="text-[17px] font-bold text-[#111827]">Informações principais</h2>
            </div>
            <dl className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:gap-x-4">
              <FieldTile icon={User} label="Nome">{shown(fullName)}</FieldTile>
              <FieldTile icon={IdCard} label="CPF">{shown(cpf)}</FieldTile>
              <FieldTile icon={Mail} label="E-mail">{shown(email)}</FieldTile>
              <FieldTile icon={CalendarDays} label="Admissão">{admission ? showDate(admission) : <EmptyMark />}</FieldTile>
              <FieldTile icon={Hash} label="Matrícula">{shown(registration)}</FieldTile>
              <FieldTile icon={ClockIcon} label="Tipo de registro">
                {clockLabel || <EmptyMark />}
                {employee.face_url ? (
                  <>
                    {" · "}
                    <DocumentLink href={employee.face_url} label="Ver foto de referência" />
                  </>
                ) : null}
              </FieldTile>
            </dl>
            <p className="mt-3 text-xs leading-5 text-[#64748B]">Pode ficar vazia. O QR exige matrícula e unidade vigente. Na empresa ela não se repete.</p>
          </section>
          <section className={fichaCardClass}>
            <div className="mb-4 flex items-center gap-3 border-b border-[#EEF2EF] pb-4">
              <FieldMark icon={Settings} />
              <h2 className="text-[17px] font-bold text-[#111827]">Informações complementares</h2>
            </div>
            <dl className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:gap-x-4">
              <FieldTile icon={Timer} label="Banco de horas">{hourBank ? "Usa banco de horas." : "Não usa banco de horas."}</FieldTile>
              <FieldTile icon={FileText} label="Observação">
                <span className={cn("block whitespace-pre-wrap", noteLong && "line-clamp-3")}>{noteText ? noteText : <EmptyMark />}</span>
                {noteLong ? (
                  <button type="button" className="mt-1 text-[13px] font-semibold text-[#1E8A3A] underline-offset-2 transition-colors duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30 motion-reduce:transition-none" onClick={() => setNoteOpen(true)}>
                    Ver mais
                  </button>
                ) : null}
              </FieldTile>
            </dl>
          </section>
        </div>
      ) : null}
      {tab === "work" ? (
        <div className="space-y-4">
          <section className={fichaCardClass}>
            <div className="mb-4 flex items-center gap-3 border-b border-[#EEF2EF] pb-4">
              <FieldMark icon={Briefcase} />
              <h2 className="text-[17px] font-bold text-[#111827]">Trabalho</h2>
            </div>
            <dl className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:gap-x-4">
              {(
                [
                  [Briefcase, "Cargo", employee.job_label],
                  [Clock, "Jornada", employee.journey_label],
                  [Building2, "Unidade", employee.unit_label],
                  [Layers, "Setor", employee.sector_label],
                  [Users, "Equipe", employee.team_label],
                  [Landmark, "Sindicato", employee.union_label],
                  [UserRound, "Gestor", employee.manager_label],
                ] as const
                ).map(([icon, label, value]) => (
                <FieldTile key={label} icon={icon} label={label}>
                  {value?.trim() ? value : <EmptyMark />}
                </FieldTile>
              ))}
              <ClassificationTile items={employee.classifications || []} />
            </dl>
            <p className="mt-4 text-sm text-[#64748B]">Unidade e setor acompanham a equipe.</p>
          </section>
        </div>
      ) : null}
      {tab === "punch" ? (
        <div className="space-y-4">
          <section className="w-full rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-6">
            <h2 className="text-lg font-semibold text-brand-ink">Jornada prevista</h2>
            <p className="mt-1 text-sm text-brand-quiet">Jornada vigente desta pessoa.</p>
            {schedule ? (
              <JourneySchedule
                name={schedule.name}
                note={schedule.note}
                kind={schedule.kind}
                days={schedule.days}
                weeklyMinutes={schedule.weekly_minutes}
                flexible={schedule.flexible}
                toleranceMinutes={schedule.tolerance_minutes}
                cycleDay={journey?.cycle_day}
              />
            ) : (
              <p className="mt-5 rounded-xl border border-dashed border-[#E4E4E7] px-4 py-6 text-center text-sm text-brand-quiet">Nenhuma jornada vigente.</p>
            )}
          </section>
          <TimeResultsPanel employeeId={id} appearance="module" note={resultNote(schedule?.kind)} />
          <HourBankPanel employeeId={id} canLaunch={false} usesBank={employee.hour_bank} appearance="module" />
          <PunchLists employeeId={id} employees={[employee]} reloadKey={saved} appearance="module" />
          <section className="rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-6">
            <h2 className="text-lg font-semibold text-brand-ink">Solicitações</h2>
            <p className="mt-1 text-sm text-brand-quiet">Uma solicitação pendente não altera estas marcações. A origem da aprovação é solicitação.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <Label className={moduleLabelClass} htmlFor="employee-request-kind">
                  Tipo
                </Label>
                <SiteSelect id="employee-request-kind" value={requestKind} icon={FileText} options={[{ value: "", label: "Todos" }, ...Object.entries(requestKindLabel).map(([value, label]) => ({ value, label }))]} onChange={setRequestKind} />
              </div>
              <div className="min-w-0 space-y-2">
                <Label className={moduleLabelClass} htmlFor="employee-request-status">
                  Situação
                </Label>
                <SiteSelect id="employee-request-status" value={requestState} icon={Layers} options={[{ value: "", label: "Todos" }, ...Object.entries(requestStatusLabel).map(([value, label]) => ({ value, label }))]} onChange={setRequestState} />
              </div>
            </div>
            {inbox.error ? <p className="mt-4 text-sm text-destructive">{inbox.error}</p> : null}
            {inbox.loading ? (
              <ul className="mt-5">
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
              <ul className="mt-5 flex flex-col gap-3">
                {inbox.items.map((item) => (
                  <EmployeeRequestCard key={item.id} item={item} person={employee.full_name} />
                ))}
              </ul>
            ) : null}
            {!inbox.loading && !inbox.error && inbox.total > 0 ? (
              <div className="mt-4 border-t border-[#F0F0F2] pt-4">
                <ListPager page={inbox.page} pageSize={inbox.pageSize} total={inbox.total} onPage={inbox.setPage} onPageSize={inbox.setPageSize} tone="module" />
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
      {tab === "events" ? (
        <div className="space-y-4">
          <section className="rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-brand-ink">Ocorrências</h2>
              <p className="mt-1 text-sm text-brand-quiet">Consulte as ocorrências deste funcionário.</p>
            </div>
            <div className="mt-[18px] max-w-md space-y-2">
              <Label className="font-semibold text-brand-ink" htmlFor="employee-event-kind">
                Tipo
              </Label>
              <SiteSelect id="employee-event-kind" value={eventKind} icon={ClipboardList} options={[{ value: "", label: "Todos" }, ...Object.entries(occurrenceKindLabel).map(([value, label]) => ({ value, label }))]} onChange={setEventKind} />
            </div>
            {events.error ? <p className="mt-4 text-sm text-destructive">{events.error}</p> : null}
            {events.loading ? (
              <ul className="mt-5">
                <ListPlaceholder loading empty="Nenhuma ocorrência." />
              </ul>
            ) : null}
            {!events.loading && !events.error && events.items.length === 0 ? (
              <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-white px-6 py-10 text-center">
                <p className="text-[15px] font-semibold text-[#0A0A0A]">Nenhuma ocorrência.</p>
              </div>
            ) : null}
            {!events.loading && events.items.length > 0 ? (
              <ul className="mt-5 divide-y divide-[#F0F0F2] overflow-hidden rounded-xl border border-[#E2E8F0]">
                {events.items.map((item) => (
                  <li key={item.id} className="px-4 py-3 text-sm text-brand-ink">
                    {occurrenceKindLabel[item.kind] || item.kind} · {periodText(item)} · {punchOrigin(item.source)}
                    {certificateText(item) ? ` · ${certificateText(item)}` : ""}
                    {item.note ? ` · ${item.note}` : ""}
                    {item.warning ? ` · ${item.warning}` : ""}
                    {item.photo_url ? (
                      <>
                        {" · "}
                        <DocumentLink href={item.photo_url} />
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {!events.loading && !events.error && events.total > 0 ? (
              <div className="mt-4 border-t border-[#F0F0F2] pt-4">
                <ListPager page={events.page} pageSize={events.pageSize} total={events.total} onPage={events.setPage} onPageSize={events.setPageSize} tone="module" />
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
      {tab === "history" ? (
        <div className="space-y-4">
          <section className="rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-brand-ink">Vigências</h2>
              <p className="mt-1 text-sm text-brand-quiet">Consulte os vínculos deste funcionário.</p>
            </div>
            <div className="mt-[18px] max-w-md space-y-2">
              <Label className="font-semibold text-brand-ink" htmlFor="employee-vigency-kind">
                Vínculo
              </Label>
              <SiteSelect id="employee-vigency-kind" value={historyKind} icon={Layers} options={[{ value: "", label: "Todos" }, ...Object.entries(vigencyKindLabel).map(([value, label]) => ({ value, label }))]} onChange={setHistoryKind} />
            </div>
            {history.error ? <p className="mt-4 text-sm text-destructive">{history.error}</p> : null}
            {history.loading ? (
              <ul className="mt-5">
                <ListPlaceholder loading empty="Nenhuma vigência." />
              </ul>
            ) : null}
            {!history.loading && !history.error && history.items.length === 0 ? (
              <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-white px-6 py-10 text-center">
                <p className="text-[15px] font-semibold text-[#0A0A0A]">Nenhuma vigência.</p>
              </div>
            ) : null}
            {!history.loading && history.items.length > 0 ? (
              <ul className="mt-5 divide-y divide-[#F0F0F2] overflow-hidden rounded-xl border border-[#E2E8F0]">
                {history.items.map((item) => (
                  <li key={item.id} className="px-4 py-3 text-sm text-brand-ink">
                    {item.kind === "classification" ? `${item.classification_id ? classificationNames[item.classification_id] || "Classificação" : "Classificação"}: ${item.label}` : `${vigencyKindLabel[item.kind] || item.kind}: ${situationLabel[item.label] || item.label}`} · {showDate(item.valid_from)} até {item.valid_to ? showDate(item.valid_to) : "atual"}{item.kind === "journey" && item.cycle_day ? ` · dia ${item.cycle_day} da sequência` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
            {!history.loading && !history.error && history.total > 0 ? (
              <div className="mt-4 border-t border-[#F0F0F2] pt-4">
                <ListPager page={history.page} pageSize={history.pageSize} total={history.total} onPage={history.setPage} onPageSize={history.setPageSize} tone="module" />
              </div>
            ) : null}
          </section>
          <section className="rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-brand-ink">Auditoria</h2>
              <p className="mt-1 text-sm text-brand-quiet">Consulte as alterações registradas.</p>
            </div>
            {trail.error ? <p className="mt-4 text-sm text-destructive">{trail.error}</p> : null}
            {trail.loading ? (
              <ul className="mt-5">
                <ListPlaceholder loading empty="Nenhuma auditoria." />
              </ul>
            ) : null}
            {!trail.loading && !trail.error && trail.items.length === 0 ? (
              <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-white px-6 py-10 text-center">
                <p className="text-[15px] font-semibold text-[#0A0A0A]">Nenhuma auditoria.</p>
              </div>
            ) : null}
            {!trail.loading && trail.items.length > 0 ? (
              <ul className="mt-5 divide-y divide-[#F0F0F2] overflow-hidden rounded-xl border border-[#E2E8F0]">
                {trail.items.map((item) => (
                  <li key={item.id} className="px-4 py-3 text-sm text-brand-ink">
                    {showDateTime(item.created_at)} · pessoa {item.person_id} · {item.action}
                    {item.previous_label ? ` · de ${item.previous_label}` : ""} {item.new_label ? `para ${item.new_label}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
            {!trail.loading && !trail.error && trail.total > 0 ? (
              <div className="mt-4 border-t border-[#F0F0F2] pt-4">
                <ListPager page={trail.page} pageSize={trail.pageSize} total={trail.total} onPage={trail.setPage} onPageSize={trail.setPageSize} tone="module" />
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
      </div>
      <EmployeeNoteDialog text={noteOpen ? noteText : null} onClose={() => setNoteOpen(false)} />
    </div>
  )
}
