import { Layers, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { ListPager } from "@/components/workforce/list-controls"
import { moduleCardClass, moduleDangerClass, moduleDangerIconClass, moduleFieldClass, moduleIconClass, moduleLabelClass, modulePrimaryClass, moduleQuietClass } from "@/components/workforce/module-visual"
import { listTenants, removeTenant } from "@/services/tenant.service"
import { useAuthStore } from "@/store/auth.store"
import type { Tenant } from "@/types/api"
import { cn } from "@/utils/cn"
import { formatCnpj, onlyDigits } from "@/utils/digits"

function fold(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim()
}

function matchesTenant(item: Tenant, query: string) {
  const text = query.trim()
  if (!text) return true
  if (fold(item.name || "").includes(fold(text))) return true
  const digits = onlyDigits(text)
  return digits.length > 0 && onlyDigits(item.document || "").includes(digits)
}

export function TenantsPage() {
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin"
  const activeId = useAuthStore((state) => state.activeTenant?.id)
  const [all, setAll] = useState<Tenant[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [query, setQuery] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [pending, setPending] = useState<number | null>(null)
  const filtered = all.filter((item) => matchesTenant(item, query))
  const total = filtered.length
  const items = filtered.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    setPage(1)
  }, [query])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    async function loadAll() {
      const first = await listTenants(1, 100)
      const rows = [...first.items]
      const pages = Math.ceil(first.total / 100)
      for (let current = 2; current <= pages; current += 1) {
        const next = await listTenants(current, 100)
        rows.push(...next.items)
      }
      return rows
    }
    loadAll()
      .then((rows) => {
        if (active) setAll(rows)
      })
      .catch((caught: unknown) => {
        if (!active) return
        setAll([])
        setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [reloadKey])

  async function onDelete(id: number) {
    setError("")
    try {
      await removeTenant(id)
      setPending(null)
      setReloadKey((current) => current + 1)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível excluir.")
    }
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink to="/settings" appearance="detail" />
        {isAdmin ? (
          <Button asChild className={cn(modulePrimaryClass, "h-10 shrink-0")}>
            <Link to="/tenants/new">
              <Plus className="h-4 w-4" />
              Criar nova organização
            </Link>
          </Button>
        ) : null}
      </div>
      <section className={cn(moduleCardClass, "p-0 sm:p-0")}>
        <div className="flex min-w-0 items-center gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
            <Layers className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[#0A0A0A]">Organizações</h2>
            <p className="text-sm text-[#64748B]">Organizações deste sistema.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 px-5 sm:flex-row sm:items-end sm:px-6">
          <div className="min-w-0 flex-1 space-y-2">
            <Label className={moduleLabelClass} htmlFor="tenant-search">Pesquisar</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#94A3B8]" strokeWidth={1.75} aria-hidden />
              <Input
                id="tenant-search"
                value={query}
                placeholder="Nome ou CNPJ"
                className={cn(moduleFieldClass, "pl-10")}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return
                  event.preventDefault()
                  setPage(1)
                  setReloadKey((current) => current + 1)
                }}
              />
            </div>
          </div>
          <Button type="button" className={cn(modulePrimaryClass, "h-12 shrink-0")} onClick={() => { setPage(1); setReloadKey((current) => current + 1) }}>
            <Search className="h-4 w-4" />
            Pesquisar
          </Button>
        </div>
        {error ? <p className="px-5 pt-4 text-sm text-destructive sm:px-6" role="alert">{error}</p> : null}
        {loading && all.length === 0 && !error ? (
          <div className="flex justify-center py-10" role="status">
            <Spinner label="Carregando as organizações" className="h-8 w-8 text-[#1E8A3A]" />
          </div>
        ) : null}
        {!loading && !error && items.length === 0 ? (
          <div className="px-2 py-10 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(30,138,58,0.08)] text-[#1E8A3A]">
              <Layers className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-[#0A0A0A]">Nenhuma organização</p>
            <p className="mt-1 text-sm text-[#71717A]">A consulta não encontrou registros.</p>
          </div>
        ) : null}
        {items.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-[#F1F5F9]">
                  <th className="px-5 py-3 text-left text-sm font-semibold text-[#64748B] sm:px-6">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B]">CNPJ</th>
                  <th className="w-px whitespace-nowrap px-5 py-3 text-center text-sm font-semibold text-[#64748B] sm:px-6">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const canEdit = isAdmin && activeId === item.id
                  return (
                    <tr key={item.id} className="border-b border-[#F1F5F9] transition-colors duration-200 last:border-b-0 hover:bg-[#F7FBF8] motion-reduce:transition-none">
                      <td className="px-5 py-3 align-middle sm:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#EAF7EF] text-[#1E8A3A]" aria-hidden>
                            <Layers className="h-[18px] w-[18px]" strokeWidth={1.75} />
                          </span>
                          <span className="block truncate font-semibold leading-5 text-[#0A0A0A]">{item.name || "Não informado"}</span>
                        </div>
                      </td>
                      <td className={cn("px-4 py-3 align-middle text-sm leading-5", item.document ? "text-[#64748B]" : "font-medium text-[#94A3B8]")}>
                        {item.document ? formatCnpj(item.document) : "Não informado"}
                      </td>
                      <td className="w-px whitespace-nowrap px-5 py-3 text-center align-middle sm:px-6">
                        {pending === item.id ? (
                          <div className="inline-flex flex-wrap items-center justify-end gap-2">
                            <span className="text-sm text-[#0A0A0A]">Excluir {item.name || "organização"}?</span>
                            <Button type="button" className={moduleDangerClass} onClick={() => onDelete(item.id)}>Excluir</Button>
                            <Button type="button" variant="outline" className={moduleQuietClass} onClick={() => setPending(null)}>Cancelar</Button>
                          </div>
                        ) : (
                          <div className="inline-flex justify-center gap-1.5">
                            <Button asChild variant="outline" className={moduleIconClass}>
                              <Link to={`/tenants/${item.id}`} aria-label={`Visualizar ${item.name || "organização"}`} title="Visualizar">
                                <Eye className="h-4 w-4" strokeWidth={1.75} />
                              </Link>
                            </Button>
                            {canEdit ? (
                              <Button asChild variant="outline" className={moduleIconClass}>
                                <Link to={`/tenants/${item.id}/edit`} aria-label={`Editar ${item.name || "organização"}`} title="Editar">
                                  <Pencil className="h-4 w-4" strokeWidth={1.75} />
                                </Link>
                              </Button>
                            ) : null}
                            {canEdit ? (
                              <Button type="button" variant="outline" className={moduleDangerIconClass} aria-label={`Excluir ${item.name || "organização"}`} title="Excluir" onClick={() => setPending(item.id)}>
                                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                              </Button>
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {items.length > 0 || total > 0 ? (
          <div className="border-t border-[#F1F5F9] px-4 py-3">
            <ListPager page={page} pageSize={pageSize} total={total} onPage={setPage} onPageSize={(size) => { setPage(1); setPageSize(size) }} tone="module" />
          </div>
        ) : null}
      </section>
    </div>
  )
}
