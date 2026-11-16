import { FormEvent, useContext, useEffect, useState } from "react"
import { Clock, Layers, Plus } from "lucide-react"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { DatePickerField } from "@/components/ui/date-picker-field"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { SiteSelect } from "@/components/ui/site-select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ListPlaceholder } from "@/components/ui/list-placeholder"
import { cn } from "@/utils/cn"
import { ListPager, usePagedList } from "@/components/workforce/list-controls"
import { EmployeeCombobox } from "@/components/workforce/employee-combobox"
import { moduleCardClass, moduleFieldClass, moduleLabelClass, modulePrimaryClass, moduleTextClass } from "@/components/workforce/module-visual"
import { BankBalance } from "@/components/workforce/HourBankPanel"
import { PunchCorrectionForm } from "@/components/workforce/PunchDay"
import { CalculationsPanel } from "@/components/workforce/TimeResultsPanel"
import { DomainTabs, TabAction } from "@/pages/workforce/EntityScreens"
import { ClosingsPage } from "@/pages/workforce/OperationsPages"
import { createRecord, getHourBank, listRecords, type Employee, type HourBank, type HourBankEntry } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { canonicalTab } from "@/route-slugs"
import { conceptIcon } from "@/utils/concept-icons"
import { durationMinutes, hourBankEffectLabel, hourBankKindLabel, hourBankLaunchLabel, maskDuration, punchDay, showDate, showMinutes } from "@/utils/labels"

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
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    listRecords<Employee>("/employees", { page: 1, limit: 100 })
      .then((page) => {
        if (active) setEmployees(page.items)
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      })
    return () => {
      active = false
    }
  }, [tenantId])

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
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
  const [employeeId, setEmployeeId] = useState("")
  const [kind, setKind] = useState("")
  const [balance, setBalance] = useState<HourBank | null>(null)
  const [balanceError, setBalanceError] = useState("")
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
    listRecords<Employee>("/employees", { page: 1, limit: 100 })
      .then((page) => {
        if (active) setEmployees(page.items)
      })
      .catch(() => {
        if (active) setEmployees([])
      })
    return () => {
      active = false
    }
  }, [tenantId])

  useEffect(() => {
    if (!employeeId) {
      setBalance(null)
      setBalanceError("")
      return
    }
    let active = true
    getHourBank(Number(employeeId))
      .then((row) => {
        if (active) {
          setBalance(row)
          setBalanceError("")
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setBalance(null)
          setBalanceError(caught instanceof Error ? caught.message : "Não foi possível consultar o saldo.")
        }
      })
    return () => {
      active = false
    }
  }, [employeeId])

  function nameOf(id: number) {
    return employees.find((item) => item.id === id)?.full_name || String(id)
  }

  return (
    <section className="rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-6">
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
            options={[{ value: "", label: "Todos" }, ...Object.entries(hourBankLaunchLabel).map(([optionValue, label]) => ({ value: optionValue, label }))]}
            onChange={setKind}
          />
        </div>
      </div>
      {balance ? (
        <div className="mt-5">
          <BankBalance balance={balance} />
        </div>
      ) : null}
      {balanceError ? <p className="mt-4 text-sm text-destructive">{balanceError}</p> : null}
      {entries.error ? <p className="mt-4 text-sm text-destructive">{entries.error}</p> : null}
      {entries.items.length === 0 && !entries.error ? (
        entries.loading ? (
          <ul className="mt-8">
            <ListPlaceholder loading empty="Nenhum lançamento." />
          </ul>
        ) : (
          <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-white px-6 py-10 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(30,138,58,0.08)] text-[#1E8A3A]">
              <Clock className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-[#0A0A0A]">Nenhum lançamento.</p>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#52525B]">Selecione um funcionário e, se desejar, um tipo para visualizar os registros do banco de horas.</p>
          </div>
        )
      ) : null}
      {entries.items.length > 0 ? (
        <ul className="mt-5 divide-y divide-[#F0F0F2] overflow-hidden rounded-xl border border-[#E2E8F0]">
          {entries.items.map((item) => (
            <li key={item.id} className="px-4 py-3 text-sm text-brand-ink">
              {nameOf(item.employee_id)} · {showDate(item.entry_on)} · {hourBankKindLabel[item.kind] || item.kind} · {showMinutes(item.minutes)}
              {item.effect ? ` · ${hourBankEffectLabel[item.effect] || item.effect}` : ""}
              {item.note ? ` · ${item.note}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {entries.total > 0 ? (
        <div className="mt-4 border-t border-[#F0F0F2] pt-4">
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
  const [error, setError] = useState("")

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
        if (active) setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      })
    return () => {
      active = false
    }
  }, [tenantId])

  return (
    <div className="w-full min-w-0 space-y-5">
      <BackLink to="/timekeeping?tab=calculations" appearance="detail" />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
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

export function HourBankEntryPage() {
  const role = useAuthStore((state) => state.user?.role)
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const navigate = useNavigate()
  const canLaunch = role === "admin" || role === "manager"
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeId, setEmployeeId] = useState("")
  const [kind, setKind] = useState("credit")
  const [minutes, setMinutes] = useState("")
  const [entryOn, setEntryOn] = useState(punchDay(new Date().toISOString()))
  const [note, setNote] = useState("")
  const [error, setError] = useState("")

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
        if (active) setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      })
    return () => {
      active = false
    }
  }, [tenantId])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    const amount = durationMinutes(minutes)
    if (amount === null) {
      setError("Informe as horas no formato 00:00.")
      return
    }
    try {
      await createRecord("/hour-bank-entries", {
        employee_id: Number(employeeId),
        kind,
        minutes: amount,
        entry_on: entryOn,
        note: note.trim() || null,
      })
      navigate("/timekeeping?tab=hour-bank")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível lançar.")
    }
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <BackLink to="/timekeeping?tab=hour-bank" appearance="detail" />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ActionForm className={cn(moduleCardClass, "space-y-5")} onSubmit={onSubmit}>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-[#111827]">Novo lançamento</h2>
          <p className="mt-1 text-sm text-[#64748B]">Registre um crédito ou um débito.</p>
        </div>
        <div className="space-y-2">
          <Label className={moduleLabelClass} htmlFor="entry-employee">
            Funcionário
          </Label>
          <EmployeeCombobox id="entry-employee" value={employeeId} employees={employees} emptyLabel="Selecione" required extendSearch={employees.length >= 100} onChange={setEmployeeId} />
        </div>
        <div className="space-y-2">
          <Label className={moduleLabelClass} htmlFor="entry-kind">
            Lançamento
          </Label>
          <SiteSelect id="entry-kind" value={kind} options={Object.entries(hourBankLaunchLabel).map(([value, label]) => ({ value, label }))} onChange={setKind} />
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="entry-minutes">
              Horas
            </Label>
            <Input id="entry-minutes" className={moduleFieldClass} inputMode="numeric" placeholder="00:00" value={minutes} onChange={(event) => setMinutes(maskDuration(event.target.value))} required />
          </div>
          <DatePickerField id="entry-day" label="Data" value={entryOn} onChange={setEntryOn} required />
        </div>
        <div className="space-y-2">
          <Label className={moduleLabelClass} htmlFor="entry-note">
            Observação
          </Label>
          <textarea id="entry-note" className={moduleTextClass} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <Button type="submit" className={modulePrimaryClass}>
          Lançar
        </Button>
      </ActionForm>
    </div>
  )
}
