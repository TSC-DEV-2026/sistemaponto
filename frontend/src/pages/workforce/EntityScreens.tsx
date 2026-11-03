import { createContext, FormEvent, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { Briefcase, Building2, ChevronDown, ChevronUp, Clock, Eye, Network, Pencil, Plus, QrCode, Save, Search, Trash2, Users, type LucideIcon } from "lucide-react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"

import { authInputClass } from "@/components/auth-screen"
import { ActionForm } from "@/components/ui/action-form"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { TimePickerField } from "@/components/ui/time-picker-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ListPlaceholder } from "@/components/ui/list-placeholder"
import { SlidingHighlight } from "@/components/ui/sliding-highlight"
import { Spinner } from "@/components/ui/spinner"
import { SiteSelect } from "@/components/ui/site-select"
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
  source?: string
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

function PeopleSearch({ id, value, placeholder, onChange, onSearch }: { id: string; value: string; placeholder: string; onChange: (value: string) => void; onSearch: () => void }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1 space-y-2">
        <Label className={moduleLabelClass} htmlFor={id}>
          Pesquisar
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#94A3B8]" strokeWidth={1.75} aria-hidden />
          <Input
            id={id}
            value={value}
            placeholder={placeholder}
            className={cn(moduleFieldClass, "pl-10")}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              onSearch()
            }}
          />
        </div>
      </div>
      <Button type="button" className={cn(modulePrimaryClass, "h-12 shrink-0")} onClick={onSearch}>
        <Search className="h-4 w-4" />
        Pesquisar
      </Button>
    </div>
  )
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function asEmployee(item: object): Employee | null {
  if ("full_name" in item && "cpf" in item && "admission_date" in item) return item as Employee
  return null
}

