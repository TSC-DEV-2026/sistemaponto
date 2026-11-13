import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  CalendarClock,
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  Eye,
  Filter,
  Info,
  Layers,
  Pencil,
  Plus,
  ScanLine,
  Tags,
  Search,
  Trash2,
  UserCog,
  UserMinus,
  UserRound,
  Users,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useBlocker, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { DatePickerField } from "@/components/ui/date-picker-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteSelect } from "@/components/ui/site-select"
import { Spinner } from "@/components/ui/spinner"
import { ClassificationFilter, classificationQuery } from "@/components/workforce/ClassificationFilter"
import { ListPager, usePagedList, type ListParams } from "@/components/workforce/list-controls"
import { moduleCardClass, moduleFieldClass, moduleIconClass, moduleLabelClass, modulePrimaryClass, moduleQuietClass, moduleTextClass } from "@/components/workforce/module-visual"
import { createRecord, listRecords, type Employee, type NamedRecord } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/utils/cn"
import { onlyDigits } from "@/utils/digits"
import { isoWeekday } from "@/pages/workforce/journey"
import { clockMethodLabel, showDate } from "@/utils/labels"

const detailBackClass = "group h-10 w-fit gap-2 rounded-[10px] border-[#D9DEE5] bg-white px-3.5 text-sm font-semibold text-[#0A0A0A] shadow-[0_2px_6px_rgba(15,23,42,0.04)] transition-[background-color,border-color,box-shadow] duration-200 hover:border-[#1E8A3A] hover:bg-[rgba(30,138,58,0.1)] hover:shadow-[0_4px_12px_rgba(30,138,58,0.16)] active:bg-[rgba(30,138,58,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30"

const catalog = [
  { id: "classification", kind: "classification", title: "Alterar classificação", description: "Define o valor de uma classificação para os funcionários.", valueName: "Novo valor", icon: Tags, path: "", needsValue: true, needsDate: true, fixedLabel: "" },
  { id: "job", kind: "job", title: "Alterar função", description: "Define uma nova função.", valueName: "Nova função", icon: Briefcase, path: "/jobs", needsValue: true, needsDate: true, fixedLabel: "" },
  { id: "journey", kind: "journey", title: "Alterar jornada", description: "Define uma nova jornada de trabalho.", valueName: "Nova jornada", icon: CalendarClock, path: "/journeys", needsValue: true, needsDate: true, fixedLabel: "" },
  { id: "team", kind: "team", title: "Transferir de equipe", description: "Altera o vínculo de equipe. Setor e unidade acompanham a equipe.", valueName: "Nova equipe", icon: Users, path: "/teams", needsValue: true, needsDate: true, fixedLabel: "" },
  { id: "union", kind: "union", title: "Alterar sindicato", description: "Define um novo sindicato.", valueName: "Novo sindicato", icon: Building2, path: "/unions", needsValue: true, needsDate: true, fixedLabel: "" },
  { id: "manager", kind: "manager", title: "Alterar gestor", description: "Define outro funcionário como gestor.", valueName: "Novo gestor", icon: UserCog, path: "/employees", needsValue: true, needsDate: true, fixedLabel: "" },
  { id: "dismissed", kind: "status", title: "Desligamento", description: "Encerra o vínculo na data informada, gravando a situação Desligado.", valueName: "", icon: UserMinus, path: "", needsValue: false, needsDate: true, fixedLabel: "dismissed" },
  { id: "active", kind: "status", title: "Reativar", description: "Volta a situação para Ativo na data informada, respeitando o limite do plano.", valueName: "", icon: UserRound, path: "", needsValue: false, needsDate: true, fixedLabel: "active" },
  { id: "clock_method", kind: "clock_method", title: "Alterar tipo de registro", description: "Define como o ponto é registrado. Esta operação não usa vigência.", valueName: "Novo tipo", icon: ScanLine, path: "", needsValue: true, needsDate: false, fixedLabel: "" },
] as const

const steps = [
  { id: "operation", label: "Operação" },
  { id: "people", label: "Funcionários" },
  { id: "config", label: "Configuração" },
] as const

const filterFields = [
  ["job_id", "Função", "/jobs"],
  ["journey_id", "Jornada", "/journeys"],
  ["team_id", "Equipe", "/teams"],
  ["sector_id", "Setor", "/sectors"],
  ["unit_id", "Unidade", "/units"],
  ["union_id", "Sindicato", "/unions"],
  ["manager_id", "Gestor", "/employees"],
] as const

const situationOptions = [
  { value: "", label: "Todos" },
  { value: "active", label: "Ativo" },
  { value: "dismissed", label: "Desligado" },
]

const clockOptions = Object.entries(clockMethodLabel).map(([value, label]) => ({ value, label }))
const howItWorks = [
  { icon: Plus, title: "Adicionar regra", text: "Escolha a operação e configure a alteração." },
  { icon: Copy, title: "Repetir (opcional)", text: "Adicione outras regras conforme necessário." },
  { icon: Eye, title: "Revisar", text: "Confira as regras e os funcionários selecionados." },
  { icon: CheckCheck, title: "Executar", text: "Confirme todas as alterações de uma só vez." },
]

type OperationId = (typeof catalog)[number]["id"]
type StepId = (typeof steps)[number]["id"]
type Screen = "home" | "wizard" | "review" | "done"
type Choice = { value: string; label: string; kind?: string; length?: number }
type Membership = { id: number; person_id: number; full_name: string; role: string }
type PersonPick = { id: number; name: string }
type Rule = {
  clientRuleId: string
  operationId: OperationId
  people: PersonPick[]
  value: string
  valueLabel: string
  validFrom: string
  note: string
  cycleDay: string
}
type RunResult = { rules: number; employees: number; lines: string[] }

function operationOf(id: OperationId) {
  return catalog.find((item) => item.id === id) || catalog[0]
}

async function loadAll<T>(path: string, params: Record<string, string | number> = {}) {
  const first = await listRecords<T>(path, { page: 1, limit: 100, ...params })
  const items = [...first.items]
  const pages = Math.ceil(first.total / 100)
  for (let page = 2; page <= pages; page += 1) {
    const next = await listRecords<T>(path, { page, limit: 100, ...params })
    items.push(...next.items)
  }
  return items
}

