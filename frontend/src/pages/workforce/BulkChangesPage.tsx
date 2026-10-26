import { FormEvent, useEffect, useState } from "react"

import { ActionForm } from "@/components/ui/action-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ListPlaceholder } from "@/components/ui/list-placeholder"
import { fieldClass } from "@/components/workforce/CatalogPanel"
import { FilterSelect, ListPager, usePagedList, type ListParams } from "@/components/workforce/list-controls"
import { createRecord, listRecords, type Employee, type NamedRecord } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { clockMethodLabel, situationLabel } from "@/utils/labels"

const operations = [
  ["job", "Cargo", "/jobs", "job_label"],
  ["journey", "Jornada", "/journeys", "journey_label"],
  ["cost_center", "Centro de custo", "/cost-centers", "cost_center_label"],
  ["team", "Equipe", "/teams", "team_label"],
  ["status", "Situação", "", "situation"],
  ["manager", "Gestor", "/employees", "manager_label"],
  ["union", "Sindicato", "/unions", "union_label"],
  ["clock_method", "Tipo de registro", "", "clock_method"],
] as const

const filterFields = [
  ["job_id", "Cargo", "/jobs"],
  ["cost_center_id", "Centro de custo", "/cost-centers"],
  ["journey_id", "Jornada", "/journeys"],
  ["team_id", "Equipe", "/teams"],
  ["sector_id", "Setor", "/sectors"],
  ["unit_id", "Unidade", "/units"],
  ["union_id", "Sindicato", "/unions"],
  ["manager_id", "Gestor", "/employees"],
] as const

type Choice = { value: string; label: string }
type Membership = { id: number; person_id: number; full_name: string; role: string }

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
    label: "full_name" in item ? item.full_name : item.name,
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
    .map((item) => ({ value: String(item.id), label: item.full_name }))
}

function currentValue(employee: Employee, operation: (typeof operations)[number][0]) {
  if (operation === "status") {
    return situationLabel[employee.situation || ""] || "Sem situação"
  }
  if (operation === "clock_method") {
    return clockMethodLabel[employee.clock_method] || employee.clock_method
  }
  const field = operations.find((item) => item[0] === operation)?.[3]
  if (!field || field === "situation" || field === "clock_method") {
    return "Não possui"
  }
  return employee[field] || "Não possui"
}

