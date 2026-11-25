import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ArrowLeft, History, Info, Save, Plus, Trash2, type LucideIcon } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { ActionTip } from "@/components/ui/action-tip"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { CpfField } from "@/components/ui/cpf-field"
import { DatePickerField } from "@/components/ui/date-picker-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteSelect } from "@/components/ui/site-select"
import { SlidingHighlight } from "@/components/ui/sliding-highlight"
import { Spinner } from "@/components/ui/spinner"
import { loadCategories } from "@/components/workforce/ClassificationFilter"
import { moduleCardClass, moduleDangerClass, moduleDangerIconClass, moduleFieldClass, moduleLabelClass, modulePrimaryClass, moduleQuietClass, moduleTextClass } from "@/components/workforce/module-visual"
import { CertificatePhotoField } from "@/components/workforce/TimeOffFields"
import { createRecord, getRecord, listRecords, removeRecord, updateRecord, type Employee, type EmployeeCategory, type NamedRecord } from "@/services/workforce.service"
import { canOperate } from "@/navigation"
import { useAuthStore } from "@/store/auth.store"
import { toastError } from "@/store/toast.store"
import { cn } from "@/utils/cn"
import { formatCpf, onlyDigits } from "@/utils/digits"
import { isoWeekday } from "@/pages/workforce/journey"
import { conceptIcon } from "@/utils/concept-icons"
import { clockMethodLabel, showDate, situationLabel } from "@/utils/labels"

const vigencyTargets: { kind: string; label: string; path: string; searchKey: "name" | "full_name"; icon: LucideIcon }[] = [
  { kind: "job", label: "Função", path: "/jobs", searchKey: "name", icon: conceptIcon.job },
  { kind: "journey", label: "Jornada", path: "/journeys", searchKey: "name", icon: conceptIcon.journey },
  { kind: "team", label: "Equipe", path: "/teams", searchKey: "name", icon: conceptIcon.team },
  { kind: "manager", label: "Gestor", path: "/employees", searchKey: "full_name", icon: conceptIcon.manager },
  { kind: "norm", label: "Norma", path: "/norms", searchKey: "name", icon: conceptIcon.norm },
  { kind: "status", label: "Situação", path: "", searchKey: "name", icon: conceptIcon.situation },
]

type Movement = {
  id: number
  kind: string
  category_id: number | null
  label: string
  valid_from: string
  valid_to: string | null
  cycle_day: number | null
}

function readFaceImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      reject(new Error("A foto de referência não foi aceita."))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("A foto de referência não foi aceita."))
    reader.readAsDataURL(file)
  })
}

function tabValue(id: string, person: Employee | null) {
  if (!person) return ""
  if (id === "category") {
    const items = person.categories || []
    return items.length > 0 ? items.map((item) => `${item.name}: ${item.value_name}`).join(" · ") : "Não informado"
  }
  const current: Record<string, string | null | undefined> = {
    job: person.job_label,
    journey: person.journey_label,
    team: person.team_label,
    norm: person.norm_label,
    manager: person.manager_label,
    status: situationLabel[person.situation || ""],
  }
  if (!(id in current)) return ""
  return current[id]?.trim() || "Não informado"
}

async function loadMovements(employeeId: number, kind: string) {
  const items: Movement[] = []
  let page = 1
  let total = 0
  do {
    const result = await listRecords<Movement>("/employee-vigencies", { employee_id: employeeId, kind, page, limit: 100 })
    items.push(...result.items)
    total = result.total
    page += 1
  } while (items.length < total)
  return items.sort((left, right) => {
    const current = Number(Boolean(left.valid_to)) - Number(Boolean(right.valid_to))
    if (current !== 0) return current
    const byDate = right.valid_from.localeCompare(left.valid_from)
    return byDate || right.id - left.id
  })
}

