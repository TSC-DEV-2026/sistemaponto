import { Save, Shield, Trash2 } from "lucide-react"
import { FormEvent, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { SiteSelect } from "@/components/ui/site-select"
import { Spinner } from "@/components/ui/spinner"
import { moduleCardClass, moduleDangerClass, moduleLabelClass, modulePrimaryClass, moduleQuietClass } from "@/components/workforce/module-visual"
import { getMembership, removeMembership, updateMembership } from "@/services/membership.service"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/utils/cn"
import { membershipRoleLabel } from "@/utils/labels"
import type { Membership } from "@/types/api"

const roleOptions = [
  { value: "member", label: "Membro" },
  { value: "manager", label: "Gestor" },
  { value: "admin", label: "Administrador" },
]

export function MembershipDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const roleName = useAuthStore((state) => state.user?.role)
  const isAdmin = roleName === "admin"
  const id = Number(params.id)
  const [item, setItem] = useState<Membership | null>(null)
  const [role, setRole] = useState("member")
  const [loaded, setLoaded] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!roleName || isAdmin) return
    navigate("/", { replace: true })
  }, [roleName, isAdmin, navigate])

  useEffect(() => {
    if (!isAdmin) return
    let active = true
    setLoaded(false)
    setError("")
    getMembership(id)
      .then((row) => {
        if (!active) return
        setItem(row)
        setRole(row.role)
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
  }, [id, isAdmin])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      const saved = await updateMembership(id, role)
      setItem(saved)
      setRole(saved.role)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.")
    }
  }

  async function onDelete() {
    setError("")
    try {
      await removeMembership(id)
      navigate("/memberships")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível excluir.")
    }
  }

  if (!isAdmin) return null

  if (!loaded && !error) {
    return (
      <div className="w-full min-w-0 space-y-5">
        <BackLink to="/memberships" appearance="detail" />
        <section className={cn(moduleCardClass, "flex min-h-[280px] w-full flex-col items-center justify-center gap-3")} role="status">
          <Spinner label="Carregando o acesso" className="h-8 w-8 text-[#1E8A3A]" />
          <p className="text-sm font-medium text-[#64748B]">Carregando o acesso</p>
        </section>
      </div>
    )
  }

  const name = item?.full_name || "Não informado"

  return (
    <div className="w-full min-w-0 space-y-5">
      <BackLink to="/memberships" appearance="detail" />
      <section className={cn(moduleCardClass, "w-full space-y-5")}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
            <Shield className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[#0A0A0A]">{name}</h2>
            <p className="text-sm text-[#64748B]">{item ? membershipRoleLabel[item.role] || item.role : "Acesso"}</p>
          </div>
        </div>
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        {isAdmin && item ? (
          <ActionForm className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label className={moduleLabelClass} htmlFor="role">Papel</Label>
              <SiteSelect id="role" value={role} className="h-12" options={roleOptions} onChange={setRole} />
            </div>
            <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-end">
              {pending ? (
                <>
                  <span className="text-sm text-[#0A0A0A]">Excluir {name}?</span>
                  <Button type="button" className={cn(moduleDangerClass, "h-11 px-4")} onClick={() => void onDelete()}>
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                  <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} onClick={() => setPending(false)}>Cancelar</Button>
                </>
              ) : (
                <Button type="button" className={cn(moduleDangerClass, "h-11 px-4")} onClick={() => setPending(true)}>
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              )}
              <Button type="submit" className={modulePrimaryClass}>
                <Save className="h-4 w-4" />
                Salvar
              </Button>
            </div>
          </ActionForm>
        ) : item ? (
          <div className="flex min-h-[66px] items-center gap-3 rounded-xl border border-[#E8EEEA] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[#E8F7ED] text-[#1E8A3A]" aria-hidden>
              <Shield className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-xs leading-4 text-[#64748B]">Papel</p>
              <p className="mt-0.5 text-[15px] font-semibold leading-5 text-[#111827]">{membershipRoleLabel[item.role] || item.role || "Não informado"}</p>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
