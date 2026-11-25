import { useContext, useEffect, useState } from "react"
import { CircleCheck, Clock, Layers, Minus, Pencil, Plus, Scale, Trash2, X } from "lucide-react"
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom"

import { ActionTip } from "@/components/ui/action-tip"
import { DatePickerField } from "@/components/ui/date-picker-field"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { DurationField } from "@/components/ui/duration-field"
import { SiteSelect } from "@/components/ui/site-select"
import { Label } from "@/components/ui/label"
import { ListPlaceholder } from "@/components/ui/list-placeholder"
import { cn } from "@/utils/cn"
import { ListPager, usePagedList } from "@/components/workforce/list-controls"
import { EmployeeCombobox } from "@/components/workforce/employee-combobox"
import { moduleCardClass, moduleDangerClass, moduleDangerIconClass, moduleFieldClass, moduleIconClass, moduleLabelClass, modulePrimaryClass, moduleQuietClass, moduleTextClass } from "@/components/workforce/module-visual"
import { BankBalance } from "@/components/workforce/HourBankPanel"
import { PunchCorrectionForm } from "@/components/workforce/PunchDay"
import { CalculationsPanel } from "@/components/workforce/TimeResultsPanel"
import { DomainTabs, TabAction } from "@/pages/workforce/EntityScreens"
import { ClosingsPage } from "@/pages/workforce/OperationsPages"
import { createRecord, getHourBank, getRecord, listRecords, removeRecord, updateRecord, type Employee, type HourBank, type HourBankEntry } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { toastError } from "@/store/toast.store"
import { canonicalTab } from "@/route-slugs"
import { conceptIcon } from "@/utils/concept-icons"
import { durationMinutes, hourBankEffectLabel, hourBankEntryAmount, hourBankKindLabel, hourBankKindOrder, punchDay, showDate, showMinutes, signedDurationMinutes } from "@/utils/labels"

export function JourneyPage() {
  const [params] = useSearchParams()
  const tab = canonicalTab(params.get("tab") || params.get("aba"))
  if (tab === "journeys") return <Navigate to="/staff?tab=journeys" replace />
  return (
    <DomainTabs
      module
      title="Ponto"
      tabs={[
        { id: "calculations", label: "Apurações", icon: conceptIcon.result, panel: <ResultsSchedule /> },
        { id: "hour-bank", label: "Banco de horas", icon: conceptIcon.hourBank, panel: <BankScheduleList /> },
        { id: "closings", label: "Fechamento", icon: conceptIcon.closing, panel: <ClosingsPage /> },
      ]}
    />
  )
}

function ResultsSchedule() {
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [employees, setEmployees] = useState<Employee[]>([])

  useEffect(() => {
    let active = true
    listRecords<Employee>("/employees", { page: 1, limit: 100 })
      .then((page) => {
        if (active) setEmployees(page.items)
      })
      .catch((caught: unknown) => {
        if (active) toastError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      })
    return () => {
      active = false
    }
  }, [tenantId])

  return (
    <div className="space-y-3">
      <CalculationsPanel employees={employees} heading={false} appearance="module" />
    </div>
  )
}