async function loadChoices(path: string): Promise<Choice[]> {
  const items = await loadAll<NamedRecord | Employee>(path)
  return items.map((item) => ({
    value: String(item.id),
    label: "full_name" in item ? item.full_name || "Não informado" : item.name || "Não informado",
    kind: "kind" in item ? item.kind : undefined,
    length: "days" in item ? item.days?.length || 0 : undefined,
  }))
}

async function loadManagerChoices(): Promise<Choice[]> {
  const [admins, managers, employees] = await Promise.all([
    loadAll<Membership>("/memberships", { role: "admin" }),
    loadAll<Membership>("/memberships", { role: "manager" }),
    loadAll<Employee>("/employees"),
  ])
  const allowed = new Set([...admins, ...managers].map((item) => item.person_id))
  return employees
    .filter((item) => item.person_id !== null && allowed.has(item.person_id))
    .map((item) => ({ value: String(item.id), label: item.full_name || "Não informado" }))
}

function personQuery(text: string): ListParams {
  const term = text.trim()
  if (!term) return {}
  if (/[A-Za-zÀ-ÿ]/.test(term)) return { full_name: term }
  const digits = onlyDigits(term)
  if (digits.length === 11) return { cpf: digits }
  return {}
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function employeeDetail(employee: Employee) {
  const parts = [employee.job_label, employee.team_label].filter((item): item is string => Boolean(item))
  if (employee.registration_number) parts.push(employee.registration_number)
  return parts.length > 0 ? parts.join(" · ") : "Não informado"
}

function peopleCount(count: number) {
  return count === 1 ? "1 funcionário" : `${count} funcionários`
}

function rulePayload(rule: Rule) {
  const operation = operationOf(rule.operationId)
  const body: Record<string, unknown> = {
    employee_ids: rule.people.map((item) => item.id),
    kind: operation.kind,
    reference_id: null,
    label: null,
    clock_method: null,
    valid_from: null,
    note: null,
  }
  if (operation.kind === "clock_method") body.clock_method = rule.value
  else {
    body.valid_from = rule.validFrom
    body.note = rule.note.trim() || null
    if (operation.kind === "status") body.label = operation.fixedLabel
    else body.reference_id = Number(rule.value)
    if (operation.kind === "journey" && rule.cycleDay) body.cycle_day = Number(rule.cycleDay)
  }
  return body
}

function ruleLine(rule: Rule) {
  const operation = operationOf(rule.operationId)
  const when = operation.needsDate ? ` · Vigência: ${showDate(rule.validFrom)}` : ""
  const cycle = rule.cycleDay ? ` · Dia ${rule.cycleDay} da sequência` : ""
  return `${operation.title} — ${peopleCount(rule.people.length)}${when}${cycle}`
}

function newRuleId() {
  return `rule-${crypto.randomUUID()}`
}

export function BulkChangesPage() {
  const navigate = useNavigate()
  const role = useAuthStore((state) => state.user?.role)
  const isAdmin = role === "admin"
  const [screen, setScreen] = useState<Screen>("home")
  const [step, setStep] = useState<StepId>("operation")
  const [rules, setRules] = useState<Rule[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [operationId, setOperationId] = useState<OperationId | "">("")
  const [selected, setSelected] = useState<PersonPick[]>([])
  const [value, setValue] = useState("")
  const [validFrom, setValidFrom] = useState("")
  const [cycleDay, setCycleDay] = useState("")
  const [cycleTouched, setCycleTouched] = useState(false)
  const [note, setNote] = useState("")
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [filterValues, setFilterValues] = useState<number[]>([])
  const [classificationId, setClassificationId] = useState("")
  const [classificationValues, setClassificationValues] = useState<Choice[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [allFilterSelected, setAllFilterSelected] = useState(false)
  const [marking, setMarking] = useState(false)
  const [personDraft, setPersonDraft] = useState("")
  const [person, setPerson] = useState("")
  const [choices, setChoices] = useState<Record<string, Choice[]>>({})
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(0)
  const [listed, setListed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [expanded, setExpanded] = useState<string[]>([])
  const [result, setResult] = useState<RunResult | null>(null)
  const operation = operationId ? operationOf(operationId) : null
  const query: ListParams = { ...personQuery(person) }
  for (const [key, current] of Object.entries(filters)) {
    if (current) query[key] = current
  }
  const list = usePagedList<Employee>("/employees", query, isAdmin, saved)
  const queryKey = JSON.stringify(query)
  const queryKeyRef = useRef(queryKey)
  queryKeyRef.current = queryKey
  const selectedIds = new Set(selected.map((item) => item.id))
  const distinctPeople = new Set(rules.flatMap((rule) => rule.people.map((item) => item.id))).size
  const dated = rules.filter((rule) => operationOf(rule.operationId).needsDate).map((rule) => rule.validFrom)
  const sharedDate = dated.length > 0 && dated.every((item) => item === dated[0]) ? dated[0] : ""
  const dirty = screen !== "done" && (rules.length > 0 || screen === "wizard")
  const blocker = useBlocker(dirty)

  useEffect(() => {
    if (!role || isAdmin) return
    navigate("/", { replace: true })
  }, [role, isAdmin, navigate])

  useEffect(() => {
    if (!isAdmin) return
    let active = true
    const paths = [...new Set([...filterFields.map((item) => item[2]), ...catalog.map((item) => item.path).filter(Boolean)])]
    Promise.all(paths.map(async (path) => [path, path === "/employees" ? await loadManagerChoices() : await loadChoices(path)] as const))
      .then(async (loaded) => {
        const groups = await loadChoices("/classifications").catch(() => [])
        if (active) setChoices({ ...Object.fromEntries(loaded), "/classifications": groups })
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Não foi possível carregar.")
      })
    return () => {
      active = false
    }
  }, [isAdmin])

  useEffect(() => {
    if (!classificationId) {
      setClassificationValues([])
      return
    }
    let active = true
    loadAll<NamedRecord>("/classification-values", { classification_id: Number(classificationId) })
      .then((items) => {
        if (active) setClassificationValues(items.map((item) => ({ value: String(item.id), label: item.name || "Não informado" })))
      })
      .catch(() => {
        if (active) setClassificationValues([])
      })
    return () => {
      active = false
    }
  }, [classificationId])

  useEffect(() => {
    const query = classificationQuery(filterValues)
    setFilters((current) => {
      const next = { ...current }
      if (query) next.classification_value_id = query
      else delete next.classification_value_id
      return next
    })
  }, [filterValues])

  useEffect(() => {
    if (!list.loading) setListed(true)
  }, [list.loading])

  useEffect(() => {
    const timer = window.setTimeout(() => setPerson(personDraft.trim()), 280)
    return () => window.clearTimeout(timer)
  }, [personDraft])

  useEffect(() => {
    setAllFilterSelected(false)
  }, [queryKey])

  useEffect(() => {
    if (!dirty) return
    function onLeave(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", onLeave)
    return () => window.removeEventListener("beforeunload", onLeave)
  }, [dirty])

  const selectedJourney = operationId === "journey" ? (choices["/journeys"] || []).find((item) => item.value === value) : undefined
  useEffect(() => {
    if (selectedJourney?.kind !== "programada" || cycleTouched || selectedJourney.length !== 7 || !validFrom) return
    setCycleDay(String(isoWeekday(validFrom)))
  }, [value, selectedJourney?.kind, selectedJourney?.length, cycleTouched, validFrom])

  function begin(next: { editingId: string | null; operationId: OperationId | ""; people: PersonPick[]; value: string; validFrom: string; note: string; cycleDay: string }) {
    setEditingId(next.editingId)
    setOperationId(next.operationId)
    setSelected(next.people)
    setValue(next.value)
    setValidFrom(next.validFrom)
    setCycleDay(next.cycleDay)
    setCycleTouched(Boolean(next.cycleDay))
    setNote(next.note)
    setFilters({})
    setFiltersOpen(false)
    setAllFilterSelected(false)
    setPersonDraft("")
    setPerson("")
    setStep("operation")
    setScreen("wizard")
    setError("")
  }

  function chooseOperation(next: OperationId) {
    if (next !== operationId) {
      setValue("")
      setClassificationId("")
      setValidFrom("")
      setCycleDay("")
      setCycleTouched(false)
      setNote("")
    }
    setOperationId(next)
    setError("")
  }

  function goPeople() {
    if (!operationId) {
      setError("Selecione a operação.")
      return
    }
    setError("")
    setStep("people")
  }

  function goConfig() {
    if (selected.length === 0) {
      setError("Selecione ao menos um funcionário.")
      return
    }
    setError("")
    setStep("config")
  }

  function toggle(item: Employee) {
    const pick = { id: item.id, name: item.full_name || "Não informado" }
    const exists = selected.some((personItem) => personItem.id === item.id)
    if (exists) setAllFilterSelected(false)
    setSelected((current) => (exists ? current.filter((personItem) => personItem.id !== item.id) : [...current, pick]))
  }

  async function markFilter() {
    const key = queryKeyRef.current
    setMarking(true)
    setError("")
    try {
      const first = await listRecords<Employee>("/employees", { page: 1, limit: 100, ...query })
      const picks = first.items.map((item) => ({ id: item.id, name: item.full_name || "Não informado" }))
      const pages = Math.ceil(first.total / 100)
      for (let page = 2; page <= pages; page += 1) {
        const next = await listRecords<Employee>("/employees", { page, limit: 100, ...query })
        picks.push(...next.items.map((item) => ({ id: item.id, name: item.full_name || "Não informado" })))
      }
      setSelected((current) => {
        const merged = new Map(current.map((item) => [item.id, item]))
        for (const pick of picks) merged.set(pick.id, pick)
        return [...merged.values()]
      })
      if (queryKeyRef.current === key) setAllFilterSelected(true)
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Não foi possível marcar.")
    } finally {
      setMarking(false)
    }
  }

  function valueOptions() {
    if (!operation) return []
    if (operation.id === "clock_method") return clockOptions
    if (operation.id === "classification") return classificationValues
    return choices[operation.path] || []
  }

  function saveRule() {
    if (!operation) {
      setError("Selecione a operação.")
      setStep("operation")
      return
    }
    if (selected.length === 0) {
      setError("Selecione ao menos um funcionário.")
      setStep("people")
      return
    }
    if (operation.needsValue && !value) {
      setError("Informe o novo valor.")
      return
    }
    if (operation.needsDate && !validFrom) {
      setError("Informe a vigência.")
      return
    }
    const chosen = operation.id === "journey" ? (choices["/journeys"] || []).find((item) => item.value === value) : undefined
    if (chosen?.kind === "programada") {
      const day = Number(cycleDay)
      if (!cycleDay || day < 1 || day > (chosen.length || 0)) {
        setError("Informe o dia da sequência.")
        return
      }
    }
    const rule: Rule = {
      clientRuleId: editingId || newRuleId(),
      operationId: operation.id,
      people: selected,
      value: operation.needsValue ? value : operation.fixedLabel,
      valueLabel: operation.needsValue ? valueOptions().find((item) => item.value === value)?.label || "Não informado" : operation.id === "dismissed" ? "Desligado" : "Ativo",
      validFrom: operation.needsDate ? validFrom : "",
      note: operation.needsDate ? note : "",
      cycleDay: chosen?.kind === "programada" ? cycleDay : "",
    }
    setRules((current) => (editingId ? current.map((item) => (item.clientRuleId === editingId ? rule : item)) : [...current, rule]))
    setEditingId(null)
    setScreen("home")
    setError("")
  }

  function leaveWizard() {
    if (operationId || selected.length > 0 || value || note) {
      setDiscarding(true)
      return
    }
    setScreen("home")
    setError("")
  }

  function backStep() {
    setError("")
    if (step === "config") setStep("people")
    else if (step === "people") setStep("operation")
    else leaveWizard()
  }

  async function confirmRun() {
    const pending = [...rules]
    const doneIds: string[] = []
    const lines: string[] = []
    for (let index = 0; index < pending.length; index += 1) {
      const rule = pending[index]
      try {
        await createRecord("/employees/changes", rulePayload(rule))
        doneIds.push(rule.clientRuleId)
        lines.push(ruleLine(rule))
      } catch (caught) {
        setRules(pending.filter((item) => !doneIds.includes(item.clientRuleId)))
        if (doneIds.length > 0) setSaved((current) => current + 1)
        setError(`A regra ${index + 1} não foi aplicada. ${caught instanceof Error ? caught.message : "Não foi possível executar."} As regras anteriores desta execução já foram salvas. As seguintes continuam na lista.`)
        return
      }
    }
    const employees = new Set(pending.flatMap((rule) => rule.people.map((item) => item.id))).size
    setResult({ rules: pending.length, employees, lines })
    setRules([])
    setScreen("done")
    setConfirming(false)
    setError("")
    setSaved((current) => current + 1)
  }

  if (!isAdmin) return null

  return (
    <div className="w-full min-w-0 space-y-4">
      {screen === "home" && rules.length === 0 ? <EmptyHome onStart={() => begin({ editingId: null, operationId: "", people: [], value: "", validFrom: "", note: "", cycleDay: "" })} /> : null}
      {screen === "home" && rules.length > 0 ? (
        <RulesHome
          rules={rules}
          error={error}
          onAdd={() => begin({ editingId: null, operationId: "", people: [], value: "", validFrom: "", note: "", cycleDay: "" })}
          onEdit={(rule) => begin({ editingId: rule.clientRuleId, operationId: rule.operationId, people: rule.people, value: rule.value, validFrom: rule.validFrom, note: rule.note, cycleDay: rule.cycleDay })}
          onCopy={(rule) => begin({ editingId: null, operationId: rule.operationId, people: rule.people, value: rule.value, validFrom: rule.validFrom, note: rule.note, cycleDay: rule.cycleDay })}
          onRemove={(id) => setRules((current) => current.filter((item) => item.clientRuleId !== id))}
          onReview={() => {
            setError("")
            setScreen("review")
          }}
        />
      ) : null}
      {screen === "wizard" ? (
        <div className="w-full min-w-0 space-y-5">
          <Button type="button" variant="outline" className={detailBackClass} onClick={backStep}>
            <ArrowLeft className="h-4 w-4 text-[#1E8A3A] transition-transform duration-200 motion-reduce:transition-none motion-safe:group-hover:-translate-x-[3px]" />
            Voltar
          </Button>
          <section className={cn(moduleCardClass, "space-y-5")}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
              <Layers className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[#0A0A0A]">{editingId ? "Editar regra" : "Nova regra"}</h2>
              <p className="text-sm text-[#64748B]">Defina a operação, selecione os funcionários e configure a alteração.</p>
            </div>
          </div>
          <ol className="grid grid-cols-3" aria-label="Etapas da regra">
            {steps.map((item, index) => {
              const current = steps.findIndex((stepItem) => stepItem.id === step)
              const done = index < current
              const active = index === current
              return (
                <li key={item.id} className="relative flex flex-col items-center">
                  {index < steps.length - 1 ? <span className={cn("absolute left-1/2 top-4 h-0.5 w-full -translate-y-1/2", index < current ? "bg-[#1E8A3A]" : "bg-[#C5CED8]")} aria-hidden /> : null}
                  <button
                    type="button"
                    className="relative z-10 flex flex-col items-center gap-2 bg-transparent text-center"
                    disabled={!done}
                    onClick={() => {
                      if (done) setStep(item.id)
                    }}
                  >
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold", active || done ? "bg-[#1E8A3A] text-white" : "bg-[#E7E8EA] text-[#94A3B8]")}>
                      {done ? <Check className="h-4 w-4" strokeWidth={2.75} /> : index + 1}
                    </span>
                    <span className={cn("text-xs font-medium sm:text-sm", active ? "text-[#1E8A3A]" : done ? "text-[#0A0A0A]" : "text-[#94A3B8]")}>{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ol>
          {step === "operation" ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-[#0A0A0A]">Qual operação deseja realizar?</h3>
              <div className="space-y-2" role="radiogroup" aria-label="Operação">
                {catalog.map((item) => {
                  const Icon = item.icon
                  const picked = operationId === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={picked}
                      className={cn("flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors", picked ? "border-[#1E8A3A] bg-[#EAF7EF]" : "border-[#E2E8F0] bg-white hover:border-[#8ED4A8]")}
                      onClick={() => chooseOperation(item.id)}
                    >
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", item.id === "dismissed" ? "bg-[#FEF2F2] text-[#E11D48]" : "bg-[#EAF7EF] text-[#1E8A3A]")}>
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-[#0A0A0A]">{item.title}</span>
                        <span className="mt-0.5 block text-sm text-[#64748B]">{item.description}</span>
                      </span>
                      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", picked ? "border-[#1E8A3A] bg-[#1E8A3A] text-white" : "border-[#D5DCE3] bg-white")}>
                        {picked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                      </span>
                    </button>
                  )
                })}
              </div>
              {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
              <div className="flex justify-end">
                <Button type="button" className={modulePrimaryClass} disabled={!operationId} onClick={goPeople}>
                  Avançar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
          {step === "people" ? (
            <div>
              <h3 className="text-lg font-semibold text-[#0A0A0A]">Selecionar funcionários</h3>
              <div className="mt-5 space-y-2">
                <Label className={moduleLabelClass} htmlFor="bulk-person">Pesquisar</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#94A3B8]" strokeWidth={1.75} aria-hidden />
                  <Input id="bulk-person" value={personDraft} placeholder="Pesquisar por nome ou CPF" className={cn(moduleFieldClass, "pl-10 pr-12")} onChange={(event) => setPersonDraft(event.target.value)} />
                  <button
                    type="button"
                    className={cn("absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg transition-colors", filtersOpen || Object.values(filters).some(Boolean) ? "bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" : "text-[#64748B] hover:bg-[#F4F4F5] hover:text-[#0A0A0A]")}
                    aria-expanded={filtersOpen}
                    aria-label={filtersOpen ? "Ocultar filtros" : "Mostrar filtros"}
                    onClick={() => setFiltersOpen((current) => !current)}
                  >
                    <Filter className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
              {filtersOpen ? (
              <div className="mt-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <h4 className="text-sm font-semibold text-[#0A0A0A]">Filtros</h4>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filterFields.map(([key, label, path]) => (
                    <div key={key} className="space-y-2">
                      <Label className={moduleLabelClass} htmlFor={`bulk-${key}`}>{label}</Label>
                      <SiteSelect
                        id={`bulk-${key}`}
                        value={filters[key] || ""}
                        placeholder="Todos"
                        searchable
                        searchPath={path === "/employees" ? undefined : path}
                        searchKey={path === "/employees" ? "full_name" : "name"}
                        searchPlaceholder={`Pesquisar ${label.toLocaleLowerCase("pt-BR")}`}
                        className="h-12"
                        options={[{ value: "", label: "Todos" }, ...(choices[path] || [])]}
                        onChange={(next) => setFilters((current) => ({ ...current, [key]: next }))}
                      />
                    </div>
                  ))}
                  <div className="space-y-2">
                    <Label className={moduleLabelClass} htmlFor="bulk-situation">Situação</Label>
                    <SiteSelect id="bulk-situation" value={filters.situation || ""} className="h-12" options={situationOptions} onChange={(next) => setFilters((current) => ({ ...current, situation: next }))} />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm font-semibold text-[#0A0A0A]">Classificações</p>
                  <p className="mt-1 text-sm text-[#64748B]">Valores da mesma classificação se alternam. Classificações diferentes se somam.</p>
                  <div className="mt-3">
                    <ClassificationFilter selected={filterValues} onChange={setFilterValues} />
                  </div>
                </div>
              </div>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  className={cn("inline-flex h-10 items-center gap-2 rounded-[10px] border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50", allFilterSelected ? "border-[#1E8A3A] bg-[#EAF7EF] text-[#1E8A3A]" : "border-[#E2E8F0] bg-white text-[#0A0A0A] hover:border-[#8ED4A8] hover:bg-[#F7FCF9] active:bg-[#EAF7EF]")}
                  disabled={list.total === 0 || marking}
                  aria-pressed={allFilterSelected}
                  onClick={() => void markFilter()}
                >
                  <span className={cn("flex h-[22px] w-[22px] items-center justify-center rounded-[7px] border", allFilterSelected ? "border-[#1E8A3A] bg-[#1E8A3A] text-white" : "border-[#D5DCE3] bg-white")}>
                    {marking ? <Spinner label="Marcando os funcionários" className="h-3.5 w-3.5 text-[#1E8A3A]" /> : allFilterSelected ? <Check className="h-3.5 w-3.5" strokeWidth={2.75} /> : null}
                  </span>
                  Selecionar todos do filtro ({list.total})
                </button>
                <div className="flex items-center gap-4">
                  <button type="button" className={cn(moduleQuietClass, "h-10 px-3 disabled:cursor-not-allowed disabled:opacity-50")} disabled={selected.length === 0} onClick={() => { setSelected([]); setAllFilterSelected(false) }}>Limpar seleção</button>
                  <p className="text-sm font-medium text-[#1E8A3A]">{selected.length} selecionados</p>
                </div>
              </div>
              {list.error ? <p className="mt-4 text-sm text-destructive" role="alert">{list.error}</p> : null}
              {list.loading && !listed ? (
                <div className="flex justify-center py-10" role="status">
                  <Spinner label="Carregando os funcionários" className="h-8 w-8 text-[#1E8A3A]" />
                </div>
              ) : list.items.length === 0 ? (
                <div className="px-2 py-10 text-center">
                  <p className="text-[15px] font-semibold text-[#0A0A0A]">Nenhum funcionário</p>
                  <p className="mt-1 text-sm text-[#71717A]">A consulta não encontrou registros.</p>
                </div>
              ) : (
                <ul className="mt-4 space-y-2">
                  {list.items.map((item) => (
                    <li key={item.id}>
                      <label htmlFor={`bulk-person-${item.id}`} className={cn("flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3", selectedIds.has(item.id) ? "border-[#8ED4A8] bg-[#F7FCF9]" : "border-[#E2E8F0] bg-white")}>
                        <span className="relative h-[22px] w-[22px] shrink-0">
                          <input id={`bulk-person-${item.id}`} type="checkbox" className="peer sr-only" checked={selectedIds.has(item.id)} onChange={() => toggle(item)} />
                          <span className="pointer-events-none flex h-[22px] w-[22px] items-center justify-center rounded-[7px] border border-[#D5DCE3] bg-white peer-checked:border-[#1E8A3A] peer-checked:bg-[#1E8A3A] peer-checked:[&>svg]:opacity-100 peer-focus-visible:shadow-[0_0_0_3px_rgba(30,138,58,0.16)]">
                            <Check className="h-3.5 w-3.5 text-white opacity-0" strokeWidth={2.75} />
                          </span>
                        </span>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF7EF] text-xs font-semibold text-[#1E8A3A]">{initials(item.full_name || "")}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-[#0A0A0A]">{item.full_name || "Não informado"}</span>
                          <span className="mt-0.5 block truncate text-sm text-[#64748B]">{employeeDetail(item)}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              {list.total > 0 ? (
                <div className="mt-4 border-t border-[#F1F5F9] pt-4">
                  <ListPager page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} onPageSize={list.setPageSize} />
                </div>
              ) : null}
              {error ? <p className="mt-4 text-sm text-destructive" role="alert">{error}</p> : null}
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <Button type="button" className={cn(moduleQuietClass, "h-11 px-4")} onClick={backStep}>
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <Button type="button" className={modulePrimaryClass} disabled={selected.length === 0} onClick={goConfig}>
                  Avançar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
          {step === "config" && operation ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[#0A0A0A]">Configurar alteração</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF7EF] text-[#1E8A3A]">{(() => { const Icon = operation.icon; return <Icon className="h-4 w-4" strokeWidth={1.75} /> })()}</span>
                  <span>
                    <span className="block text-sm text-[#64748B]">Operação</span>
                    <span className="mt-0.5 block font-semibold text-[#0A0A0A]">{operation.title}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF7EF] text-[#1E8A3A]"><Users className="h-4 w-4" strokeWidth={1.75} /></span>
                  <span>
                    <span className="block text-sm text-[#64748B]">Funcionários</span>
                    <span className="mt-0.5 block font-semibold text-[#0A0A0A]">{peopleCount(selected.length)} selecionados</span>
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {operation.id === "classification" ? (
                  <div className="space-y-2">
                    <Label className={moduleLabelClass} htmlFor="bulk-classification">Classificação</Label>
                    <SiteSelect
                      id="bulk-classification"
                      value={classificationId}
                      placeholder="Selecione"
                      searchable
                      className="h-12"
                      options={[{ value: "", label: "Selecione" }, ...(choices["/classifications"] || [])]}
                      onChange={(next) => {
                        setClassificationId(next)
                        setValue("")
                      }}
                    />
                  </div>
                ) : null}
                {operation.needsValue ? (
                  <div className="space-y-2">
                    <Label className={moduleLabelClass} htmlFor="bulk-value">{operation.valueName}</Label>
                    <SiteSelect
                      id="bulk-value"
                      value={value}
                      placeholder="Selecione"
                      searchable={operation.id !== "clock_method"}
                      searchPath={operation.id === "clock_method" || operation.id === "classification" || operation.path === "/employees" ? undefined : operation.path}
                      searchPlaceholder="Pesquisar"
                      className="h-12"
                      options={valueOptions()}
                      onChange={(next) => {
                        setValue(next)
                        if (operation.id === "journey") {
                          setCycleDay("")
                          setCycleTouched(false)
                        }
                      }}
                    />
                  </div>
                ) : null}
                {operation.needsDate ? <DatePickerField id="bulk-from" label="Vigência a partir de" value={validFrom} onChange={setValidFrom} /> : null}
                {operation.id === "journey" && (choices["/journeys"] || []).find((item) => item.value === value)?.kind === "programada" ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label className={moduleLabelClass} htmlFor="bulk-cycle">Dia da sequência nesta data</Label>
                    <SiteSelect
                      id="bulk-cycle"
                      value={cycleDay}
                      placeholder="Selecione o dia"
                      options={Array.from({ length: (choices["/journeys"] || []).find((item) => item.value === value)?.length || 0 }, (_, index) => ({ value: String(index + 1), label: `Dia ${index + 1}` }))}
                      onChange={(next) => {
                        setCycleDay(next)
                        setCycleTouched(true)
                      }}
                    />
                    <p className="text-sm text-[#64748B]">Na programada de sete dias, a sugestão é o dia da semana da vigência. Você pode escolher outro.</p>
                  </div>
                ) : null}
                {operation.needsDate ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label className={moduleLabelClass} htmlFor="bulk-note">Observação</Label>
                    <textarea id="bulk-note" className={moduleTextClass} value={note} onChange={(event) => setNote(event.target.value)} />
                  </div>
                ) : null}
              </div>
              {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" className={cn(moduleQuietClass, "h-11 px-4")} onClick={backStep}>
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <Button type="button" className={modulePrimaryClass} onClick={saveRule}>
                  <Plus className="h-4 w-4" />
                  {editingId ? "Salvar regra" : "Adicionar regra ao conjunto"}
                </Button>
              </div>
            </div>
          ) : null}
          </section>
        </div>
      ) : null}
      {screen === "review" ? (
        <ReviewScreen
          rules={rules}
          distinctPeople={distinctPeople}
          sharedDate={sharedDate}
          expanded={expanded}
          error={error}
          onToggle={(id) => setExpanded((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))}
          onBack={() => setScreen("home")}
          onRun={() => {
            setError("")
            setConfirming(true)
          }}
        />
      ) : null}
      {screen === "done" && result ? (
        <section className={moduleCardClass}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
                <Check className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-[#0A0A0A]">Alterações executadas</h2>
                <p className="text-sm text-[#64748B]">{result.rules === 1 ? "1 regra executada" : `${result.rules} regras executadas`} · {peopleCount(result.employees)} distintos.</p>
              </div>
            </div>
          </div>
          <div className="mt-5">
            <h3 className="text-lg font-semibold text-[#0A0A0A]">Regras executadas</h3>
            <ul className="mt-4 space-y-2">
              {result.lines.map((line, index) => {
                const [title, detail] = line.split(" — ")
                return (
                  <li key={`${index}-${line}`} className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3">
                    <span className="block font-semibold text-[#0A0A0A]">{title}</span>
                    {detail ? <span className="mt-0.5 block text-sm text-[#64748B]">{detail}</span> : null}
                  </li>
                )
              })}
            </ul>
            <div className="mt-5 flex justify-end">
              <Button type="button" className={modulePrimaryClass} onClick={() => { setResult(null); setScreen("home") }}>
                <Check className="h-4 w-4" />
                Concluir
              </Button>
            </div>
          </div>
        </section>
      ) : null}
      <ConfirmDialog
        open={confirming}
        title="Confirmar execução das alterações?"
        text={`Você está prestes a executar ${rules.length === 1 ? "1 regra" : `${rules.length} regras`} que afetam ${peopleCount(distinctPeople)}.`}
        lines={rules.map(ruleLine)}
        notice="Cada regra é gravada na hora. Se uma falhar, as anteriores desta execução permanecem salvas e as seguintes ficam na lista."
        confirmLabel="Confirmar e executar"
        error={error}
        onClose={() => setConfirming(false)}
        onConfirm={confirmRun}
      />
      <ConfirmDialog
        open={discarding || blocker.state === "blocked"}
        title="Descartar o que não foi executado?"
        text="As regras ainda não foram gravadas. Se sair agora, essa preparação se perde."
        lines={[]}
        notice=""
        confirmLabel="Descartar"
        error=""
        onClose={() => {
          setDiscarding(false)
          if (blocker.state === "blocked") blocker.reset()
        }}
        onConfirm={async () => {
          if (blocker.state === "blocked") {
            blocker.proceed()
            return
          }
          setDiscarding(false)
          setScreen("home")
          setEditingId(null)
          setError("")
        }}
      />
    </div>
  )
}

function EmptyHome({ onStart }: { onStart: () => void }) {
  return (
    <section className={cn(moduleCardClass, "space-y-5")}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
          <Layers className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[#0A0A0A]">Operações em massa</h2>
          <p className="text-sm text-[#64748B]">Configure múltiplas regras e execute todas de uma só vez.</p>
        </div>
      </div>
      <div className="grid items-center gap-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:grid-cols-[1.4fr_auto] sm:p-5">
        <div>
          <h3 className="text-base font-semibold text-[#0A0A0A]">Configure várias alterações de forma sequencial</h3>
          <p className="mt-1 max-w-xl text-sm leading-6 text-[#64748B]">Adicione uma regra por vez, selecione os funcionários, configure cada alteração e execute todas ao final.</p>
        </div>
        <div className="hidden w-40 rounded-xl border border-[#E2E8F0] bg-white p-3.5 sm:block" aria-hidden>
          <span className="block h-2 w-16 rounded-full bg-[rgba(30,138,58,0.18)]" />
          <span className="mt-3 flex items-center gap-2 text-sm text-[#0A0A0A]"><Check className="h-3.5 w-3.5 text-[#1E8A3A]" strokeWidth={2.75} /> Regra</span>
          <span className="mt-2 flex items-center gap-2 text-sm text-[#0A0A0A]"><Check className="h-3.5 w-3.5 text-[#1E8A3A]" strokeWidth={2.75} /> Regra</span>
          <span className="mt-2 flex items-center gap-2 text-sm text-[#94A3B8]"><span className="h-3.5 w-3.5 rounded-full border border-[#D5DCE3]" /> Regra</span>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-[#0A0A0A]">Como funciona</h3>
        <ol className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-4">
          {howItWorks.map((item, index) => {
            const Icon = item.icon
            return (
              <li key={item.title} className="relative text-center">
                {index < howItWorks.length - 1 ? <span className="absolute left-[calc(50%+26px)] right-[calc(-50%+26px)] top-5 hidden h-px bg-[#E2E8F0] sm:block" aria-hidden /> : null}
                <span className="relative mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <p className="mt-3 text-sm font-semibold text-[#0A0A0A]">{index + 1}. {item.title}</p>
                <p className="mt-1 text-sm leading-5 text-[#64748B]">{item.text}</p>
              </li>
            )
          })}
        </ol>
      </div>
      <div className="flex justify-center">
        <Button type="button" className={modulePrimaryClass} onClick={onStart}>
          <Plus className="h-4 w-4" />
          Adicionar primeira regra
        </Button>
      </div>
    </section>
  )
}

function RulesHome({
  rules,
  error,
  onAdd,
  onEdit,
  onCopy,
  onRemove,
  onReview,
}: {
  rules: Rule[]
  error: string
  onAdd: () => void
  onEdit: (rule: Rule) => void
  onCopy: (rule: Rule) => void
  onRemove: (id: string) => void
  onReview: () => void
}) {
  return (
    <section className={moduleCardClass}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
            <Layers className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[#0A0A0A]">Operações em massa</h2>
            <p className="text-sm text-[#64748B]">Configure as regras que serão executadas.</p>
          </div>
        </div>
        <Button type="button" className={cn(modulePrimaryClass, "w-full shrink-0 sm:w-auto")} onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Adicionar outra regra
        </Button>
      </div>
      <div className="mt-5">
        <h3 className="text-lg font-semibold text-[#0A0A0A]">Regras configuradas ({rules.length})</h3>
        {error ? <p className="mt-4 text-sm text-destructive" role="alert">{error}</p> : null}
        <ul className="mt-4 space-y-2">
          {rules.map((rule) => {
            const operation = operationOf(rule.operationId)
            const Icon = operation.icon
            return (
              <li key={rule.clientRuleId} className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3">
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", rule.operationId === "dismissed" ? "bg-[#FEF2F2] text-[#E11D48]" : "bg-[#EAF7EF] text-[#1E8A3A]")}>
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-[#0A0A0A]">{operation.title}</span>
                  <span className="mt-0.5 block text-sm text-[#64748B]">
                    {peopleCount(rule.people.length)}
                    {operation.needsDate ? ` · Vigência: ${showDate(rule.validFrom)}` : " · Sem período informado."}
                    {rule.valueLabel ? ` · ${rule.valueLabel}` : ""}
                  </span>
                </span>
                <span className="flex shrink-0 gap-1">
                  <Button type="button" className={moduleIconClass} aria-label={`Editar ${operation.title}`} onClick={() => onEdit(rule)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button type="button" className={moduleIconClass} aria-label={`Duplicar ${operation.title}`} onClick={() => onCopy(rule)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button type="button" className={moduleIconClass} aria-label={`Remover ${operation.title}`} onClick={() => onRemove(rule.clientRuleId)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </span>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 flex gap-2 rounded-xl bg-[#EAF7EF] px-4 py-3 text-sm leading-6 text-[#3F6B4C]">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>Você pode adicionar quantas regras forem necessárias antes de executar. Cada regra é gravada na hora.</span>
        </p>
        <div className="mt-5 flex justify-end">
          <Button type="button" className={modulePrimaryClass} onClick={onReview}>Revisar e executar</Button>
        </div>
      </div>
    </section>
  )
}

function ReviewScreen({
  rules,
  distinctPeople,
  sharedDate,
  expanded,
  error,
  onToggle,
  onBack,
  onRun,
}: {
  rules: Rule[]
  distinctPeople: number
  sharedDate: string
  expanded: string[]
  error: string
  onToggle: (id: string) => void
  onBack: () => void
  onRun: () => void
}) {
  return (
    <div className="w-full min-w-0 space-y-5">
      <Button type="button" variant="outline" className={detailBackClass} onClick={onBack}>
        <ArrowLeft className="h-4 w-4 text-[#1E8A3A] transition-transform duration-200 motion-reduce:transition-none motion-safe:group-hover:-translate-x-[3px]" />
        Voltar
      </Button>
      <section className={cn(moduleCardClass, "space-y-5")}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
          <Layers className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[#0A0A0A]">Revisar e executar</h2>
          <p className="text-sm text-[#64748B]">Confira todas as regras configuradas antes de executar as alterações.</p>
        </div>
      </div>
      <div className={cn("grid grid-cols-1 gap-3", sharedDate ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        <article className="flex items-center gap-3 rounded-[14px] border border-[#E2E8F0] bg-white px-4 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF7EF] text-[#1E8A3A]"><Layers className="h-5 w-5" strokeWidth={1.75} /></span>
          <span>
            <span className="block text-sm text-[#64748B]">Total de regras</span>
            <span className="mt-0.5 block text-xl font-semibold text-[#0A0A0A]">{rules.length}</span>
          </span>
        </article>
        <article className="flex items-center gap-3 rounded-[14px] border border-[#E2E8F0] bg-white px-4 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF7EF] text-[#1E8A3A]"><Users className="h-5 w-5" strokeWidth={1.75} /></span>
          <span>
            <span className="block text-sm text-[#64748B]">Total de funcionários</span>
            <span className="mt-0.5 block text-xl font-semibold text-[#0A0A0A]">{distinctPeople}</span>
          </span>
        </article>
        {sharedDate ? (
          <article className="flex items-center gap-3 rounded-[14px] border border-[#E2E8F0] bg-white px-4 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF7EF] text-[#1E8A3A]"><CalendarClock className="h-5 w-5" strokeWidth={1.75} /></span>
            <span>
              <span className="block text-sm text-[#64748B]">Vigência</span>
              <span className="mt-0.5 block text-xl font-semibold text-[#0A0A0A]">{showDate(sharedDate)}</span>
            </span>
          </article>
        ) : null}
      </div>
      <ul className="space-y-2">
        {rules.map((rule) => {
          const operation = operationOf(rule.operationId)
          const Icon = operation.icon
          const open = expanded.includes(rule.clientRuleId)
          return (
            <li key={rule.clientRuleId} className="rounded-xl border border-[#E2E8F0] bg-white">
              <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={open} onClick={() => onToggle(rule.clientRuleId)}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF7EF] text-[#1E8A3A]">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-[#0A0A0A]">{operation.title}</span>
                  <span className="mt-0.5 block text-sm text-[#64748B]">{peopleCount(rule.people.length)}{operation.needsDate ? ` · Vigência: ${showDate(rule.validFrom)}` : ""}</span>
                </span>
                <ChevronDown className={cn("h-4 w-4 text-[#64748B] transition-transform", open && "rotate-180")} />
              </button>
              {open ? (
                <dl className="grid gap-3 border-t border-[#F1F5F9] px-4 py-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm text-[#64748B]">Operação</dt>
                    <dd className="mt-1 font-medium text-[#0A0A0A]">{operation.title}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-[#64748B]">Novo valor</dt>
                    <dd className="mt-1 font-medium text-[#0A0A0A]">{rule.valueLabel || "Não informado"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-[#64748B]">Vigência</dt>
                    <dd className="mt-1 font-medium text-[#0A0A0A]">{operation.needsDate ? showDate(rule.validFrom) : "Sem período informado."}{rule.cycleDay ? ` · Dia ${rule.cycleDay} da sequência` : ""}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-[#64748B]">Observação</dt>
                    <dd className="mt-1 font-medium text-[#0A0A0A]">{rule.note.trim() || "Nenhuma observação informada."}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm text-[#64748B]">Funcionários</dt>
                    <dd className="mt-1 font-medium text-[#0A0A0A]">{rule.people.map((item) => item.name).join(", ")}</dd>
                  </div>
                </dl>
              ) : null}
            </li>
          )
        })}
      </ul>
      <p className="rounded-xl border border-[#F3D7A1] bg-[#FFF8EB] px-4 py-3 text-sm text-[#8A5A00]">Cada regra é gravada na hora. Se uma falhar, as anteriores desta execução permanecem salvas e as seguintes ficam na lista. Dentro de uma regra, se uma pessoa falhar, ninguém daquela regra é salvo.</p>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="button" className={modulePrimaryClass} onClick={onRun}>Executar alterações</Button>
      </div>
      </section>
    </div>
  )
}

function ConfirmDialog({
  open,
  title,
  text,
  lines,
  notice,
  confirmLabel,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  text: string
  lines: string[]
  notice: string
  confirmLabel: string
  error: string
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const pendingRef = useRef(false)
  const openedAt = useRef(0)
  const [pending, setPending] = useState(false)

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

  useEffect(() => {
    if (!open) return
    openedAt.current = Date.now()
    confirmRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pendingRef.current) onClose()
    }
    document.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(15,23,42,0.45)] p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget || Date.now() - openedAt.current < 400 || pendingRef.current) return
        onClose()
      }}
    >
      <div role="alertdialog" aria-modal="true" aria-labelledby="bulk-confirm-title" aria-describedby="bulk-confirm-text" className="w-full max-w-[520px] rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.18)] sm:p-7">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(30,138,58,0.12)]" aria-hidden>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1E8A3A] text-white shadow-[0_8px_18px_rgba(30,138,58,0.28)]">
              <Check className="h-5 w-5" strokeWidth={2.5} />
            </span>
          </span>
          <h2 id="bulk-confirm-title" className="mt-4 text-lg font-semibold text-[#0A0A0A]">{title}</h2>
          <p id="bulk-confirm-text" className="mt-1 text-sm leading-6 text-[#64748B]">{text}</p>
        </div>
        {lines.length > 0 ? (
          <ul className="mt-5 max-h-52 space-y-2 overflow-y-auto">
            {lines.map((line, index) => {
              const [title, detail] = line.split(" — ")
              return (
                <li key={`${index}-${line}`} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                  <span className="block text-sm font-semibold text-[#0A0A0A]">{title}</span>
                  {detail ? <span className="mt-0.5 block text-sm text-[#64748B]">{detail}</span> : null}
                </li>
              )
            })}
          </ul>
        ) : null}
        {notice ? (
          <p className="mt-4 flex gap-2 rounded-xl border border-[#F3D7A1] bg-[#FFF8EB] px-4 py-3 text-sm leading-6 text-[#8A5A00]">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{notice}</span>
          </p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-destructive" role="alert">{error}</p> : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} onClick={onClose} disabled={pending}>Cancelar</Button>
          <Button ref={confirmRef} type="button" className={modulePrimaryClass} pending={pending} onClick={() => void confirm()}>{confirmLabel}</Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
