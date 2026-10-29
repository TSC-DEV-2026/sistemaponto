import { FormEvent, useContext, useEffect, useState } from "react"
import { Clock, Layers, Pencil, Plus } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

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
import { moduleCardClass, moduleFieldClass, moduleLabelClass, modulePrimaryClass, moduleQuietClass, moduleTextClass } from "@/components/workforce/module-visual"
import { PunchCorrectionForm, PunchLists } from "@/components/workforce/PunchDay"
import { TimeResultsPanel } from "@/components/workforce/TimeResultsPanel"
import { CatalogList, DomainTabs, TabAction } from "@/pages/workforce/EntityScreens"
import { createRecord, getHourBank, listRecords, type Employee, type HourBank, type HourBankEntry } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { hourBankEffectLabel, hourBankKindLabel, punchDay, showDate, showMinutes, showSignedMinutes } from "@/utils/labels"

export function JourneyPage() {
  return (
    <DomainTabs
      module
      title="Jornada e Ponto"
      tabs={[
        { id: "jornadas", label: "Jornadas", panel: <CatalogList catalog="journeys" presentation="journey" /> },
        { id: "marcacoes", label: "Marcações", panel: <PunchScheduleList /> },
        { id: "apuracao", label: "Apuração", panel: <ResultsSchedule /> },
        { id: "banco", label: "Banco de horas", panel: <BankScheduleList /> },
      ]}
    />
  )
}

function PunchScheduleList() {
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin"
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const setTabAction = useContext(TabAction)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    if (!isAdmin) {
      setTabAction(null)
      return () => setTabAction(null)
    }
    setTabAction(
      <Button asChild className={modulePrimaryClass}>
        <Link to="/schedules/adjustments">
          <Pencil className="h-4 w-4" />
          Ajustar marcações
        </Link>
      </Button>,
    )
    return () => setTabAction(null)
  }, [isAdmin, setTabAction])

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
      <PunchLists employees={employees} appearance="module" />
    </div>
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
      <TimeResultsPanel employees={employees} heading={false} appearance="module" />
    </div>
  )
}

function BankBalance({ balance }: { balance: HourBank }) {
  const stats = [
    { label: "Crédito", value: showMinutes(balance.credit_minutes), dot: "bg-[#1E8A3A]" },
    { label: "Débito", value: showMinutes(balance.debit_minutes), dot: "bg-[#EF5350]" },
    { label: "Pago em hora extra", value: showMinutes(balance.paid_overtime_minutes), dot: "bg-[#3B82F6]" },
    { label: "Descontado como falta", value: showMinutes(balance.discounted_absence_minutes), dot: "bg-[#F9A825]" },
  ]
  return (
    <div className="rounded-[14px] border border-[rgba(30,138,58,0.12)] bg-[linear-gradient(105deg,rgba(30,138,58,0.045),rgba(255,255,255,0.98))] p-5 shadow-[0_6px_18px_rgba(15,23,42,0.04)] sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-4 lg:w-[240px] lg:shrink-0 lg:border-r lg:border-[#E4E8ED] lg:pr-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]">
            <Clock className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] text-[#52525B]">Saldo atual</p>
            <p className="mt-0.5 text-[26px] font-bold leading-none tabular-nums text-[#0A0A0A]">{showSignedMinutes(balance.balance_minutes)}</p>
          </div>
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-5 border-t border-[#E7EBE4] pt-5 sm:grid-cols-4 lg:border-t-0 lg:pt-0">
          {stats.map((item) => (
            <div key={item.label} className="min-w-0">
              <p className="flex items-start gap-1.5 text-[13px] leading-5 text-[#52525B]">
                <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", item.dot)} aria-hidden />
                <span>{item.label}</span>
              </p>
              <p className="mt-1 text-[15px] font-semibold tabular-nums text-[#0A0A0A]">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
      {balance.warning ? <p className="mt-4 text-sm text-brand-ink">{balance.warning}</p> : null}
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
        <Link to="/schedules/hour-bank/new">
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
      <div className="grid gap-4 sm:grid-cols-2">
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
            options={[{ value: "", label: "Todos" }, ...Object.entries(hourBankKindLabel).map(([optionValue, label]) => ({ value: optionValue, label }))]}
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
    if (!role || role === "admin") return
    navigate("/schedules?aba=marcacoes", { replace: true })
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
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.14em] text-brand-cta">MARCAÇÕES</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-ink">Ajustar marcações</h2>
          <p className="mt-1 text-sm text-brand-quiet">Corrija as marcações que valem em um dia.</p>
        </div>
        <BackLink to="/schedules?aba=marcacoes" appearance="detail" />
      </div>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4">
        <PunchCorrectionForm
          appearance="module"
          employees={employees}
          onSaved={async () => {
            navigate("/schedules?aba=marcacoes")
          }}
        />
      </div>
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
  const [balance, setBalance] = useState<HourBank | null>(null)
  const [kind, setKind] = useState("settlement")
  const [minutes, setMinutes] = useState("")
  const [entryOn, setEntryOn] = useState(punchDay(new Date().toISOString()))
  const [note, setNote] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!role || canLaunch) return
    navigate("/schedules?aba=banco", { replace: true })
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
      .catch(() => {
        if (active) setBalance(null)
      })
    return () => {
      active = false
    }
  }, [employeeId])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      await createRecord("/hour-bank-entries", {
        employee_id: Number(employeeId),
        kind,
        minutes: Number(minutes),
        entry_on: entryOn,
        note: note.trim() || null,
      })
      navigate("/schedules?aba=banco")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível lançar.")
    }
  }

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.14em] text-brand-cta">BANCO DE HORAS</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-ink">Novo lançamento</h2>
          <p className="mt-1 text-sm text-brand-quiet">Registre uma quitação, um crédito ou um débito.</p>
        </div>
        <BackLink to="/schedules?aba=banco" appearance="detail" />
      </div>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <ActionForm className={cn(moduleCardClass, "mt-4 space-y-5")} onSubmit={onSubmit}>
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
          <SiteSelect id="entry-kind" value={kind} options={Object.entries(hourBankKindLabel).map(([value, label]) => ({ value, label }))} onChange={setKind} />
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="entry-minutes">
              Minutos
            </Label>
            <Input id="entry-minutes" className={moduleFieldClass} inputMode="numeric" value={minutes} onChange={(event) => setMinutes(event.target.value)} required />
          </div>
          <DatePickerField id="entry-day" label="Data" value={entryOn} onChange={setEntryOn} required />
        </div>
        {kind === "settlement" && balance && balance.balance_minutes !== 0 ? (
          <Button type="button" variant="outline" className={moduleQuietClass} onClick={() => setMinutes(String(Math.abs(balance.balance_minutes)))}>
            Quitar o saldo inteiro
          </Button>
        ) : null}
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