export function BulkChangesPage() {
  const role = useAuthStore((state) => state.user?.role)
  const [operation, setOperation] = useState<(typeof operations)[number][0]>("job")
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [choices, setChoices] = useState<Record<string, Choice[]>>({})
  const [selected, setSelected] = useState<number[]>([])
  const [value, setValue] = useState("")
  const [validFrom, setValidFrom] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState("")
  const [saved, setSaved] = useState(0)
  const query: ListParams = {}
  for (const [key, current] of Object.entries(filters)) {
    if (current) query[key] = current
  }
  const list = usePagedList<Employee>("/employees", query, role === "admin", saved)
  const operationRow = operations.find((item) => item[0] === operation) || operations[0]
  const valueOptions =
    operation === "status"
      ? [
          { value: "active", label: "Ativo" },
          { value: "dismissed", label: "Desligado" },
        ]
      : operation === "clock_method"
        ? Object.entries(clockMethodLabel).map(([itemValue, label]) => ({ value: itemValue, label }))
        : choices[operationRow[2]] || []

  useEffect(() => {
    if (role !== "admin") return
    let active = true
    const paths = [...new Set([...filterFields.map((item) => item[2]), ...operations.map((item) => item[2]).filter(Boolean)])]
    Promise.all(
      paths.map(async (path) => [path, path === "/employees" ? await loadManagerChoices() : await loadChoices(path)] as const),
    )
      .then((loaded) => {
        if (!active) return
        setChoices(Object.fromEntries(loaded))
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Não foi possível carregar.")
      })
    return () => {
      active = false
    }
  }, [role])

  useEffect(() => {
    setSelected([])
    setValue("")
  }, [operation, JSON.stringify(filters)])

  function toggle(id: number) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  async function markAll() {
    setError("")
    try {
      const first = await listRecords<Employee>("/employees", { page: 1, limit: 100, ...query })
      const ids = first.items.map((item) => item.id)
      const pages = Math.ceil(first.total / 100)
      for (let page = 2; page <= pages; page += 1) {
        const next = await listRecords<Employee>("/employees", { page, limit: 100, ...query })
        ids.push(...next.items.map((item) => item.id))
      }
      setSelected(ids)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível marcar.")
    }
  }

  async function apply(event: FormEvent) {
    event.preventDefault()
    setError("")
    setDone("")
    if (selected.length === 0) {
      setError("Selecione ao menos um funcionário.")
      return
    }
    const body: Record<string, unknown> = {
      employee_ids: selected,
      kind: operation,
      reference_id: null,
      label: null,
      clock_method: null,
      valid_from: null,
      note: null,
    }
    if (operation === "clock_method") {
      body.clock_method = value
    } else {
      body.valid_from = validFrom
      body.note = note.trim() || null
      if (operation === "status") body.label = value
      else body.reference_id = Number(value)
    }
    try {
      await createRecord("/employees/changes", body)
      setDone("Alteração aplicada.")
      setSelected([])
      setSaved((current) => current + 1)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível aplicar.")
    }
  }

  if (role !== "admin") {
    return <p className="text-sm text-muted-foreground">Sem permissão.</p>
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Operações em massa</h1>
      <p className="text-sm text-muted-foreground">
        Uma operação por vez. A equipe também grava o setor e a unidade. Se uma pessoa falhar, nenhuma da seleção é salva.
      </p>
      <div className="space-y-2">
        <Label htmlFor="bulk-operation">Operação</Label>
        <select
          id="bulk-operation"
          className={fieldClass}
          value={operation}
          onChange={(event) => setOperation(event.target.value as (typeof operations)[number][0])}
        >
          {operations.map(([itemValue, label]) => (
            <option key={itemValue} value={itemValue}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-3">
        {filterFields.map(([key, label, path]) => (
          <FilterSelect
            key={key}
            id={`bulk-${key}`}
            label={label}
            value={filters[key] || ""}
            options={choices[path] || []}
            onChange={(next) => setFilters((current) => ({ ...current, [key]: next }))}
          />
        ))}
        <FilterSelect
          id="bulk-situation"
          label="Situação"
          value={filters.situation || ""}
          empty="Todos"
          options={[
            { value: "active", label: "Ativo" },
            { value: "dismissed", label: "Desligado" },
          ]}
          onChange={(next) => setFilters((current) => ({ ...current, situation: next }))}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={() => markAll()}>
          Marcar todos do filtro
        </Button>
        <Button type="button" variant="ghost" onClick={() => setSelected([])}>
          Limpar seleção
        </Button>
        <p className="text-sm text-muted-foreground">{selected.length} selecionados</p>
      </div>
      {list.error ? <p className="text-sm text-destructive">{list.error}</p> : null}
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {list.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <input
              id={`bulk-person-${item.id}`}
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => toggle(item.id)}
            />
            <label htmlFor={`bulk-person-${item.id}`} className="flex-1">
              {item.full_name}
              <span className="text-muted-foreground"> · {currentValue(item, operation)}</span>
            </label>
          </li>
        ))}
        {list.items.length === 0 ? <ListPlaceholder loading={list.loading} empty="Nenhum funcionário." /> : null}
      </ul>
      <ListPager page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} onPageSize={list.setPageSize} />
      <ActionForm className="grid max-w-lg gap-3 rounded-md border border-border bg-card p-3" onSubmit={apply}>
        <div className="space-y-2">
          <Label htmlFor="bulk-value">{operation === "clock_method" ? "Novo tipo" : "Novo valor"}</Label>
          <select id="bulk-value" className={fieldClass} value={value} onChange={(event) => setValue(event.target.value)} required>
            <option value="">Selecione</option>
            {valueOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {operation === "clock_method" ? null : (
          <>
            <div className="space-y-2">
              <Label htmlFor="bulk-from">Vigência a partir de</Label>
              <input id="bulk-from" className={fieldClass} type="date" value={validFrom} onChange={(event) => setValidFrom(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-note">Observação</Label>
              <Input id="bulk-note" value={note} onChange={(event) => setNote(event.target.value)} />
            </div>
          </>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {done ? <p className="text-sm text-muted-foreground">{done}</p> : null}
        <Button type="submit">Aplicar</Button>
      </ActionForm>
    </div>
  )
}
