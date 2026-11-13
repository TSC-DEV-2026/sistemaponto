import { Layers, FileText, Pencil, Save, Trash2, type LucideIcon } from "lucide-react"
import { FormEvent, useEffect, useState, type ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { CnpjField } from "@/components/ui/cnpj-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { moduleCardClass, moduleDangerClass, moduleFieldClass, moduleLabelClass, modulePrimaryClass, moduleQuietClass } from "@/components/workforce/module-visual"
import { getTenant, removeTenant, updateTenant } from "@/services/tenant.service"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/utils/cn"
import { formatCnpj, onlyDigits } from "@/utils/digits"

function Fact({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-[66px] w-full min-w-0 items-center gap-3 rounded-xl border border-[#E8EEEA] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[#E8F7ED] text-[#1E8A3A]" aria-hidden>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-xs leading-4 text-[#64748B]">{label}</p>
        <p className="mt-0.5 min-w-0 text-[15px] font-semibold leading-5 text-[#111827] [overflow-wrap:anywhere]">{children}</p>
      </div>
    </div>
  )
}

export function TenantDetailPage({ mode }: { mode: "view" | "edit" }) {
  const params = useParams()
  const navigate = useNavigate()
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin"
  const activeId = useAuthStore((state) => state.activeTenant?.id)
  const id = Number(params.id)
  const [name, setName] = useState("")
  const [document, setDocument] = useState("")
  const [error, setError] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const canEdit = isAdmin && activeId === id

  useEffect(() => {
    let active = true
    setLoaded(false)
    getTenant(id)
      .then((row) => {
        if (!active) return
        setName(row.name)
        setDocument(formatCnpj(row.document || ""))
        setLoaded(true)
      })
      .catch((caught: unknown) => {
        if (!active) return
        setLoaded(true)
        setError(caught instanceof Error ? caught.message : "Não foi possível carregar.")
      })
    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    if (mode === "edit" && loaded && !canEdit && !error) {
      navigate(`/tenants/${id}`, { replace: true })
    }
  }, [mode, loaded, canEdit, error, id, navigate])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      const saved = await updateTenant(id, name.trim(), onlyDigits(document))
      setName(saved.name)
      setDocument(formatCnpj(saved.document || ""))
      navigate(`/tenants/${id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.")
    }
  }

  async function onDelete() {
    setError("")
    try {
      await removeTenant(id)
      navigate("/tenants")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível excluir.")
    }
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink to="/tenants" appearance="detail" />
        {mode === "view" && canEdit ? (
          <Button asChild variant="outline" className="h-10 gap-2 rounded-[10px] border-[#E2E8F0] bg-white px-3.5 text-sm font-semibold text-[#111827] shadow-[0_2px_6px_rgba(15,23,42,0.04)] transition-[background-color,border-color,color] duration-200 hover:border-[rgba(30,138,58,0.25)] hover:bg-[#EAF7EF] hover:text-[#086B35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30 motion-reduce:transition-none">
            <Link to={`/tenants/${id}/edit`}>
              <Pencil className="h-4 w-4" strokeWidth={1.75} />
              Editar
            </Link>
          </Button>
        ) : null}
      </div>
      <section className={cn(moduleCardClass, "space-y-5")}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
            <Layers className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[#0A0A0A]">{loaded && name.trim() ? name : "Organização"}</h2>
            <p className="text-sm text-[#64748B]">{mode === "edit" ? "Atualize os dados da organização." : "Dados da organização."}</p>
          </div>
        </div>
        {!loaded ? (
          <div className="flex justify-center py-10" role="status">
            <Spinner label="Carregando a organização" className="h-8 w-8 text-[#1E8A3A]" />
          </div>
        ) : mode === "view" ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Fact icon={Layers} label="Nome">{name.trim() ? name : <span className="font-medium text-[#94A3B8]">Não informado</span>}</Fact>
              <Fact icon={FileText} label="CNPJ">{document ? document : <span className="font-medium text-[#94A3B8]">Não informado</span>}</Fact>
            </div>
            {!canEdit ? <p className="text-sm text-[#64748B]">Troque para esta organização para editá-la.</p> : null}
            {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          </>
        ) : (
          <ActionForm className="space-y-5" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className={moduleLabelClass} htmlFor="name">Nome</Label>
                <Input id="name" className={moduleFieldClass} value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label className={moduleLabelClass} htmlFor="document">CNPJ</Label>
                <CnpjField id="document" className={moduleFieldClass} value={document} onValueChange={setDocument} placeholder="00.000.000/0000-00" />
              </div>
            </div>
            {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
            {confirming ? (
              <div className="flex flex-col gap-3 rounded-xl border border-[#F3D7A1] bg-[#FFF8EB] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[#8A5A00]">Excluir esta organização?</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" className={cn(moduleQuietClass, "h-11 px-4")} onClick={() => setConfirming(false)}>Cancelar</Button>
                  <Button type="button" className={cn(moduleDangerClass, "h-11 px-4")} onClick={() => onDelete()}>
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" className={cn(moduleQuietClass, "h-11 px-4")} onClick={() => setConfirming(true)}>
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
                <Button type="submit" className={modulePrimaryClass}>
                  <Save className="h-4 w-4" />
                  Salvar
                </Button>
              </div>
            )}
          </ActionForm>
        )}
      </section>
    </div>
  )
}
