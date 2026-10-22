import { createContext, FormEvent, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { Eye, Pencil, Plus, QrCode, Save, Trash2 } from "lucide-react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fieldClass, optionsOf, type CatalogField } from "@/components/workforce/CatalogPanel"
import { FilterSelect, ListPager, ListSearch, usePagedList, type ListParams } from "@/components/workforce/list-controls"
import { createRecord, getRecord, listQrCards, removeRecord, updateRecord, type Employee, type NamedRecord } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { formatCpf, onlyDigits } from "@/utils/digits"
import { clockMethodLabel, showDate, situationLabel } from "@/utils/labels"
import { catalogs } from "@/pages/workforce/catalogs"
import { qrCardsPdf } from "@/utils/qr-cards-pdf"

const TabAction = createContext<(node: ReactNode) => void>(() => {})

type ListSelect = {
  key: string
  label: string
  options: { value: string; label: string }[]
  valueType?: "string" | "number" | "boolean"
}

function selectedFilters(selects: ListSelect[], chosen: Record<string, string>): ListParams {
  const params: ListParams = {}
  for (const select of selects) {
    const raw = chosen[select.key]
    if (!raw) continue
    if (select.valueType === "number") params[select.key] = Number(raw)
    else if (select.valueType === "boolean") params[select.key] = raw === "true"
    else params[select.key] = raw
  }
  return params
}

type Row = { id: number }

function blankForm(fields: CatalogField[]) {
  const next: Record<string, string> = {}
  for (const field of fields) {
    next[field.name] = field.type === "checkbox" ? "true" : ""
  }
  return next
}

function bodyFrom(fields: CatalogField[], form: Record<string, string>, kind?: string) {
  const body: Record<string, unknown> = {}
  if (kind) {
    body.kind = kind
  }
  for (const field of fields) {
    const raw = form[field.name] ?? ""
    if (field.type === "checkbox") {
      body[field.name] = raw === "true"
    } else if (field.name.endsWith("_id")) {
      body[field.name] = raw ? Number(raw) : null
    } else {
      body[field.name] = raw.trim() ? raw.trim() : null
    }
  }
  return body
}

export function DomainTabs({
  title,
  lead,
  tabs,
}: {
  title: string
  lead: string
  tabs: { id: string; label: string; panel: ReactNode }[]
}) {
  const [params, setParams] = useSearchParams()
  const [action, setAction] = useState<ReactNode>(null)
  const requested = params.get("aba")
  const current = tabs.some((tab) => tab.id === requested) ? requested : tabs[0].id
  const selected = tabs.find((tab) => tab.id === current) ?? tabs[0]

  return (
    <TabAction.Provider value={setAction}>
      <div className="mx-auto max-w-3xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{lead}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Button key={tab.id} type="button" size="sm" variant={tab.id === current ? "default" : "outline"} onClick={() => setParams(tab.id === tabs[0].id ? {} : { aba: tab.id })}>
                {tab.label}
              </Button>
            ))}
          </div>
          {action}
        </div>
        {selected.panel}
      </div>
    </TabAction.Provider>
  )
}