function movementTitle(item: Movement, categoryNames: Record<number, string>) {
  if (item.kind === "status") return situationLabel[item.label] || item.label
  if (item.kind === "category") {
    const name = item.category_id ? categoryNames[item.category_id] : ""
    return name ? `${name}: ${item.label}` : item.label
  }
  return item.label
}

function movementPeriod(item: Movement) {
  const end = item.valid_to ? showDate(item.valid_to) : "atual"
  const cycle = item.kind === "journey" && item.cycle_day ? ` · dia ${item.cycle_day} da sequência` : ""
  return `${showDate(item.valid_from)} até ${end}${cycle}`
}

function SectionHeading({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-brand-wash text-brand-cta" aria-hidden>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <h2 className="text-[17px] font-bold text-ui-ink-strong">{title}</h2>
    </div>
  )
}

function CurrentValueCard({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[66px] min-w-0 items-center gap-3 rounded-xl border border-brand-field bg-white px-3.5 py-3 shadow-[0_1px_2px_rgb(var(--ui-shadow-alt)/0.04)]">
      <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-brand-wash text-brand-cta" aria-hidden>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-xs leading-4 text-ui-slate">{label}</p>
        <p className="mt-0.5 min-w-0 text-[15px] font-semibold leading-5 text-ui-ink-strong [overflow-wrap:anywhere]">{children}</p>
      </div>
    </div>
  )
}

function movementIcon(kind: string): LucideIcon {
  return vigencyTargets.find((item) => item.kind === kind)?.icon || (kind === "category" ? conceptIcon.category : conceptIcon.employee)
}