function BankScheduleList() {
  const role = useAuthStore((state) => state.user?.role)
  const canLaunch = role === "admin" || role === "manager"
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const setTabAction = useContext(TabAction)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeesReady, setEmployeesReady] = useState(false)
  const [employeeId, setEmployeeId] = useState("")
  const [kind, setKind] = useState("")
  const [balance, setBalance] = useState<HourBank | null>(null)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [removing, setRemoving] = useState(false)
  const entries = usePagedList<HourBankEntry>("/hour-bank-entries", {
    ...(employeeId ? { employee_id: Number(employeeId) } : {}),
    ...(kind ? { kind } : {}),
  })

  useEffect(() => {
    if (!canLaunch) {
      setTabAction(null)
      return () => setTabAction(null)
    }
    setTabAction(
      <Button asChild className={modulePrimaryClass}>
        <Link to="/hour-bank-entries/new">
          <Plus className="h-4 w-4" />
          Novo lançamento
        </Link>
      </Button>,
    )
    return () => setTabAction(null)
  }, [canLaunch, setTabAction])

  useEffect(() => {
    let active = true
    setEmployeesReady(false)
    listRecords<Employee>("/employees", { page: 1, limit: 100 })
      .then((page) => {
        if (!active) return
        setEmployees(page.items)
        setEmployeesReady(true)
      })
      .catch(() => {
        if (!active) return
        setEmployees([])
        setEmployeesReady(true)
      })
    return () => {
      active = false
    }
  }, [tenantId])

  useEffect(() => {
    if (!employeeId) {
      setBalance(null)
      return
    }
    let active = true
    getHourBank(Number(employeeId))
      .then((row) => {
        if (active) setBalance(row)
      })
      .catch((caught: unknown) => {
        if (active) {
          setBalance(null)
          toastError(caught instanceof Error ? caught.message : "Não foi possível consultar o saldo.")
        }
      })
    return () => {
      active = false
    }
  }, [employeeId])

  function nameOf(id: number) {
    return employees.find((item) => item.id === id)?.full_name || "Não informado"
  }

  async function removeEntry(id: number) {
    setRemoving(true)
    try {
      await removeRecord("/hour-bank-entries", id)
    } catch {
      // O interceptor já avisou o erro.
      setRemoving(false)
      return
    }
    setPendingId(null)
    entries.reload()
    try {
      if (employeeId) {
        const row = await getHourBank(Number(employeeId))
        setBalance(row)
      }
    } catch (caught: unknown) {
      toastError(caught instanceof Error ? caught.message : "Não foi possível consultar o saldo.")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <section className="rounded-xl border border-ui-line-soft bg-white p-5 shadow-[0_8px_24px_rgb(var(--ui-shadow)/0.04)] sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-brand-ink">Banco de horas</h2>
        <p className="mt-1 text-sm text-brand-quiet">Consulte os lançamentos do banco.</p>
      </div>
      <div className="mt-[18px] grid gap-4 sm:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <Label className="font-semibold text-brand-ink" htmlFor="bank-schedule-employee">
            Funcionário
          </Label>
          <EmployeeCombobox
            id="bank-schedule-employee"
            value={employeeId}
            employees={employees}
            emptyLabel="Todos"
            extendSearch={employees.length >= 100}
            onChange={setEmployeeId}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label className="font-semibold text-brand-ink" htmlFor="bank-schedule-kind">
            Tipo
          </Label>
          <SiteSelect
            id="bank-schedule-kind"
            value={kind}
            icon={Layers}
            options={[{ value: "", label: "Todos" }, ...hourBankKindOrder.map((optionValue) => ({ value: optionValue, label: hourBankKindLabel[optionValue] }))]}
            onChange={setKind}
          />
        </div>
      </div>
      {balance ? (
        <div className="mt-5">
          <BankBalance balance={balance} />
        </div>
      ) : null}
      {entries.items.length > 0 && !employeesReady ? (
        <ul className="mt-8">
          <ListPlaceholder loading empty="Nenhum lançamento." />
        </ul>
      ) : null}
      {entries.items.length === 0 && !entries.error ? (
        entries.loading ? (
          <ul className="mt-8">
            <ListPlaceholder loading empty="Nenhum lançamento." />
          </ul>
        ) : (
          <div className="mt-5 rounded-xl border border-ui-line bg-white px-6 py-10 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-cta/8 text-brand-cta">
              <Clock className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-ui-ink">Nenhum lançamento.</p>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-brand-muted">Selecione um funcionário e, se desejar, um tipo para visualizar os registros do banco de horas.</p>
          </div>
        )
      ) : null}
      {entries.items.length > 0 && employeesReady ? (
        <ul className="mt-5 divide-y divide-[rgb(var(--ui-panel))] overflow-hidden rounded-xl border border-ui-line">
          {entries.items.map((item) => {
            const person = nameOf(item.employee_id)
            const summary = `${person} · ${showDate(item.entry_on)} · ${hourBankKindLabel[item.kind] || item.kind} · ${hourBankEntryAmount(item.kind, item.minutes, item.effect)}`
            return (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-brand-ink">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{summary}</p>
                  {item.effect || item.note ? (
                    <p className="mt-0.5 truncate text-ui-slate">
                      {item.effect ? hourBankEffectLabel[item.effect] || item.effect : ""}
                      {item.effect && item.note ? " · " : ""}
                      {item.note || ""}
                    </p>
                  ) : null}
                </div>
                {canLaunch ? (
                  pendingId === item.id ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button type="button" className={moduleDangerClass} disabled={removing} onClick={() => removeEntry(item.id)}>
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
                      <Button type="button" variant="outline" className={moduleQuietClass} disabled={removing} onClick={() => setPendingId(null)}>
                        <X className="h-4 w-4" />
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 gap-1.5">
                      <ActionTip label="Editar">
                        <Button asChild variant="outline" className={moduleIconClass}>
                          <Link to={`/hour-bank-entries/${item.id}/edit`} aria-label={`Editar lançamento de ${person}`}>
                            <Pencil className="h-4 w-4" strokeWidth={1.75} />
                          </Link>
                        </Button>
                      </ActionTip>
                      <ActionTip label="Excluir">
                        <Button type="button" variant="outline" className={moduleDangerIconClass} aria-label={`Excluir lançamento de ${person}`} onClick={() => setPendingId(item.id)}>
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                        </Button>
                      </ActionTip>
                    </div>
                  )
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
      {entries.total > 0 && employeesReady ? (
        <div className="mt-4 border-t border-ui-panel pt-4">
          <ListPager page={entries.page} pageSize={entries.pageSize} total={entries.total} onPage={entries.setPage} onPageSize={entries.setPageSize} tone="module" />
        </div>
      ) : null}
    </section>
  )
}

export function PunchAdjustPage() {
  const role = useAuthStore((state) => state.user?.role)
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const navigate = useNavigate()
  const [employees, setEmployees] = useState<Employee[]>([])

  useEffect(() => {
    if (!role || role === "admin" || role === "manager") return
    navigate("/timekeeping?tab=calculations", { replace: true })
  }, [role, navigate])

  useEffect(() => {
    let active = true
    listRecords<Employee>("/employees", { page: 1, limit: 100 })
      .then((page) => {
        if (active) setEmployees(page.items)
      })
      .catch((caught: unknown) => {
        if (active) toastError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      })
    return () => {
      active = false
    }
  }, [tenantId])

  return (
    <div className="w-full min-w-0 space-y-5">
      <BackLink to="/timekeeping?tab=calculations" appearance="detail" />
      <PunchCorrectionForm
        appearance="module"
        employees={employees}
        onSaved={async () => {
          navigate("/timekeeping?tab=calculations")
        }}
      />
    </div>
  )
}

const launchButtons: { kind: "credit" | "debit" | "balance" | "settlement"; label: string; icon: typeof Plus; primary?: boolean }[] = [
  { kind: "credit", label: "Somar", icon: Plus },
  { kind: "debit", label: "Diminuir", icon: Minus },
  { kind: "balance", label: "Lançar saldo", icon: Scale },
  { kind: "settlement", label: "Quitar o saldo", icon: CircleCheck, primary: true },
]

function entryMinutesInput(entry: HourBankEntry) {
  if (entry.kind === "settlement" || entry.minutes === 0) return "00:00"
  if (entry.kind === "balance" && entry.effect === "debit") return showMinutes(-entry.minutes)
  return showMinutes(entry.minutes)
}

export function HourBankEntryPage() {
  const role = useAuthStore((state) => state.user?.role)
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const navigate = useNavigate()
  const params = useParams()
  const entryId = params.id ? Number(params.id) : 0
  const editing = Number.isInteger(entryId) && entryId > 0
  const canLaunch = role === "admin" || role === "manager"
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeId, setEmployeeId] = useState("")
  const [minutes, setMinutes] = useState("")
  const [entryOn, setEntryOn] = useState(punchDay(new Date().toISOString()))
  const [note, setNote] = useState("")
  const [blocked, setBlocked] = useState(false)
  const [loading, setLoading] = useState(editing)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!role || canLaunch) return
    navigate("/timekeeping?tab=hour-bank", { replace: true })
  }, [role, canLaunch, navigate])

  useEffect(() => {
    let active = true
    listRecords<Employee>("/employees", { page: 1, limit: 100 })
      .then((page) => {
        if (active) setEmployees(page.items.filter((item) => item.hour_bank))
      })
      .catch((caught: unknown) => {
        if (active) toastError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      })
    return () => {
      active = false
    }
  }, [tenantId])

  useEffect(() => {
    if (!editing) return
    let active = true
    setLoading(true)
    getRecord<HourBankEntry>("/hour-bank-entries", entryId)
      .then((row) => {
        if (!active) return
        if (row.closing_id) {
          setBlocked(true)
          toastError("Altere este lançamento pelo fechamento.")
          return
        }
        setEmployeeId(String(row.employee_id))
        setEntryOn(row.entry_on)
        setMinutes(entryMinutesInput(row))
        setNote(row.note || "")
      })
      .catch((caught: unknown) => {
        if (!active) return
        setBlocked(true)
        toastError(caught instanceof Error ? caught.message : "Não foi possível carregar.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [editing, entryId])

  async function launch(kind: "credit" | "debit" | "balance" | "settlement") {
    if (!employeeId) {
      toastError("Selecione o funcionário.")
      return
    }
    const body: Record<string, unknown> = {
      kind,
      entry_on: entryOn,
      note: note.trim() || null,
    }
    if (kind !== "settlement") {
      const amount = kind === "balance" ? signedDurationMinutes(minutes) : durationMinutes(minutes)
      if (amount === null) {
        toastError(kind === "balance" ? "Informe o saldo no formato 00:00. Use o sinal de menos para saldo negativo." : minutes.trim().startsWith("-") ? "Somar e diminuir não usam sinal. Para deixar o saldo neste valor, use Lançar saldo." : "Informe as horas no formato 00:00.")
        return
      }
      body.minutes = amount
    }
    setPending(true)
    try {
      if (editing) {
        await updateRecord("/hour-bank-entries", entryId, body)
      } else {
        await createRecord("/hour-bank-entries", { ...body, employee_id: Number(employeeId) })
      }
      navigate("/timekeeping?tab=hour-bank")
    } catch {
      // O interceptor já avisou o erro.
    } finally {
      setPending(false)
    }
  }

  const locked = loading || Boolean(blocked && editing && !employeeId)

  return (
    <div className="w-full min-w-0 space-y-5">
      <BackLink to="/timekeeping?tab=hour-bank" appearance="detail" />
      <section className={cn(moduleCardClass, "space-y-5")}>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-ui-ink-strong">{editing ? "Editar lançamento" : "Novo lançamento"}</h2>
          <p className="mt-1 text-sm text-ui-slate">Some, diminua, lance o saldo ou quite o saldo.</p>
        </div>
        <div className="space-y-2">
          <Label className={moduleLabelClass} htmlFor="entry-employee">
            Funcionário
          </Label>
          {editing ? (
            <input id="entry-employee" className={moduleFieldClass} value={employees.find((item) => String(item.id) === employeeId)?.full_name || "Não informado"} readOnly />
          ) : (
            <EmployeeCombobox id="entry-employee" value={employeeId} employees={employees} emptyLabel="Selecione" required extendSearch={employees.length >= 100} onChange={setEmployeeId} />
          )}
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="entry-minutes">
              Horas
            </Label>
            <DurationField id="entry-minutes" className={moduleFieldClass} value={minutes} onValueChange={setMinutes} signed disabled={pending || locked} />
          </div>
          <DatePickerField id="entry-day" label="Data" value={entryOn} onChange={setEntryOn} required disabled={pending || locked} />
        </div>
        <div className="space-y-2">
          <Label className={moduleLabelClass} htmlFor="entry-note">
            Observação
          </Label>
          <textarea id="entry-note" className={moduleTextClass} value={note} disabled={pending || locked} onChange={(event) => setNote(event.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {launchButtons.map((item) => {
            const Icon = item.icon
            return (
              <Button key={item.kind} type="button" variant={item.primary ? "default" : "outline"} className={item.primary ? modulePrimaryClass : cn(moduleQuietClass, "h-11 px-4")} disabled={pending || locked} onClick={() => launch(item.kind)}>
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
