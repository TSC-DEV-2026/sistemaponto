import { FormEvent, useContext, useEffect, useState } from "react"
import { Pencil, Plus } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fieldClass } from "@/components/workforce/CatalogPanel"
import { FilterSelect, ListPager, usePagedList } from "@/components/workforce/list-controls"
import { PunchCorrectionForm, PunchLists } from "@/components/workforce/PunchDay"
import { TimeResultsPanel } from "@/components/workforce/TimeResultsPanel"
import { CatalogList, DomainTabs, TabAction } from "@/pages/workforce/EntityScreens"
import { createRecord, getHourBank, listRecords, type Employee, type HourBank, type HourBankEntry } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { hourBankEffectLabel, hourBankKindLabel, punchDay, showDate, showMinutes, showSignedMinutes } from "@/utils/labels"

export function JourneyPage() {
  return (
    <DomainTabs
      title="Jornada e Ponto"
      lead="Jornada é o previsto. Marcação é o ocorrido. Apuração é o resultado do período. O banco de horas guarda o saldo."
      tabs={[
        { id: "jornadas", label: "Jornadas", panel: <CatalogList catalog="journeys" /> },
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
      <Button asChild>
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
      <PunchLists employees={employees} />
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
      <TimeResultsPanel employees={employees} heading={false} />
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
      <Button asChild>
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
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        O saldo é contínuo e não tem limite. O prazo é de 6 meses e, neste corte, só avisa quando vai expirar. Saldo positivo quitado sai como hora extra. Saldo negativo quitado desconta como falta.
      </p>
      <div className="flex flex-wrap gap-3">
        <FilterSelect
          id="bank-schedule-employee"
          label="Funcionário"
          value={employeeId}
          options={employees.map((item) => ({ value: String(item.id), label: item.full_name }))}
          onChange={setEmployeeId}
        />
        <FilterSelect
          id="bank-schedule-kind"
          label="Tipo"
          value={kind}
          options={Object.entries(hourBankKindLabel).map(([value, label]) => ({ value, label }))}
          onChange={setKind}
        />
      </div>
      {balance ? (
        <div className="rounded-md border border-border bg-card px-4 py-3 text-sm">
          <p>Saldo {showSignedMinutes(balance.balance_minutes)}</p>
          <p className="mt-1 text-muted-foreground">
            Crédito {showMinutes(balance.credit_minutes)} · Débito {showMinutes(balance.debit_minutes)} · Pago em hora extra {showMinutes(balance.paid_overtime_minutes)} · Descontado como falta {showMinutes(balance.discounted_absence_minutes)}
          </p>
          {balance.warning ? <p className="mt-2">{balance.warning}</p> : null}
        </div>
      ) : null}
      {balanceError ? <p className="text-sm text-destructive">{balanceError}</p> : null}
      {entries.error ? <p className="text-sm text-destructive">{entries.error}</p> : null}
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {entries.items.map((item) => (
          <li key={item.id} className="px-4 py-3 text-sm">
            {nameOf(item.employee_id)} · {showDate(item.entry_on)} · {hourBankKindLabel[item.kind] || item.kind} · {showMinutes(item.minutes)}
            {item.effect ? ` · ${hourBankEffectLabel[item.effect] || item.effect}` : ""}
            {item.note ? ` · ${item.note}` : ""}
          </li>
        ))}
        {entries.items.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhum lançamento.</li> : null}
      </ul>
      <ListPager page={entries.page} pageSize={entries.pageSize} total={entries.total} onPage={entries.setPage} onPageSize={entries.setPageSize} />
    </div>
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
    <div className="mx-auto max-w-lg space-y-4">
      <BackLink to="/schedules?aba=marcacoes" />
      <h1 className="text-xl font-semibold">Ajustar marcações</h1>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <PunchCorrectionForm
        employees={employees}
        onSaved={async () => {
          navigate("/schedules?aba=marcacoes")
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
    <div className="mx-auto max-w-lg space-y-4">
      <BackLink to="/schedules?aba=banco" />
      <h1 className="text-xl font-semibold">Novo lançamento</h1>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ActionForm className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="entry-employee">Funcionário</Label>
          <select id="entry-employee" className={fieldClass} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} required>
            <option value="">Selecione</option>
            {employees.map((item) => (
              <option key={item.id} value={item.id}>
                {item.full_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="entry-kind">Lançamento</Label>
          <select id="entry-kind" className={fieldClass} value={kind} onChange={(event) => setKind(event.target.value)}>
            {Object.entries(hourBankKindLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="entry-minutes">Minutos</Label>
          <Input id="entry-minutes" inputMode="numeric" value={minutes} onChange={(event) => setMinutes(event.target.value)} required />
        </div>
        {kind === "settlement" && balance && balance.balance_minutes !== 0 ? (
          <Button type="button" variant="outline" onClick={() => setMinutes(String(Math.abs(balance.balance_minutes)))}>
            Quitar o saldo inteiro
          </Button>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="entry-day">Data</Label>
          <input id="entry-day" className={fieldClass} type="date" value={entryOn} onChange={(event) => setEntryOn(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="entry-note">Observação</Label>
          <Input id="entry-note" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <Button type="submit">Lançar</Button>
      </ActionForm>
    </div>
  )
}