function VigencyDeleteDialog({
  item,
  title,
  period,
  onClose,
  onConfirm,
}: {
  item: Movement | null
  title: string
  period: string
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const pendingRef = useRef(false)
  const dismissRef = useRef(() => {})
  const [pending, setPending] = useState(false)
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
    if (!open) return
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
        aria-labelledby="vigency-delete-title"
        aria-describedby="vigency-delete-text"
        className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgb(var(--ui-shadow)/0.18)] sm:p-7"
      >
        <h2 id="vigency-delete-title" className="text-xl font-semibold tracking-tight text-ui-ink">
          Excluir {title}?
        </h2>
        <p id="vigency-delete-text" className="mt-2 text-sm leading-6 text-brand-quiet">
          Este registro sai do histórico.
        </p>
        <p className="mt-4 rounded-xl bg-ui-line-muted px-4 py-3 text-sm font-semibold text-ui-ink">
          {title}
          <span className="mt-1 block text-sm font-medium text-brand-quiet">{period}</span>
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} onClick={dismiss} disabled={pending}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar
          </Button>
          <Button ref={confirmRef} type="button" className={cn(moduleDangerClass, "h-11 px-4")} disabled={pending} onClick={() => void confirm()}>
            <Trash2 className="h-4 w-4" aria-hidden />
            {pending ? "Excluindo" : "Excluir"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function MovementHistory({
  employeeId,
  kind,
  revision,
  categoryNames = {},
  onChanged,
}: {
  employeeId: number
  kind: string
  revision: number
  categoryNames?: Record<number, string>
  onChanged: () => void
}) {
  const [items, setItems] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<Movement | null>(null)
  const Icon = movementIcon(kind)
  const pendingTitle = pending ? movementTitle(pending, categoryNames) : ""
  const pendingPeriod = pending ? movementPeriod(pending) : ""

  useEffect(() => {
    let active = true
    setLoading(true)
    loadMovements(employeeId, kind)
      .then((rows) => {
        if (!active) return
        setItems(rows)
      })
      .catch((caught: unknown) => {
        if (active) toastError(caught instanceof Error ? caught.message : "Não foi possível carregar o histórico.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [employeeId, kind, revision])

  async function remove() {
    if (!pending) return
    try {
      await removeRecord("/employee-vigencies", pending.id)
    } catch {
      // O interceptor já avisou o erro.
      return
    }
    setPending(null)
    try {
      setItems(await loadMovements(employeeId, kind))
      onChanged()
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Não foi possível carregar o histórico.")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner label="Carregando histórico" className="h-6 w-6 text-brand-cta" />
      </div>
    )
  }
  if (!items.length) return null

  return (
    <div className="space-y-4 pt-2">
      <SectionHeading icon={History} title="Histórico" />
      <ul className="space-y-2">
        {items.map((item) => {
          const title = movementTitle(item, categoryNames)
          return (
            <li
              key={item.id}
              className="group/card flex min-h-16 min-w-0 items-center gap-3 rounded-xl border border-ui-line bg-white px-4 py-3 shadow-[0_4px_12px_rgb(var(--ui-shadow)/0.035),0_8px_20px_rgb(var(--ui-shadow)/0.035)]"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-emerald-50 text-brand-cta" aria-hidden>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-brand-ink">{title}</span>
                  <span className="mt-[3px] block truncate text-sm text-brand-quiet">{movementPeriod(item)}</span>
                </span>
              </div>
              <ActionTip label="Excluir">
                <Button type="button" variant="outline" className={moduleDangerIconClass} aria-label={`Excluir ${title}`} onClick={() => setPending(item)}>
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                </Button>
              </ActionTip>
            </li>
          )
        })}
      </ul>
      <VigencyDeleteDialog
        item={pending}
        title={pendingTitle}
        period={pendingPeriod}
        onClose={() => setPending(null)}
        onConfirm={remove}
      />
    </div>
  )
}

function GroupAssignment({ employeeId, current, onSaved }: { employeeId: number; current: EmployeeCategory[]; onSaved: () => void }) {
  const [groups, setGroups] = useState<{ id: number; name: string; values: NamedRecord[] }[]>([])
  const [classificationId, setGroupId] = useState("")
  const [valueId, setValueId] = useState("")
  const [validFrom, setValidFrom] = useState("")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [revision, setRevision] = useState(0)
  const selected = groups.find((item) => String(item.id) === classificationId)
  const categoryNames: Record<number, string> = {}
  for (const item of groups) categoryNames[item.id] = item.name

  useEffect(() => {
    let active = true
    loadCategories()
      .then((page) => {
        if (active) setGroups(page)
      })
      .catch(() => {
        if (active) toastError("Não foi possível carregar as categorias.")
      })
    return () => {
      active = false
    }
  }, [employeeId])

  async function save() {
    if (!classificationId) {
      toastError("Selecione a categoria.")
      return
    }
    if (!valueId) {
      toastError("Selecione o valor.")
      return
    }
    if (!validFrom) {
      toastError("Informe a data de início.")
      return
    }
    setSaving(true)
    try {
      await createRecord("/employee-vigencies", {
        employee_id: employeeId,
        kind: "category",
        reference_id: Number(valueId),
        valid_from: validFrom,
        note: note.trim() || null,
      })
      setGroupId("")
      setValueId("")
      setValidFrom("")
      setNote("")
      setRevision((value) => value + 1)
      onSaved()
    } catch {
      // O interceptor já avisou o erro.
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={cn(moduleCardClass, "space-y-5")}>
      <SectionHeading icon={conceptIcon.category} title="Categorias" />
      {current.length > 0 ? (
        <div className="max-h-[11rem] space-y-2 overflow-y-auto">
          {[...current]
            .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"))
            .map((item) => (
              <CurrentValueCard key={item.category_id} icon={conceptIcon.category} label={item.name}>
                {item.value_name?.trim() ? item.value_name : "Não informado"}
              </CurrentValueCard>
            ))}
        </div>
      ) : (
        <CurrentValueCard icon={conceptIcon.category} label="Categoria atual">
          Não informado
        </CurrentValueCard>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className={moduleLabelClass} htmlFor="employee-classification">Categoria</Label>
          <SiteSelect
            id="employee-classification"
            value={classificationId}
            searchable
            searchPath="/categories"
            searchPlaceholder="Pesquisar categoria"
            placeholder="Selecione"
            className="h-12"
            icon={conceptIcon.category}
            options={groups.map((item) => ({ value: String(item.id), label: item.name }))}
            onChange={(next) => {
              setGroupId(next)
              setValueId("")
            }}
          />
        </div>
        <div className="space-y-2">
          <Label className={moduleLabelClass} htmlFor="employee-classification-value">Valor</Label>
          <SiteSelect
            id="employee-classification-value"
            value={valueId}
            searchable={Boolean(classificationId)}
            searchPath={classificationId ? "/category-values" : undefined}
            searchParams={classificationId ? { category_id: Number(classificationId) } : undefined}
            searchPlaceholder="Pesquisar valor"
            placeholder="Selecione"
            className="h-12"
            options={(selected?.values || []).map((item) => ({ value: String(item.id), label: item.name }))}
            onChange={setValueId}
          />
        </div>
        <DatePickerField id="employee-classification-from" label="Início" value={validFrom} onChange={setValidFrom} />
        <div className="space-y-2 md:col-span-2">
          <Label className={moduleLabelClass} htmlFor="employee-classification-note">Observação</Label>
          <textarea id="employee-classification-note" className={cn(moduleTextClass, "min-h-24")} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
      </div>
      <Button type="button" className={modulePrimaryClass} disabled={saving} onClick={() => void save()}>
        {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        Salvar categoria
      </Button>
      <MovementHistory employeeId={employeeId} kind="category" revision={revision} categoryNames={categoryNames} onChanged={onSaved} />
    </section>
  )
}

export function EmployeeFormPage() {
  const navigate = useNavigate()
  const params = useParams()
  const id = params.id ? Number(params.id) : null
  const [fullName, setFullName] = useState("")
  const [cpf, setCpf] = useState("")
  const [email, setEmail] = useState("")
  const [admission, setAdmission] = useState("")
  const [note, setNote] = useState("")
  const [hourBank, setHourBank] = useState(false)
  const [registration, setRegistration] = useState("")
  const [clockMethod, setClockMethod] = useState("simple")
  const [faceFile, setFaceFile] = useState<File | null>(null)
  const [faceUrl, setFaceUrl] = useState<string | null>(null)
  const [hasFacePhoto, setHasFacePhoto] = useState(false)
  const [profile, setProfile] = useState<Employee | null>(null)
  const [linkChoices, setLinkChoices] = useState<{ value: string; label: string; kind?: string; length?: number }[]>([])
  const [referenceId, setReferenceId] = useState("")
  const [journeyDetail, setJourneyDetail] = useState<NamedRecord | null>(null)
  const [cycleDay, setCycleDay] = useState("")
  const [cycleTouched, setCycleTouched] = useState(false)
  const [statusLabelValue, setStatusLabelValue] = useState("active")
  const [validFrom, setValidFrom] = useState("")
  const [vigencyNote, setVigencyNote] = useState("")
  const [savingLink, setSavingLink] = useState(false)
  const [linkRevision, setLinkRevision] = useState(0)
  const canEdit = canOperate(useAuthStore((state) => state.user?.role))
  const [tab, setTab] = useState("data")
  const linkTarget = vigencyTargets.find((item) => item.kind === tab)

  useEffect(() => {
    if (id === null) return
    let active = true
    getRecord<Employee>("/employees", id)
      .then((person) => {
        if (!active) return
        setFullName(person.full_name)
        setCpf(formatCpf(person.cpf))
        setEmail(person.email || "")
        setAdmission(person.admission_date)
        setNote(person.note || "")
        setHourBank(Boolean(person.hour_bank))
        setRegistration(person.registration_number || "")
        setClockMethod(person.clock_method || "simple")
        setFaceUrl(person.face_url)
        setHasFacePhoto(Boolean(person.face_key || person.face_url))
        setProfile(person)
      })
      .catch((caught: unknown) => {
        if (active) toastError(caught instanceof Error ? caught.message : "Não foi possível carregar.")
      })
    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    if (!canEdit || id === null || !linkTarget || linkTarget.kind === "status") {
      setLinkChoices([])
      return
    }
    let active = true
    listRecords<NamedRecord & { full_name?: string }>(linkTarget.path, { page: 1, limit: 100 })
      .then((page) => {
        if (!active) return
        setLinkChoices(
          page.items
            .filter((item) => linkTarget.kind !== "manager" || item.id !== id)
            .map((item) => ({
              value: String(item.id),
              label: item.full_name || item.name,
              kind: item.kind,
              length: item.days?.length || 0,
            })),
        )
      })
      .catch(() => {
        if (active) setLinkChoices([])
      })
    return () => {
      active = false
    }
  }, [canEdit, id, linkTarget])

  const listedJourney = tab === "journey" ? linkChoices.find((item) => item.value === referenceId) : undefined

  useEffect(() => {
    if (tab !== "journey" || !referenceId || listedJourney) {
      setJourneyDetail(null)
      return
    }
    let active = true
    getRecord<NamedRecord>("/journeys", Number(referenceId))
      .then((journey) => {
        if (active) setJourneyDetail(journey)
      })
      .catch(() => {
        if (active) setJourneyDetail(null)
      })
    return () => {
      active = false
    }
  }, [tab, referenceId, listedJourney])

  const scheduledJourney = listedJourney
    ? listedJourney.kind === "programada"
    : journeyDetail !== null && String(journeyDetail.id) === referenceId && journeyDetail.kind === "programada"
  const sequenceLength = listedJourney?.length || journeyDetail?.days?.length || 0

  useEffect(() => {
    if (!scheduledJourney || cycleTouched || sequenceLength !== 7 || !validFrom) return
    setCycleDay(String(isoWeekday(validFrom)))
  }, [scheduledJourney, cycleTouched, sequenceLength, validFrom])

  async function saveLink() {
    if (id === null || !linkTarget) return
    if (linkTarget.kind !== "status" && !referenceId) {
      toastError("Selecione o cadastro.")
      return
    }
    if (linkTarget.kind === "manager" && Number(referenceId) === id) {
      toastError("Escolha outro gestor.")
      return
    }
    if (!validFrom) {
      toastError("Informe a data de início.")
      return
    }
    if (scheduledJourney) {
      const day = Number(cycleDay)
      if (!cycleDay || day < 1 || day > sequenceLength) {
        toastError("Informe o dia da sequência.")
        return
      }
    }
    setSavingLink(true)
    try {
      await createRecord("/employee-vigencies", {
        employee_id: id,
        kind: linkTarget.kind,
        reference_id: linkTarget.kind === "status" ? null : Number(referenceId),
        label: linkTarget.kind === "status" ? statusLabelValue : null,
        valid_from: validFrom,
        cycle_day: scheduledJourney ? Number(cycleDay) : null,
        note: vigencyNote.trim() || null,
      })
      setReferenceId("")
      setValidFrom("")
      setVigencyNote("")
      setCycleDay("")
      setCycleTouched(false)
    } catch {
      // O interceptor já avisou o erro.
      setSavingLink(false)
      return
    }
    try {
      setProfile(await getRecord<Employee>("/employees", id))
      setLinkRevision((value) => value + 1)
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Não foi possível carregar.")
    } finally {
      setSavingLink(false)
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const body = {
      full_name: fullName.trim(),
      cpf: onlyDigits(cpf),
      email: email.trim() || null,
      admission_date: admission,
      note: note.trim() || null,
      hour_bank: hourBank,
      registration_number: registration.trim() || null,
      clock_method: clockMethod,
    }
    if (clockMethod === "face" && faceFile) {
      try {
        Object.assign(body, { face_image: await readFaceImage(faceFile) })
      } catch (caught) {
        toastError(caught instanceof Error ? caught.message : "A foto de referência não foi aceita.")
        return
      }
    }
    try {
      if (id === null) {
        await createRecord<Employee>("/employees", body)
      } else {
        await updateRecord<Employee>("/employees", id, body)
      }
      navigate("/staff?tab=employees")
    } catch {
      // O interceptor já avisou o erro.
    }
  }

  const notice =
    id === null
      ? "O funcionário nasce ativo. O acesso nasce deste CPF. O e-mail é obrigatório quando a pessoa ainda não existe. A senha não fica neste sistema. O papel continua em Permissões e Acessos."
      : ""

  return (
    <div className="w-full min-w-0 space-y-5">
      <div className="w-full">
        <BackLink to={id === null ? "/staff?tab=employees" : `/employees/${id}`} appearance="detail" />
      </div>
      {id !== null ? (
        <SlidingHighlight className="inline-flex max-w-full gap-0 overflow-x-auto rounded-xl bg-ui-line-muted p-1" role="tablist">
          {(
            [
              { id: "data", label: "Dados", icon: conceptIcon.employee, show: true },
              ...vigencyTargets.filter((item) => item.kind === "team").map((item) => ({ id: item.kind, label: item.label, icon: item.icon, show: canEdit })),
              ...vigencyTargets.filter((item) => item.kind === "job" || item.kind === "journey").map((item) => ({ id: item.kind, label: item.label, icon: item.icon, show: canEdit })),
              { id: "category", label: "Categorias", icon: conceptIcon.category, show: canEdit && id !== null },
              ...vigencyTargets.filter((item) => item.kind !== "job" && item.kind !== "journey" && item.kind !== "team").map((item) => ({ id: item.kind, label: item.kind === "manager" ? "Gestores" : item.label, icon: item.icon, show: canEdit })),
            ]
          )
            .filter((item) => item.show)
            .map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                data-slide-active={tab === item.id ? "true" : undefined}
                className={cn(
                  "relative z-10 inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none",
                  tab === item.id ? "text-brand-cta" : "text-zinc-600 hover:text-zinc-900",
                )}
                onClick={() => {
                  setTab(item.id)
                  setReferenceId("")
                  setCycleDay("")
                  setCycleTouched(false)
                }}
              >
                <item.icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                {item.label}
              </button>
            ))}
        </SlidingHighlight>
      ) : null}
      {id === null || tab === "data" ? (
      <ActionForm className={cn(moduleCardClass, "space-y-5")} onSubmit={onSubmit}>
        <SectionHeading icon={conceptIcon.employee} title={id === null ? "Novo funcionário" : "Informações principais"} />
        {notice ? (
          <div className="flex items-start gap-3 rounded-xl border border-brand-cta/16 bg-brand-tint px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-cta" strokeWidth={1.75} aria-hidden />
            <p className="text-sm leading-6 text-ui-slate-deep">{notice}</p>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label className={moduleLabelClass} htmlFor="name">
            Nome
          </Label>
          <Input id="name" className={moduleFieldClass} value={fullName} onChange={(event) => setFullName(event.target.value)} required />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="cpf">
              CPF
            </Label>
            <CpfField id="cpf" className={moduleFieldClass} value={cpf} onValueChange={setCpf} required />
          </div>
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="email">
              E-mail
            </Label>
            <Input id="email" className={moduleFieldClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            {id === null ? <p className="text-sm text-ui-slate">Obrigatório se este CPF ainda não tiver pessoa.</p> : null}
          </div>
        </div>
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="admission">
              Admissão
            </Label>
            <DatePickerField id="admission" value={admission} onChange={setAdmission} required />
          </div>
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="clock-method">
              Tipo de registro
            </Label>
            <SiteSelect id="clock-method" value={clockMethod} options={Object.entries(clockMethodLabel).map(([value, label]) => ({ value, label }))} onChange={setClockMethod} />
            <p className="text-sm leading-5 text-ui-slate">O aplicativo mostra só este tipo. Quem já existe fica em Simples.</p>
          </div>
        </div>
        {clockMethod === "face" ? (
          <div className="space-y-2">
            <Label className={moduleLabelClass} htmlFor="face-image">
              Foto de referência
            </Label>
            {hasFacePhoto ? (
              <div className="flex items-start gap-3 rounded-xl border border-brand-cta/16 bg-brand-tint px-4 py-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-cta" strokeWidth={1.75} aria-hidden />
                <p className="text-sm leading-6 text-ui-slate-deep">
                  A foto de referência já foi enviada neste cadastro.
                  {faceUrl ? (
                    <>
                      {" "}
                      <a className="font-medium text-brand-cta" href={faceUrl} target="_blank" rel="noreferrer">
                        Ver foto
                      </a>
                      .
                    </>
                  ) : null}{" "}
                  Envie outra abaixo só se quiser substituir.
                </p>
              </div>
            ) : null}
            <CertificatePhotoField id="face-image" fileKey={0} photo={faceFile} accept="image/png,image/jpeg" emptyLabel={hasFacePhoto ? "Arraste ou selecione uma nova foto" : "Arraste ou selecione a foto"} hint="PNG ou JPG (máx. 2 MB)" onChange={setFaceFile} />
            <p className="text-sm text-ui-slate">{hasFacePhoto ? "A foto atual permanece até você enviar outra." : "Pode ficar vazia. Sem a foto, a batida responde que não há foto de referência. Quando enviada, o servidor guarda o embedding e a foto."}</p>
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="registration">
              Matrícula
            </Label>
            <Input id="registration" className={moduleFieldClass} value={registration} onChange={(event) => setRegistration(event.target.value)} />
            <p className="text-sm leading-5 text-ui-slate">Pode ficar vazia. O QR exige matrícula e empresa vigente. Na organização ela não se repete.</p>
          </div>
        </div>
        <button
          type="button"
          id="hour-bank"
          role="switch"
          aria-checked={hourBank}
          className={cn(
            "flex w-full items-center justify-between gap-4 rounded-[10px] border px-4 py-3 text-left transition-[background-color,border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta/30 motion-reduce:transition-none",
            hourBank
              ? "border-brand-glow bg-brand-wash shadow-[0_8px_22px_rgb(var(--brand-cta)/0.16)]"
              : "border-ui-line-soft bg-white hover:border-brand-edge",
          )}
          onClick={() => setHourBank((current) => !current)}
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ui-ink">Banco de horas</span>
            <span className={cn("mt-0.5 block text-sm", hourBank ? "font-medium text-brand-ink-strong" : "text-ui-slate")}>{hourBank ? "Usa" : "Não usa"}</span>
          </span>
          <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 motion-reduce:transition-none", hourBank ? "bg-brand-cta" : "bg-ui-line-soft")} aria-hidden>
            <span className={cn("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgb(var(--ui-shadow)/0.2)] transition-transform duration-200 motion-reduce:transition-none", hourBank ? "translate-x-[22px]" : "translate-x-0.5")} />
          </span>
        </button>
        <div className="space-y-2">
          <Label className={moduleLabelClass} htmlFor="note">
            Observação
          </Label>
          <textarea id="note" className={cn(moduleTextClass, "min-h-[90px]")} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" className={modulePrimaryClass}>
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </div>
      </ActionForm>
      ) : null}
      {id !== null && tab === "category" && canEdit ? <GroupAssignment employeeId={id} current={profile?.categories || []} onSaved={() => { getRecord<Employee>("/employees", id).then(setProfile).catch(() => undefined) }} /> : null}
      {id !== null && linkTarget && canEdit ? (
        <section className={cn(moduleCardClass, "space-y-5")}>
          <SectionHeading icon={linkTarget.icon} title={linkTarget.kind === "manager" ? "Gestores" : linkTarget.label} />
          {linkTarget.kind === "manager" ? (
            (profile?.managers?.length || 0) === 0 ? (
              <CurrentValueCard icon={linkTarget.icon} label="Gestor atual">
                Não informado
              </CurrentValueCard>
            ) : (
              <div className="max-h-[11rem] space-y-2 overflow-y-auto">
                {(profile?.managers || []).map((item) => (
                  <CurrentValueCard key={item.vigency_id} icon={linkTarget.icon} label="Gestor">
                    {item.name}
                  </CurrentValueCard>
                ))}
              </div>
            )
          ) : (
            <CurrentValueCard icon={linkTarget.icon} label={`${linkTarget.label} atual`}>
              {tabValue(linkTarget.kind, profile) || "Não informado"}
            </CurrentValueCard>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {linkTarget.kind === "status" ? (
              <div className="space-y-2">
                <Label className={moduleLabelClass} htmlFor="employee-link-status">Situação</Label>
                <SiteSelect
                  id="employee-link-status"
                  value={statusLabelValue}
                  className="h-12"
                  options={[{ value: "active", label: "Ativo" }, { value: "dismissed", label: "Desligado" }]}
                  onChange={setStatusLabelValue}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className={moduleLabelClass} htmlFor="employee-link-reference">{linkTarget.label}</Label>
                <SiteSelect
                  id="employee-link-reference"
                  value={referenceId}
                  searchable
                  searchPath={linkTarget.path}
                  searchKey={linkTarget.searchKey}
                  searchPlaceholder={`Pesquisar ${linkTarget.label.toLocaleLowerCase("pt-BR")}`}
                  placeholder="Selecione"
                  className="h-12"
                  icon={linkTarget.icon}
                  options={linkChoices}
                  onChange={(value) => {
                    setReferenceId(value)
                    if (linkTarget.kind === "journey") {
                      setCycleDay("")
                      setCycleTouched(false)
                    }
                  }}
                />
              </div>
            )}
            <DatePickerField id="employee-link-from" label="Início" value={validFrom} onChange={setValidFrom} />
            {scheduledJourney ? (
              <div className="space-y-2 md:col-span-2">
                <Label className={moduleLabelClass} htmlFor="employee-link-cycle">Dia da sequência nesta data</Label>
                <SiteSelect
                  id="employee-link-cycle"
                  value={cycleDay}
                  placeholder="Selecione o dia"
                  className="h-12"
                  options={Array.from({ length: sequenceLength }, (_, index) => ({ value: String(index + 1), label: `Dia ${index + 1}` }))}
                  onChange={(next) => {
                    setCycleDay(next)
                    setCycleTouched(true)
                  }}
                />
                <p className="text-sm text-ui-slate">Na programada de sete dias, a sugestão é o dia da semana da vigência. Você pode escolher outro.</p>
              </div>
            ) : null}
            <div className="space-y-2 md:col-span-2">
              <Label className={moduleLabelClass} htmlFor="employee-link-note">Observação</Label>
              <textarea id="employee-link-note" className={cn(moduleTextClass, "min-h-24")} value={vigencyNote} onChange={(event) => setVigencyNote(event.target.value)} />
            </div>
          </div>
          <Button type="button" className={modulePrimaryClass} disabled={savingLink} onClick={() => void saveLink()}>
            {savingLink ? <Spinner className="h-4 w-4" /> : linkTarget.kind === "manager" ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {linkTarget.kind === "manager" ? "Adicionar gestor" : `Salvar ${linkTarget.label.toLocaleLowerCase("pt-BR")}`}
          </Button>
          <MovementHistory
            employeeId={id}
            kind={linkTarget.kind}
            revision={linkRevision}
            onChanged={() => {
              getRecord<Employee>("/employees", id).then(setProfile).catch(() => undefined)
            }}
          />
        </section>
      ) : null}
    </div>
  )
}