function SortArrows({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <span className="inline-flex flex-col" aria-hidden>
      <ChevronUp className={cn("h-3.5 w-3.5", active && dir === "asc" ? "text-[#1E8A3A]" : "text-[#CBD5E1]")} strokeWidth={2.5} />
      <ChevronDown className={cn("-mt-1.5 h-3.5 w-3.5", active && dir === "desc" ? "text-[#1E8A3A]" : "text-[#CBD5E1]")} strokeWidth={2.5} />
    </span>
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
  people = false,
  organization = false,
  action: actionSlot = null,
}: {
  title: string
  lead?: string
  tabs: { id: string; label: string; panel: ReactNode; icon?: LucideIcon }[]
  module?: boolean
  people?: boolean
  organization?: boolean
  action?: ReactNode
}) {
  const [params, setParams] = useSearchParams()
  const [action, setAction] = useState<ReactNode>(null)
  const requested = params.get("aba")
  const current = tabs.some((tab) => tab.id === requested) ? requested : tabs[0].id
  const selected = tabs.find((tab) => tab.id === current) ?? tabs[0]

  return (
    <TabAction.Provider value={setAction}>
      <div className={module || people || organization ? "w-full min-w-0 space-y-5" : "mx-auto max-w-3xl space-y-4"}>
        {module || people || organization || !lead ? null : <p className="text-sm text-muted-foreground">{lead}</p>}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <SlidingHighlight className={module || people || organization ? "inline-flex max-w-full flex-wrap rounded-xl bg-[#E7E8EA] p-1" : "flex flex-wrap gap-2"} role="tablist">
            {tabs.map((tab) =>
              module || people || organization ? (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={tab.id === current}
                  data-slide-active={tab.id === current ? "true" : undefined}
                  className={cn(
                    "relative z-10 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none",
                    tab.id === current ? "text-brand-cta" : "text-zinc-600 hover:text-zinc-900",
                  )}
                  onClick={() => setParams(tab.id === tabs[0].id ? {} : { aba: tab.id })}
                >
                  {tab.icon ? <tab.icon className="h-4 w-4" strokeWidth={1.75} aria-hidden /> : null}
                  {tab.label}
                </button>
              ) : (
                <Button key={tab.id} type="button" size="sm" variant={tab.id === current ? "default" : "outline"} onClick={() => setParams(tab.id === tabs[0].id ? {} : { aba: tab.id })}>
                  {tab.label}
                </Button>
              ),
            )}
          </SlidingHighlight>
          {actionSlot ?? action}
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
  mark: Mark,
  searchPlaceholder = "Pesquisar",
  searchTitle,
  searchLead,
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
  presentation?: "journey" | "people" | "organization"
  mark?: LucideIcon
  searchPlaceholder?: string
  searchTitle?: string
  searchLead?: string
}) {
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin"
  const setTabAction = useContext(TabAction)
  const journey = presentation === "journey"
  const people = presentation === "people"
  const organization = presentation === "organization"
  const [query, setQuery] = useState("")
  const [chosen, setChosen] = useState<Record<string, string>>({})
  const [pending, setPending] = useState<number | null>(null)
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null)
  const list = usePagedList<T>(path, {
    ...(filters ? filters(query) : query.trim() ? { name: query.trim() } : {}),
    ...selectedFilters(selects, chosen),
  })

  useEffect(() => {
    const create = isAdmin ? (
      <Button asChild className={journey || people || organization ? cn(modulePrimaryClass, "shrink-0", organization && "w-full sm:w-auto") : undefined}>
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
      <div className={cn("flex flex-wrap justify-end gap-2", organization && "w-full sm:w-auto")}>
        {extra}
        {create}
      </div>,
    )
    return () => setTabAction(null)
  }, [extra, isAdmin, journey, newLabel, newTo, organization, people, setTabAction])

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

  function toggleSort(key: string) {
    setSort((current) => {
      if (current?.key !== key) return { key, dir: "asc" }
      if (current.dir === "asc") return { key, dir: "desc" }
      return null
    })
  }

  function sortText(item: T, key: string) {
    const person = asEmployee(item)
    if (person) {
      if (key === "situation") return situationLabel[person.situation || ""] || ""
      if (key === "clock") return clockMethodLabel[person.clock_method] || person.clock_method
      if (key === "admission") return person.admission_date || ""
      return person.full_name
    }
    return nameOf(item)
  }

  const rows = !people || !sort ? list.items : [...list.items].sort((left, right) => sortText(left, sort.key).localeCompare(sortText(right, sort.key), "pt-BR") * (sort.dir === "asc" ? 1 : -1))

  function sortButton(key: string, label: string) {
    const active = sort?.key === key
    return (
      <button type="button" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#64748B] transition-colors duration-200 hover:text-[#334155]" onClick={() => toggleSort(key)}>
        {label}
        <SortArrows active={active} dir={sort?.dir ?? "asc"} />
      </button>
    )
  }

  if (organization) {
    const MarkIcon = Mark ?? Building2
    return (
      <div className="w-full min-w-0 space-y-4">
        <section className={moduleCardClass}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
              <Search className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[#0A0A0A]">{searchTitle}</h2>
              {searchLead ? <p className="text-sm text-[#64748B]">{searchLead}</p> : null}
            </div>
          </div>
          <div className={cn("mt-4 grid w-full grid-cols-1 items-center gap-3", selects.length > 0 ? "lg:grid-cols-[minmax(0,1fr)_auto_auto]" : "lg:grid-cols-[minmax(0,1fr)_auto]")}>
            <div className="relative min-w-0 w-full">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#94A3B8]" strokeWidth={1.75} aria-hidden />
              <Input
                id={`search-${path}`}
                value={query}
                placeholder={searchPlaceholder}
                className={cn(moduleFieldClass, "pl-10")}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return
                  event.preventDefault()
                  list.reload()
                }}
              />
            </div>
            {selects.map((select) => (
              <div key={select.key} className="flex h-12 min-w-0 items-center gap-3">
                <Label className={cn(moduleLabelClass, "shrink-0")} htmlFor={`filter-${path}-${select.key}`}>
                  {select.label}
                </Label>
                <div className="h-12 w-full min-w-0 lg:w-56">
                <SiteSelect
                  id={`filter-${path}-${select.key}`}
                  value={chosen[select.key] ?? ""}
                  placeholder="Todos"
                  icon={select.key === "unit_id" ? Building2 : Network}
                  searchable
                  searchPath={select.source}
                  searchPlaceholder={`Pesquisar ${select.label.toLocaleLowerCase("pt-BR")}`}
                  className="h-12 shadow-[0_4px_10px_rgba(15,23,42,0.035)]"
                  options={[{ value: "", label: "Todos" }, ...select.options]}
                  onChange={(value) => setChosen((current) => ({ ...current, [select.key]: value }))}
                />
                </div>
              </div>
            ))}
            <Button type="button" className={cn(modulePrimaryClass, "h-12 shrink-0")} onClick={list.reload}>
              <Search className="h-4 w-4" />
              Pesquisar
            </Button>
          </div>
        </section>
        {list.error ? <p className="text-sm text-destructive">{list.error}</p> : null}
        <section className={moduleCardClass}>
          <h2 className="text-lg font-semibold text-[#0A0A0A]">Registros cadastrados</h2>
          {list.loading && rows.length === 0 && !list.error ? (
            <div className="flex justify-center py-10" role="status" aria-live="polite">
              <Spinner label="Carregando os registros" className="h-8 w-8 text-[#1E8A3A]" />
            </div>
          ) : rows.length === 0 && !list.error ? (
            <div className="px-2 py-10 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(30,138,58,0.08)] text-[#1E8A3A]">
                <MarkIcon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
              </span>
              <p className="mt-4 text-[15px] font-semibold text-[#0A0A0A]">{empty}</p>
              <p className="mt-1 text-sm text-[#71717A]">A consulta não encontrou registros.</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {rows.map((item) => (
                <li key={item.id} className="group/card flex min-h-16 min-w-0 flex-col gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-[0_4px_12px_rgba(15,23,42,0.035),0_8px_20px_rgba(15,23,42,0.035)] [transition:transform_220ms_cubic-bezier(0.22,1,0.36,1),border-color_220ms_ease,box-shadow_220ms_ease] hover:border-[#AEBBC9] hover:shadow-[0_8px_20px_rgba(15,23,42,0.075),0_16px_32px_rgba(15,23,42,0.055)] motion-safe:hover:-translate-y-0.5 sm:flex-row sm:items-center motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                  <Link to={viewTo(item.id)} aria-label={`Visualizar ${nameOf(item)}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta/40">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-emerald-50 text-brand-cta" aria-hidden>
                      <MarkIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-brand-ink">{nameOf(item)}</span>
                    <span title="Visualizar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#E2E8F0] bg-white text-[#64748B] [transition:background-color_180ms_ease,color_180ms_ease,border-color_180ms_ease,box-shadow_180ms_ease,transform_180ms_ease] group-hover/card:border-[#C5CED8] hover:!border-[rgba(30,138,58,0.25)] hover:!bg-[rgba(30,138,58,0.08)] hover:!text-[#1E8A3A] hover:!shadow-[0_4px_12px_rgba(30,138,58,0.10)] motion-safe:hover:!-translate-y-px motion-reduce:transition-none motion-reduce:hover:!translate-y-0">
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
                        <Link to={editTo(item.id)} aria-label={`Editar ${nameOf(item)}`} title="Editar">
                          <Pencil className="h-4 w-4" strokeWidth={1.75} />
                        </Link>
                      </Button>
                      <Button type="button" variant="outline" className={moduleDangerIconClass} aria-label={`Excluir ${nameOf(item)}`} title="Excluir" onClick={() => setPending(item.id)}>
                        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {rows.length > 0 || list.total > 0 ? (
            <div className="mt-4 border-t border-[#F1F5F9] pt-4">
              <ListPager page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} onPageSize={list.setPageSize} tone="module" />
            </div>
          ) : null}
        </section>
      </div>
    )
  }

  return (
    <div className={journey ? "w-full rounded-[14px] border border-[#E4E4E7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]" : "space-y-4"}>
      {journey ? (
        <div>
          <h2 className="text-lg font-semibold text-brand-ink">Jornadas</h2>
          <p className="mt-1 text-sm text-brand-quiet">Consulte as jornadas cadastradas.</p>
        </div>
      ) : null}
      {people ? (
        <section className={moduleCardClass}>
          <PeopleSearch id={`search-${path}`} value={query} placeholder={searchPlaceholder} onChange={setQuery} onSearch={list.reload} />
        </section>
      ) : journey ? (
        <div className="mt-[18px]">
          <JourneySearch id={`search-${path}`} value={query} onChange={setQuery} onSearch={list.reload} />
        </div>
      ) : (
        <ListSearch id={`search-${path}`} value={query} onChange={setQuery} onSearch={list.reload} />
      )}
      {selects.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {selects.map((select) => select.source ? (
            <div key={select.key} className="min-w-40 flex-1 space-y-2">
              <Label htmlFor={`filter-${path}-${select.key}`}>{select.label}</Label>
              <SiteSelect
                id={`filter-${path}-${select.key}`}
                value={chosen[select.key] ?? ""}
                placeholder="Todos"
                searchable
                searchPath={select.source}
                searchPlaceholder={`Pesquisar ${select.label.toLocaleLowerCase("pt-BR")}`}
                options={[{ value: "", label: "Todos" }, ...select.options]}
                onChange={(value) => setChosen((current) => ({ ...current, [select.key]: value }))}
              />
            </div>
          ) : (
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
      <div className={people ? "overflow-hidden rounded-[14px] border border-[#E2E8F0] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]" : "contents"}>
      {people ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <colgroup>
              <col />
              {path === "/employees" ? (
                <>
                  <col className="w-[8.5rem]" />
                  <col className="w-[13rem]" />
                  <col className="w-[8rem]" />
                </>
              ) : null}
              <col />
            </colgroup>
            <thead>
              <tr className="border-b border-[#F1F5F9]">
                <th className="px-4 py-3 text-left font-semibold">{sortButton("name", "Nome")}</th>
                {path === "/employees" ? (
                  <>
                    <th className="px-4 py-3 text-left font-semibold">{sortButton("situation", "Situação")}</th>
                    <th className="px-4 py-3 text-left font-semibold">{sortButton("clock", "Tipo de registro")}</th>
                    <th className="px-4 py-3 text-left font-semibold">{sortButton("admission", "Admissão")}</th>
                  </>
                ) : null}
                <th className="w-px whitespace-nowrap px-4 py-3 text-center align-middle text-sm font-semibold text-[#64748B]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const person = asEmployee(item)
                const actions =
                  pending === item.id ? (
                    <div className="inline-flex flex-wrap items-center justify-end gap-2">
                      <span className="text-sm text-[#0A0A0A]">Excluir {nameOf(item)}?</span>
                      <Button type="button" className={moduleDangerClass} onClick={() => onDelete(item.id)}>
                        Excluir
                      </Button>
                      <Button type="button" variant="outline" className={moduleQuietClass} onClick={() => setPending(null)}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="inline-flex justify-center gap-1.5">
                      <Button asChild variant="outline" className={moduleIconClass}>
                        <Link to={viewTo(item.id)} aria-label={`Visualizar ${nameOf(item)}`} title="Visualizar">
                          <Eye className="h-4 w-4" strokeWidth={1.75} />
                        </Link>
                      </Button>
                      {isAdmin ? (
                        <Button asChild variant="outline" className={moduleIconClass}>
                          <Link to={editTo(item.id)} aria-label={`Editar ${nameOf(item)}`} title="Editar">
                            <Pencil className="h-4 w-4" strokeWidth={1.75} />
                          </Link>
                        </Button>
                      ) : null}
                      {isAdmin ? (
                        <Button type="button" variant="outline" className={moduleDangerIconClass} aria-label={`Excluir ${nameOf(item)}`} title="Excluir" onClick={() => setPending(item.id)}>
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                        </Button>
                      ) : null}
                    </div>
                  )
                return (
                  <tr key={item.id} className="border-b border-[#F1F5F9] transition-colors duration-200 last:border-b-0 hover:bg-[#F7FBF8] motion-reduce:transition-none">
                    <td className="px-4 py-3 align-middle">
                      <div className="flex min-w-0 items-center gap-3">
                        {person ? (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF7EF] text-sm font-semibold text-[#086B35]" aria-hidden>
                            {initialsOf(person.full_name)}
                          </span>
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#EAF7EF] text-[#1E8A3A]" aria-hidden>
                            {Mark ? <Mark className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Briefcase className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate font-semibold leading-5 text-[#0A0A0A]">{nameOf(item)}</span>
                          {person || detailOf?.(item) ? <span className="mt-0.5 block truncate text-sm leading-5 text-[#64748B]">{person ? formatCpf(person.cpf) : detailOf?.(item)}</span> : null}
                        </span>
                      </div>
                    </td>
                    {person ? (
                      <>
                        <td className="px-4 py-3 align-middle">
                          <span className={cn("inline-flex h-7 items-center rounded-full px-3 text-[13px] font-semibold leading-none", person.situation === "active" ? "bg-[rgba(30,138,58,0.14)] text-[#146C2E]" : "bg-[#F1F5F9] text-[#475569]")}>
                            {situationLabel[person.situation || ""] || "Sem situação"}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle text-sm leading-5 text-[#334155]">{clockMethodLabel[person.clock_method] || person.clock_method}</td>
                        <td className="px-4 py-3 align-middle text-sm leading-5 text-[#64748B]">{showDate(person.admission_date)}</td>
                      </>
                    ) : null}
                    <td className="w-px whitespace-nowrap px-4 py-3 text-center align-middle">{actions}</td>
                  </tr>
                )
              })}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm text-[#64748B]" colSpan={path === "/employees" ? 5 : 2}>
                    {list.loading ? <span className="inline-flex w-full justify-center"><Spinner /></span> : empty}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
      {people ? null : (
      <ul className={journey ? "mt-4 space-y-2" : "divide-y divide-border rounded-lg border border-border bg-card"}>
        {rows.map((item) => {
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
      )}
      <div className={people ? "border-t border-[#F1F5F9] px-4 py-3" : journey ? "mt-4 border-t border-[#F0F0F2] pt-3" : undefined}>
        <ListPager page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} onPageSize={list.setPageSize} tone="module" density={journey ? "compact" : "default"} />
      </div>
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
      <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 shrink-0 hover:border-[rgba(30,138,58,0.25)] hover:bg-[#EAF7EF] hover:text-[#1E8A3A]")} disabled={busy} onClick={() => printCards()}>
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
        presentation="people"
        searchPlaceholder="Pesquisar por nome ou CPF"
      />
    </div>
  )
}

const linkedSelects: Record<string, { key: string; label: string; source: string }> = {
  sectors: { key: "unit_id", label: "Unidade", source: "/units" },
  teams: { key: "sector_id", label: "Setor", source: "/sectors" },
  agreements: { key: "union_id", label: "Sindicato", source: "/unions" },
}

const organizationCopy: Record<string, { title: string; lead: string; mark: LucideIcon }> = {
  units: { title: "Pesquisar unidades", lead: "Consulte as unidades cadastradas.", mark: Building2 },
  sectors: { title: "Pesquisar setores", lead: "Consulte os setores cadastrados.", mark: Network },
  teams: { title: "Pesquisar equipes", lead: "Consulte as equipes cadastradas.", mark: Users },
}

export function CatalogList({ catalog, presentation }: { catalog: string; presentation?: "journey" | "people" | "organization" }) {
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
    ...(linked ? [{ key: linked.key, label: linked.label, options: linkedOptions, valueType: "number" as const, source: linked.source }] : []),
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
      searchTitle={organizationCopy[catalog]?.title}
      searchLead={organizationCopy[catalog]?.lead}
      searchPlaceholder={presentation === "organization" ? "Buscar por nome..." : "Pesquisar"}
      mark={organizationCopy[catalog]?.mark ?? (catalog === "cost-centers" ? Building2 : catalog === "jobs" ? Briefcase : undefined)}
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
  const [loaded, setLoaded] = useState(mode === "new")
  const [optionsReady, setOptionsReady] = useState(false)

  useEffect(() => {
    if (mode !== "view" && !isAdmin) {
      navigate(mode === "new" ? entry.backTo : `${entry.backTo.split("?")[0]}/${catalog}/${id}`, { replace: true })
    }
  }, [mode, isAdmin, id])

  useEffect(() => {
    let active = true
    setOptionsReady(false)
    Promise.all(
      entry.fields.map(async (field) => {
        const loaded = field.loadOptions ? await field.loadOptions() : field.options || []
        return [field.name, loaded] as const
      }),
    )
      .then((pairs) => {
        if (!active) return
        setOptions(Object.fromEntries(pairs))
        setOptionsReady(true)
      })
      .catch(() => {
        if (!active) return
        setOptions({})
        setOptionsReady(true)
      })
    if (mode === "new") {
      setForm(blankForm(entry.fields))
      setTitle(entry.newLabel)
      setError("")
      setLoaded(true)
      return () => {
        active = false
      }
    }
    setLoaded(false)
    setError("")
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
        setLoaded(true)
      })
      .catch((caught: unknown) => {
        if (!active) return
        setError(caught instanceof Error ? caught.message : "Não foi possível carregar.")
        setLoaded(true)
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

  if (catalog === "jobs" || catalog === "cost-centers") {
    const Icon = catalog === "jobs" ? Briefcase : Building2
    const noun = catalog === "jobs" ? "cargo" : "centro de custo"
    if (mode !== "new" && !loaded && !error) {
      return (
        <div className="w-full min-w-0 space-y-5">
          <BackLink to={entry.backTo} appearance="detail" />
          <section className={cn(moduleCardClass, "mx-auto flex min-h-[280px] w-full max-w-[680px] flex-col items-center justify-center gap-3")} role="status" aria-live="polite">
            <Spinner label={`Carregando o ${noun}`} className="h-8 w-8 text-[#1E8A3A]" />
            <p className="text-sm font-medium text-[#64748B]">Carregando o {noun}</p>
          </section>
        </div>
      )
    }
    const heading = mode === "view" ? title : mode === "new" ? entry.newLabel : entry.editTitle
    const subtitle = mode === "view" ? (catalog === "jobs" ? "Cargo" : "Centro de custo") : mode === "new" ? `Informe o nome do ${noun}.` : `Atualize o nome do ${noun}.`
    return (
      <div className="w-full min-w-0 space-y-5">
        <BackLink to={entry.backTo} appearance="detail" />
        <section className={cn(moduleCardClass, "mx-auto w-full max-w-[680px] space-y-5 transition-[border-color,box-shadow] duration-200 hover:border-[#D5DEE8] hover:shadow-[0_12px_28px_rgba(15,23,42,0.06)] motion-reduce:transition-none")}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[#0A0A0A]">{heading}</h2>
              <p className="text-sm text-[#64748B]">{subtitle}</p>
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {mode === "view" ? (
            <dl className="space-y-4">
              {entry.fields.map((field) => (
                <div key={field.name}>
                  <dt className="text-sm text-[#64748B]">{field.label}</dt>
                  <dd className="mt-1 text-[15px] font-semibold text-[#0A0A0A]">{shown(field)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <ActionForm className="space-y-5" onSubmit={onSubmit}>
              {entry.fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label className={moduleLabelClass} htmlFor={`${catalog}-${field.name}`}>
                    {field.label}
                  </Label>
                  <Input id={`${catalog}-${field.name}`} className={moduleFieldClass} required={field.required} value={form[field.name] ?? ""} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} />
                </div>
              ))}
              <div className="flex justify-end border-t border-[#F1F5F9] pt-5">
                <Button type="submit" className={modulePrimaryClass}>
                  <Save className="h-4 w-4" />
                  Salvar
                </Button>
              </div>
            </ActionForm>
          )}
        </section>
      </div>
    )
  }

  if (catalog === "units" || catalog === "sectors" || catalog === "teams") {
    const Icon = catalog === "units" ? Building2 : catalog === "teams" ? Users : Network
    const noun = catalog === "units" ? "unidade" : catalog === "teams" ? "equipe" : "setor"
    const article = catalog === "sectors" ? "o" : "a"
    const possession = catalog === "sectors" ? "do" : "da"
    if (mode !== "new" && !loaded && !error) {
      return (
        <div className="w-full min-w-0 space-y-5">
          <BackLink to={entry.backTo} appearance="detail" />
          <section className={cn(moduleCardClass, "flex min-h-[280px] w-full flex-col items-center justify-center gap-3")} role="status" aria-live="polite">
            <Spinner label={`Carregando ${article} ${noun}`} className="h-8 w-8 text-[#1E8A3A]" />
            <p className="text-sm font-medium text-[#64748B]">Carregando {article} {noun}</p>
          </section>
        </div>
      )
    }
    const heading = mode === "view" ? title : mode === "new" ? entry.newLabel : entry.editTitle
    const subtitle = mode === "view" ? noun.charAt(0).toUpperCase() + noun.slice(1) : mode === "new" ? `Informe os dados ${possession} ${noun}.` : `Atualize os dados ${possession} ${noun}.`
    return (
      <div className="w-full min-w-0 space-y-5">
        <BackLink to={entry.backTo} appearance="detail" />
        <section className={cn(moduleCardClass, "w-full space-y-5")}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[#0A0A0A]">{heading}</h2>
              <p className="text-sm text-[#64748B]">{subtitle}</p>
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {mode === "view" ? (
            <dl className="space-y-4">
              {entry.fields.map((field) => (
                <div key={field.name}>
                  <dt className="text-sm text-[#64748B]">{field.label}</dt>
                  <dd className="mt-1 text-[15px] font-semibold text-[#0A0A0A]">{shown(field)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <ActionForm className="space-y-5" onSubmit={onSubmit}>
              {entry.fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label className={moduleLabelClass} htmlFor={`${catalog}-${field.name}`}>
                    {field.label}
                  </Label>
                  {field.type === "select" ? (
                    <SiteSelect
                      id={`${catalog}-${field.name}`}
                      value={form[field.name] ?? ""}
                      placeholder="Selecione"
                      icon={field.name === "unit_id" ? Building2 : Network}
                      loading={!optionsReady}
                      required={field.required}
                      searchable
                      searchPath={field.searchPath}
                      searchPlaceholder={`Pesquisar ${field.label.toLocaleLowerCase("pt-BR")}`}
                      options={(options[field.name] || []).map((option) => ({ value: option.value, label: option.label }))}
                      onChange={(value) => setForm({ ...form, [field.name]: value })}
                    />
                  ) : (
                    <Input id={`${catalog}-${field.name}`} className={moduleFieldClass} required={field.required} value={form[field.name] ?? ""} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} />
                  )}
                </div>
              ))}
              <div className="flex justify-end border-t border-[#F1F5F9] pt-5">
                <Button type="submit" className={modulePrimaryClass}>
                  <Save className="h-4 w-4" />
                  Salvar
                </Button>
              </div>
            </ActionForm>
          )}
        </section>
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
                <SiteSelect
                  id={`${catalog}-${field.name}`}
                  value={form[field.name] ?? ""}
                  placeholder="Selecione"
                  required={field.required}
                  searchable={Boolean(field.searchPath)}
                  searchPath={field.searchPath}
                  searchPlaceholder={`Pesquisar ${field.label.toLocaleLowerCase("pt-BR")}`}
                  options={[...(field.required ? [] : [{ value: "", label: "Selecione" }]), ...(options[field.name] || [])]}
                  onChange={(value) => setForm({ ...form, [field.name]: value })}
                />
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
