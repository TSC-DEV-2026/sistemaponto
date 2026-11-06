import { Eye, Search, Shield, UserPlus } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { SiteSelect } from "@/components/ui/site-select"
import { Spinner } from "@/components/ui/spinner"
import { ListPager } from "@/components/workforce/list-controls"
import { moduleCardClass, moduleLabelClass, modulePrimaryClass } from "@/components/workforce/module-visual"
import { listMemberships } from "@/services/membership.service"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/utils/cn"
import { membershipRoleLabel } from "@/utils/labels"
import type { Membership } from "@/types/api"

const roleOptions = [
  { value: "", label: "Todos" },
  { value: "admin", label: "Administrador" },
  { value: "manager", label: "Gestor" },
  { value: "member", label: "Membro" },
]

export function MembershipsPage() {
  const navigate = useNavigate()
  const role = useAuthStore((state) => state.user?.role)
  const isAdmin = role === "admin"
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const requestId = useRef(0)
  const [roleDraft, setRoleDraft] = useState("")
  const [appliedRole, setAppliedRole] = useState("")
  const [reloadKey, setReloadKey] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [items, setItems] = useState<Membership[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!role || isAdmin) return
    navigate("/", { replace: true })
  }, [role, isAdmin, navigate])

  useEffect(() => {
    if (!isAdmin) return
    const current = ++requestId.current
    setLoading(true)
    setError("")
    listMemberships(page, pageSize, appliedRole || undefined)
      .then((result) => {
        if (current !== requestId.current) return
        setItems(result.items)
        setTotal(result.total)
      })
      .catch((caught: unknown) => {
        if (current !== requestId.current) return
        setItems([])
        setTotal(0)
        setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      })
      .finally(() => {
        if (current === requestId.current) setLoading(false)
      })
  }, [isAdmin, tenantId, page, pageSize, appliedRole, reloadKey])

  function search() {
    setPage(1)
    setAppliedRole(roleDraft)
    setReloadKey((current) => current + 1)
  }

  if (!isAdmin) return null

  return (
    <div className="w-full min-w-0 space-y-4">
      <section className={moduleCardClass}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
              <Shield className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[#0A0A0A]">Acessos</h2>
              <p className="text-sm text-[#64748B]">Quem entra neste sistema. O funcionário fica em Pessoas.</p>
            </div>
          </div>
          {role === "admin" ? (
            <Button asChild className={cn(modulePrimaryClass, "h-12 w-full shrink-0 sm:w-auto")}>
              <Link to="/memberships/new">
                <UserPlus className="h-4 w-4" />
                Vincular
              </Link>
            </Button>
          ) : null}
        </div>
        <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label className={moduleLabelClass} htmlFor="membership-role">Papel</Label>
            <SiteSelect id="membership-role" value={roleDraft} className="h-12" options={roleOptions} onChange={setRoleDraft} />
          </div>
          <Button type="button" className={cn(modulePrimaryClass, "h-12 w-full shrink-0 sm:w-auto")} onClick={search}>
            <Search className="h-4 w-4" />
            Pesquisar
          </Button>
        </div>
      </section>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      <section className={moduleCardClass}>
        <h2 className="text-lg font-semibold text-[#0A0A0A]">Registros cadastrados</h2>
        {loading ? (
          <div className="flex justify-center py-10" role="status">
            <Spinner label="Carregando os acessos" className="h-8 w-8 text-[#1E8A3A]" />
          </div>
        ) : null}
        {!loading && !error && items.length === 0 ? (
          <div className="px-2 py-10 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(30,138,58,0.08)] text-[#1E8A3A]">
              <Shield className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-[#0A0A0A]">Nenhum vínculo</p>
            <p className="mt-1 text-sm text-[#71717A]">A consulta não encontrou registros.</p>
          </div>
        ) : null}
        {!loading && items.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {items.map((item) => (
              <li key={item.id} className="group/card flex min-h-16 min-w-0 items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-[0_4px_12px_rgba(15,23,42,0.035),0_8px_20px_rgba(15,23,42,0.035)] [transition:transform_220ms_cubic-bezier(0.22,1,0.36,1),border-color_220ms_ease,box-shadow_220ms_ease] hover:border-[#AEBBC9] hover:shadow-[0_8px_20px_rgba(15,23,42,0.075),0_16px_32px_rgba(15,23,42,0.055)] motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <Link to={`/memberships/${item.id}`} aria-label={`Visualizar ${item.full_name || "acesso"}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta/40">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-emerald-50 text-brand-cta" aria-hidden>
                    <Shield className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-brand-ink">{item.full_name || "Não informado"}</span>
                    <span className="mt-[3px] block truncate text-sm text-brand-quiet">{membershipRoleLabel[item.role] || item.role || "Não informado"}</span>
                  </span>
                  <span title="Visualizar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#E2E8F0] bg-white text-[#64748B] [transition:background-color_180ms_ease,color_180ms_ease,border-color_180ms_ease,box-shadow_180ms_ease,transform_180ms_ease] group-hover/card:border-[#C5CED8] hover:!border-[rgba(30,138,58,0.25)] hover:!bg-[rgba(30,138,58,0.08)] hover:!text-[#1E8A3A] hover:!shadow-[0_4px_12px_rgba(30,138,58,0.10)] motion-safe:hover:!-translate-y-px motion-reduce:transition-none motion-reduce:hover:!translate-y-0">
                    <Eye className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {!loading && total > 0 ? (
          <div className="mt-4 border-t border-[#F1F5F9] pt-4">
            <ListPager page={page} pageSize={pageSize} total={total} onPage={setPage} onPageSize={(size) => { setPage(1); setPageSize(size) }} />
          </div>
        ) : null}
      </section>
    </div>
  )
}
