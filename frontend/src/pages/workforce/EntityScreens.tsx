import { createContext, FormEvent, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { Clock, Eye, Pencil, Plus, QrCode, Save, Search, Trash2 } from "lucide-react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"

import { authInputClass } from "@/components/auth-screen"
import { ActionForm } from "@/components/ui/action-form"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { TimePickerField } from "@/components/ui/time-picker-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ListPlaceholder } from "@/components/ui/list-placeholder"
import { fieldClass, optionsOf, type CatalogField } from "@/components/workforce/CatalogPanel"
import { moduleCardClass, moduleDangerClass, moduleDangerIconClass, moduleFieldClass, moduleIconClass, moduleLabelClass, modulePrimaryClass, moduleQuietClass, moduleTextClass } from "@/components/workforce/module-visual"
import { FilterSelect, ListPager, ListSearch, usePagedList, type ListParams } from "@/components/workforce/list-controls"
import { createRecord, getRecord, listQrCards, removeRecord, updateRecord, type Employee, type NamedRecord } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/utils/cn"
import { formatCpf, onlyDigits } from "@/utils/digits"
import { clockMethodLabel, showDate, situationLabel } from "@/utils/labels"
import { catalogs } from "@/pages/workforce/catalogs"
import { qrCardsPdf } from "@/utils/qr-cards-pdf"

export const TabAction = createContext<(node: ReactNode) => void>(() => {})

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

function JourneySearch({ id, value, onChange, onSearch }: { id: string; value: string; onChange: (value: string) => void; onSearch: () => void }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Label className="text-sm font-semibold text-[#1B2534]" htmlFor={id}>
          Pesquisar
        </Label>
        <div className="relative">
          <Input
            id={id}
            value={value}
            placeholder="Pesquisar"
            className={cn(authInputClass(false), "!h-11")}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              onSearch()
            }}
          />
          <Search className="pointer-events-none absolute left-[14px] top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-[#94A3B8]" strokeWidth={1.75} aria-hidden />
        </div>
      </div>
      <Button type="button" className={modulePrimaryClass} onClick={onSearch}>
        <Search className="h-4 w-4" />
        Pesquisar
      </Button>
    </div>
  )
}

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
  lead,
  tabs,
  module = false,
}: {
  title: string
  lead?: string
  tabs: { id: string; label: string; panel: ReactNode }[]
  module?: boolean
}) {
  const [params, setParams] = useSearchParams()
  const [action, setAction] = useState<ReactNode>(null)
  const requested = params.get("aba")
  const current = tabs.some((tab) => tab.id === requested) ? requested : tabs[0].id
  const selected = tabs.find((tab) => tab.id === current) ?? tabs[0]

  return (
    <TabAction.Provider value={setAction}>
      <div className={module ? "w-full min-w-0 space-y-5" : "mx-auto max-w-3xl space-y-4"}>
        {module || !lead ? null : <p className="text-sm text-muted-foreground">{lead}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className={module ? "inline-flex flex-wrap rounded-xl bg-[#E7E8EA] p-1" : "flex flex-wrap gap-2"} role="tablist">
            {tabs.map((tab) =>
              module ? (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={tab.id === current}
                  className={
                    tab.id === current
                      ? "rounded-lg bg-white px-4 py-2 text-sm font-medium text-brand-cta shadow-sm transition-colors duration-200"
                      : "rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition-colors duration-200 hover:text-zinc-900"
                  }
                  onClick={() => setParams(tab.id === tabs[0].id ? {} : { aba: tab.id })}
                >
                  {tab.label}
                </button>
              ) : (
                <Button key={tab.id} type="button" size="sm" variant={tab.id === current ? "default" : "outline"} onClick={() => setParams(tab.id === tabs[0].id ? {} : { aba: tab.id })}>
                  {tab.label}
                </Button>
              ),
            )}
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
  presentation,
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
  presentation?: "journey"
}) {
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin"
  const setTabAction = useContext(TabAction)
  const journey = presentation === "journey"
  const [query, setQuery] = useState("")
  const [chosen, setChosen] = useState<Record<string, string>>({})
  const [pending, setPending] = useState<number | null>(null)
  const list = usePagedList<T>(path, {
    ...(filters ? filters(query) : query.trim() ? { name: query.trim() } : {}),
    ...selectedFilters(selects, chosen),
  })

  useEffect(() => {
    const create = isAdmin ? (
      <Button asChild className={journey ? modulePrimaryClass : undefined}>
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
  }, [extra, isAdmin, journey, newLabel, newTo, setTabAction])

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
    <div className={journey ? "w-full rounded-[14px] border border-[#E4E4E7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]" : "space-y-3"}>
      {journey ? (
        <div>
          <h2 className="text-lg font-semibold text-brand-ink">Jornadas</h2>
          <p className="mt-1 text-sm text-brand-quiet">Consulte as jornadas cadastradas.</p>
        </div>
      ) : null}
      {journey ? (
        <div className="mt-[18px]">
          <JourneySearch id={`search-${path}`} value={query} onChange={setQuery} onSearch={list.reload} />
        </div>
      ) : (
        <ListSearch id={`search-${path}`} value={query} onChange={setQuery} onSearch={list.reload} />
      )}
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
      {list.error ? <p className={journey ? "mt-4 text-sm text-destructive" : "text-sm text-destructive"}>{list.error}</p> : null}
      <ul className={journey ? "mt-4 space-y-2" : "divide-y divide-border rounded-lg border border-border bg-card"}>
        {list.items.map((item) => {
          const detail = detailOf?.(item)
          if (journey) {
            return (
              <li key={item.id} className="group/card flex min-h-16 min-w-0 flex-col gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-[0_4px_12px_rgba(15,23,42,0.035),0_8px_20px_rgba(15,23,42,0.035)] [transition:transform_220ms_cubic-bezier(0.22,1,0.36,1),border-color_220ms_ease,box-shadow_220ms_ease] hover:border-[#AEBBC9] hover:shadow-[0_8px_20px_rgba(15,23,42,0.075),0_16px_32px_rgba(15,23,42,0.055)] motion-safe:hover:-translate-y-0.5 sm:flex-row sm:items-center motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <Link
                  to={viewTo(item.id)}
                  aria-label={`Visualizar ${nameOf(item)}`}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta/40"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-emerald-50 text-brand-cta" aria-hidden>
                    <Clock className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-brand-ink">{nameOf(item)}</span>
                    {detail ? <span className="mt-[3px] block truncate text-sm text-brand-quiet">{detail}</span> : null}
                  </span>
                  <span title="Visualizar jornada" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#E2E8F0] bg-white text-[#64748B] [transition:background-color_180ms_ease,color_180ms_ease,border-color_180ms_ease,box-shadow_180ms_ease,transform_180ms_ease] group-hover/card:border-[#C5CED8] hover:!border-[rgba(30,138,58,0.25)] hover:!bg-[rgba(30,138,58,0.08)] hover:!text-[#1E8A3A] hover:!shadow-[0_4px_12px_rgba(30,138,58,0.10)] motion-safe:hover:!-translate-y-px motion-reduce:transition-none motion-reduce:hover:!translate-y-0">
                    <Eye className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                </Link>
                {pending === item.id ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-[#0A0A0A]">
                    <span>Excluir {nameOf(item)}?</span>
                    <Button type="button" className={moduleDangerClass} onClick={() => onDelete(item.id)}>
                      Excluir
                    </Button>
                    <Button type="button" variant="outline" className={moduleQuietClass} onClick={() => setPending(null)}>
                      Cancelar
                    </Button>
                  </div>
                ) : isAdmin ? (
                  <div className="flex shrink-0 gap-1.5">
                    <Button asChild variant="outline" className={moduleIconClass}>
                      <Link to={editTo(item.id)} aria-label="Editar jornada" title="Editar jornada">
                        <Pencil className="h-4 w-4" strokeWidth={1.75} />
                      </Link>
                    </Button>
                    <Button type="button" variant="outline" className={moduleDangerIconClass} aria-label="Excluir jornada" title="Excluir jornada" onClick={() => setPending(item.id)}>
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </Button>
                  </div>
                ) : null}
              </li>
            )
          }
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
                    <Link to={viewTo(item.id)} aria-label="Visualizar" title="Visualizar">
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  {isAdmin ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to={editTo(item.id)} aria-label="Editar" title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : null}
                  {isAdmin ? (
                    <Button type="button" size="sm" variant="outline" aria-label="Excluir" title="Excluir" onClick={() => setPending(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              )}
            </li>
          )
        })}
        {list.items.length === 0 ? <ListPlaceholder loading={list.loading} empty={empty} className={journey ? "rounded-xl border border-dashed border-[#E4E4E7] px-4 py-6 text-center" : undefined} /> : null}
      </ul>
      <div className={journey ? "mt-4 border-t border-[#F0F0F2] pt-3" : undefined}>
        <ListPager page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} onPageSize={list.setPageSize} tone={journey ? "module" : "default"} density={journey ? "compact" : "default"} />
      </div>
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

export function CatalogList({ catalog, presentation }: { catalog: string; presentation?: "journey" }) {
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
        if (item.morning_start !== undefined || item.afternoon_start !== undefined || item.morning_end !== undefined || item.afternoon_end !== undefined) {
          const hour = (value?: string | null) => (value ? value.slice(0, 5) : "—")
          return `${hour(item.morning_start)}–${hour(item.morning_end)} / ${hour(item.afternoon_start)}–${hour(item.afternoon_end)}`
        }
        if (typeof item.active === "boolean") return item.active ? "Ativo" : "Inativo"
        if (item.holiday_date) return showDate(item.holiday_date)
        return ""
      }}
      empty={entry.empty}
      presentation={presentation}
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

  if (catalog === "journeys" && mode === "view") {
    const hour = (value: string) => {
      if (!value) return "—"
      return value.length >= 5 ? value.slice(0, 5) : value
    }
    const slots = [
      { name: "morning_start", step: "01", period: "Manhã" },
      { name: "morning_end", step: "02", period: "Manhã" },
      { name: "afternoon_start", step: "03", period: "Tarde" },
      { name: "afternoon_end", step: "04", period: "Tarde" },
    ]
    const name = form.name || "—"
    return (
      <div className="w-full min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.14em] text-brand-cta">JORNADAS / DETALHES</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-ink">{name}</h2>
            <p className="mt-1 text-sm text-brand-quiet">Informações e horários da jornada</p>
          </div>
          <BackLink to={entry.backTo} appearance="detail" />
        </div>
        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        <div className="mt-4 flex flex-col gap-4">
          <section className="w-full rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-6">
            <h3 className="text-base font-semibold text-brand-ink">Informações da jornada</h3>
            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-12">
              <div className="sm:w-72 sm:shrink-0">
                <p className="text-sm text-brand-muted">Nome</p>
                <p className="mt-1 font-semibold text-brand-ink">{name}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-brand-muted">Observação</p>
                <p className="mt-1 text-sm text-brand-quiet">{form.note?.trim() ? form.note : "Nenhuma observação informada."}</p>
              </div>
            </div>
          </section>
          <section className="w-full rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-brand-ink">Horários</h3>
              {form.name ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-brand-cta">{form.name}</span> : null}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {slots.map((slot) => {
                const field = entry.fields.find((item) => item.name === slot.name)
                return (
                  <div key={slot.name} className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-4">
                    <p className="text-xs font-semibold text-brand-cta">
                      {slot.step} · {slot.period}
                    </p>
                    <p className="mt-2 text-sm text-brand-muted">{field?.label}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-brand-ink">{hour(form[slot.name] ?? "")}</p>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    )
  }

  if (catalog === "journeys" && mode !== "view") {
    const times = entry.fields.filter((field) => field.type === "time")
    const name = entry.fields.find((field) => field.name === "name")
    const note = entry.fields.find((field) => field.name === "note")
    return (
      <div className="w-full min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.14em] text-brand-cta">JORNADAS</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-ink">{mode === "new" ? entry.newLabel : entry.editTitle}</h2>
            <p className="mt-1 text-sm text-brand-quiet">{mode === "new" ? "Informe o nome e os horários previstos." : "Atualize o nome e os horários previstos."}</p>
          </div>
          <BackLink to={entry.backTo} appearance="detail" />
        </div>
        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        <ActionForm className={cn(moduleCardClass, "mt-4 space-y-5")} onSubmit={onSubmit}>
          {name ? (
            <div className="space-y-2">
              <Label className={moduleLabelClass} htmlFor={`${catalog}-${name.name}`}>
                {name.label}
              </Label>
              <Input id={`${catalog}-${name.name}`} className={moduleFieldClass} required={name.required} value={form[name.name] ?? ""} onChange={(event) => setForm({ ...form, [name.name]: event.target.value })} />
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {times.map((field) => (
              <div key={field.name} className="min-w-0 space-y-2">
                <Label className={moduleLabelClass} htmlFor={`${catalog}-${field.name}`}>
                  {field.label}
                </Label>
                <TimePickerField id={`${catalog}-${field.name}`} value={form[field.name] ?? ""} onChange={(next) => setForm({ ...form, [field.name]: next })} />
              </div>
            ))}
          </div>
          {note ? (
            <div className="space-y-2">
              <Label className={moduleLabelClass} htmlFor={`${catalog}-${note.name}`}>
                {note.label}
              </Label>
              <textarea id={`${catalog}-${note.name}`} className={moduleTextClass} value={form[note.name] ?? ""} onChange={(event) => setForm({ ...form, [note.name]: event.target.value })} />
            </div>
          ) : null}
          <Button type="submit" className={modulePrimaryClass}>
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </ActionForm>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <BackLink to={entry.backTo} />
      {mode === "view" ? <h2 className="text-xl font-semibold">{title}</h2> : null}
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
                <textarea id={`${catalog}-${field.name}`} className={moduleTextClass} value={form[field.name] ?? ""} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} />
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
