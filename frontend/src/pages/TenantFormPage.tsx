import { Building2, Plus } from "lucide-react"
import { FormEvent, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { CnpjField } from "@/components/ui/cnpj-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { moduleCardClass, moduleFieldClass, moduleLabelClass, modulePrimaryClass } from "@/components/workforce/module-visual"
import { createTenant } from "@/services/tenant.service"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/utils/cn"
import { onlyDigits } from "@/utils/digits"

export function TenantFormPage() {
  const navigate = useNavigate()
  const roleName = useAuthStore((state) => state.user?.role)
  const isAdmin = roleName === "admin"
  const [name, setName] = useState("")
  const [document, setDocument] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!roleName || isAdmin) return
    navigate("/tenants", { replace: true })
  }, [roleName, isAdmin, navigate])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      const created = await createTenant(name.trim(), onlyDigits(document))
      navigate(`/tenants/${created.id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível criar.")
    }
  }

  if (!isAdmin) return null

  return (
    <div className="w-full min-w-0 space-y-5">
      <BackLink to="/tenants" appearance="detail" />
      <section className={cn(moduleCardClass, "w-full space-y-5")}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
            <Building2 className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[#0A0A0A]">Nova empresa</h2>
            <p className="text-sm text-[#64748B]">Informe o nome e o CNPJ.</p>
          </div>
        </div>
        <ActionForm className="space-y-5" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className={moduleLabelClass} htmlFor="name">Nome</Label>
              <Input id="name" className={moduleFieldClass} value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label className={moduleLabelClass} htmlFor="document">CNPJ</Label>
              <CnpjField id="document" className={moduleFieldClass} value={document} onValueChange={setDocument} placeholder="00.000.000/0000-00" required />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          <div className="flex justify-end">
            <Button type="submit" className={modulePrimaryClass}>
              <Plus className="h-4 w-4" />
              Criar
            </Button>
          </div>
        </ActionForm>
      </section>
    </div>
  )
}