export function RecordList<T extends Row>({
  path,
  filters,
  selects = [],
  newTo,
  newLabel,
  viewTo,
  editTo,
  nameOf,
  detailOf,
  empty,
  extra = null,
}: {
  path: string
  filters?: (query: string) => ListParams
  selects?: ListSelect[]
  newTo: string
  newLabel: string
  viewTo: (id: number) => string
  editTo: (id: number) => string
  nameOf: (item: T) => string
  detailOf?: (item: T) => string
  empty: string
  extra?: ReactNode
}) {
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin"
  const setTabAction = useContext(TabAction)
  const [query, setQuery] = useState("")
  const [chosen, setChosen] = useState<Record<string, string>>({})
  const [pending, setPending] = useState<number | null>(null)
  const list = usePagedList<T>(path, {
    ...(filters ? filters(query) : query.trim() ? { name: query.trim() } : {}),
    ...selectedFilters(selects, chosen),
  })

  useEffect(() => {
    const create = isAdmin ? (
      <Button asChild>
        <Link to={newTo}>
          <Plus className="h-4 w-4" />
          {newLabel}
        </Link>
      </Button>
    ) : null
    if (!create && !extra) {
      setTabAction(null)
      return () => setTabAction(null)
    }
    setTabAction(
      <div className="flex flex-wrap justify-end gap-2">
        {extra}
        {create}
      </div>,
    )
    return () => setTabAction(null)
  }, [extra, isAdmin, newLabel, newTo, setTabAction])

  async function onDelete(id: number) {
    list.setError("")
    try {
      await removeRecord(path, id)
      setPending(null)
      list.reload()
    } catch (caught) {
      list.setError(caught instanceof Error ? caught.message : "Não foi possível excluir.")
    }
  }

  return (
    <div className="space-y-3">
      <ListSearch id={`search-${path}`} value={query} onChange={setQuery} onSearch={list.reload} />
      {selects.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {selects.map((select) => (
            <FilterSelect
              key={select.key}
              id={`filter-${path}-${select.key}`}
              label={select.label}
              value={chosen[select.key] ?? ""}
              options={select.options}
              onChange={(value) => setChosen((current) => ({ ...current, [select.key]: value }))}
            />
          ))}
        </div>
      ) : null}
      {list.error ? <p className="text-sm text-destructive">{list.error}</p> : null}
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {list.items.map((item) => {
          const detail = detailOf?.(item)
          return (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p>{nameOf(item)}</p>
                {detail ? <p className="text-muted-foreground">{detail}</p> : null}
              </div>
              {pending === item.id ? (
                <div className="flex items-center gap-2">
                  <span>Excluir {nameOf(item)}?</span>
                  <Button type="button" size="sm" variant="destructive" onClick={() => onDelete(item.id)}>
                    Excluir
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setPending(null)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <Button asChild size="sm" variant="outline">
                    <Link to={viewTo(item.id)} aria-label="Visualizar">
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  {isAdmin ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to={editTo(item.id)} aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : null}
                  {isAdmin ? (
                    <Button type="button" size="sm" variant="outline" aria-label="Excluir" onClick={() => setPending(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              )}
            </li>
          )
        })}
        {list.items.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">{empty}</li> : null}
      </ul>
      <ListPager page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} onPageSize={list.setPageSize} />
    </div>
  )
}

function downloadPdf(bytes: Uint8Array<ArrayBuffer>, filename: string) {
  const blob = new Blob([bytes], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function EmployeeList() {
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const printCards = useCallback(async () => {
    setNote("")
    setError("")
    setBusy(true)
    try {
      const cards = await listQrCards()
      if (cards.length === 0) {
        setNote("Nenhum QR Code para imprimir. O funcionário precisa usar essa modalidade, ter matrícula e unidade vigente.")
        return
      }
      downloadPdf(qrCardsPdf(cards), "qr-codes.pdf")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível gerar o PDF.")
    } finally {
      setBusy(false)
    }
  }, [])
  const extra = useMemo(
    () => (
      <Button type="button" variant="outline" disabled={busy} onClick={() => void printCards()}>
        <QrCode className="h-4 w-4" />
        Gerar QR Code
      </Button>
    ),
    [busy, printCards],
  )
  return (
    <div className="space-y-3">
      {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <RecordList<Employee>
        path="/employees"
        filters={(query) => {
          const text = query.trim()
          if (!text) return {}
          if (/[A-Za-zÀ-ÿ]/.test(text)) return { full_name: text }
          const digits = onlyDigits(text)
          return digits ? { cpf: digits } : { full_name: text }
        }}
        newTo="/people/new"
        newLabel="Novo funcionário"
        viewTo={(id) => `/people/${id}`}
        editTo={(id) => `/people/${id}/edit`}
        nameOf={(item) => item.full_name}
        detailOf={(item) => `${formatCpf(item.cpf)} · ${situationLabel[item.situation || ""] || "Sem situação"} · ${clockMethodLabel[item.clock_method] || item.clock_method} · ${showDate(item.admission_date)}`}
        empty="Nenhum funcionário."
        extra={extra}
      />
    </div>
  )
}

const linkedSelects: Record<string, { key: string; label: string; source: string }> = {
  sectors: { key: "unit_id", label: "Unidade", source: "/units" },
  teams: { key: "sector_id", label: "Setor", source: "/sectors" },
  agreements: { key: "union_id", label: "Sindicato", source: "/unions" },
}

export function CatalogList({ catalog }: { catalog: string }) {
  const entry = catalogs[catalog]
  const linked = linkedSelects[catalog]
  const [linkedOptions, setLinkedOptions] = useState<{ value: string; label: string }[]>([])
  useEffect(() => {
    if (!linked) return
    let active = true
    optionsOf(linked.source)
      .then((options) => {
        if (active) setLinkedOptions(options)
      })
      .catch(() => {
        if (active) setLinkedOptions([])
      })
    return () => {
      active = false
    }
  }, [linked])
  const selects: ListSelect[] = [
    ...(linked ? [{ key: linked.key, label: linked.label, options: linkedOptions, valueType: "number" as const }] : []),
    ...(entry.kind ? [{ key: "active", label: "Situação", options: [{ value: "true", label: "Ativo" }, { value: "false", label: "Inativo" }], valueType: "boolean" as const }] : []),
  ]
  return (
    <RecordList<NamedRecord>
      path={entry.path}
      filters={(query) => ({
        ...(entry.kind ? { kind: entry.kind } : {}),
        ...(query.trim() ? { name: query.trim() } : {}),
      })}
      selects={selects}
      newTo={`${entry.backTo.split("?")[0]}/${catalog}/new`}
      newLabel={entry.newLabel}
      viewTo={(id) => `${entry.backTo.split("?")[0]}/${catalog}/${id}`}
      editTo={(id) => `${entry.backTo.split("?")[0]}/${catalog}/${id}/edit`}
      nameOf={(item) => item.name}
      detailOf={(item) => {
        if (typeof item.active === "boolean") return item.active ? "Ativo" : "Inativo"
        if (item.holiday_date) return showDate(item.holiday_date)
        return ""
      }}
      empty={entry.empty}
    />
  )
}

export function EntityRecordPage({ catalog, mode }: { catalog: string; mode: "new" | "edit" | "view" }) {
  const entry = catalogs[catalog]
  const params = useParams()
  const navigate = useNavigate()
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin"
  const id = Number(params.id)
  const [form, setForm] = useState<Record<string, string>>(() => blankForm(entry.fields))
  const [options, setOptions] = useState<Record<string, { value: string; label: string }[]>>({})
  const [title, setTitle] = useState(entry.newLabel)
  const [error, setError] = useState("")

  useEffect(() => {
    if (mode !== "view" && !isAdmin) {
      navigate(mode === "new" ? entry.backTo : `${entry.backTo.split("?")[0]}/${catalog}/${id}`, { replace: true })
    }
  }, [mode, isAdmin, id])

  useEffect(() => {
    let active = true
    Promise.all(
      entry.fields.map(async (field) => {
        const loaded = field.loadOptions ? await field.loadOptions() : field.options || []
        return [field.name, loaded] as const
      }),
    )
      .then((pairs) => {
        if (active) setOptions(Object.fromEntries(pairs))
      })
      .catch(() => {
        if (active) setOptions({})
      })
    if (mode === "new") {
      setForm(blankForm(entry.fields))
      setTitle(entry.newLabel)
      return () => {
        active = false
      }
    }
    getRecord<NamedRecord>(entry.path, id)
      .then((row) => {
        if (!active) return
        const next = blankForm(entry.fields)
        for (const field of entry.fields) {
          const value = row[field.name as keyof NamedRecord]
          if (field.type === "checkbox") {
            next[field.name] = value === false ? "false" : "true"
          } else {
            next[field.name] = value === null || value === undefined ? "" : String(value)
          }
        }
        setForm(next)
        setTitle(mode === "edit" ? entry.editTitle : row.name)
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Não foi possível carregar.")
      })
    return () => {
      active = false
    }
  }, [catalog, mode, id])

  function shown(field: CatalogField) {
    const raw = form[field.name] ?? ""
    if (field.type === "select") {
      return options[field.name]?.find((option) => option.value === raw)?.label || "—"
    }
    if (field.type === "checkbox") return raw === "false" ? "Inativo" : "Ativo"
    if (field.type === "date") return raw ? showDate(raw) : "—"
    return raw || "—"
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    const body = bodyFrom(entry.fields, form, entry.kind)
    try {
      if (mode === "new") {
        await createRecord(entry.path, body)
      } else {
        await updateRecord(entry.path, id, body)
      }
      navigate(entry.backTo)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.")
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <BackLink to={entry.backTo} />
      <h1 className="text-xl font-semibold">{title}</h1>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {mode === "view" ? (
        <dl className="space-y-3 text-sm">
          {entry.fields.map((field) => (
            <div key={field.name}>
              <dt className="text-muted-foreground">{field.label}</dt>
              <dd>{shown(field)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <ActionForm className="space-y-4" onSubmit={onSubmit}>
          {entry.fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={`${catalog}-${field.name}`}>{field.label}</Label>
              {field.type === "select" ? (
                <select id={`${catalog}-${field.name}`} className={fieldClass} value={form[field.name] ?? ""} required={field.required} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}>
                  <option value="">Selecione</option>
                  {(options[field.name] || []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "checkbox" ? (
                <select id={`${catalog}-${field.name}`} className={fieldClass} value={form[field.name] ?? "true"} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}>
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              ) : field.type === "textarea" ? (
                <textarea id={`${catalog}-${field.name}`} className="min-h-20 w-full rounded-md border border-border bg-card px-3 py-2 text-sm" value={form[field.name] ?? ""} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} />
              ) : (
                <Input id={`${catalog}-${field.name}`} type={field.type} required={field.required} value={form[field.name] ?? ""} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} />
              )}
            </div>
          ))}
          <Button type="submit">
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </ActionForm>
      )}
    </div>
  )
}
