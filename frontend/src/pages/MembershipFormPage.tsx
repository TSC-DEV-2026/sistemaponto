import { Save, Shield } from "lucide-react"
import { FormEvent, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { CpfField } from "@/components/ui/cpf-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteSelect } from "@/components/ui/site-select"
import { moduleCardClass, moduleFieldClass, moduleLabelClass, modulePrimaryClass } from "@/components/workforce/module-visual"
import { createMembership } from "@/services/membership.service"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/utils/cn"
import { onlyDigits } from "@/utils/digits"

const roleOptions = [
  { value: "member", label: "Membro" },
  { value: "manager", label: "Gestor" },
  { value: "admin", label: "Administrador" },
]

export function MembershipFormPage() {
  const navigate = useNavigate()
  const roleName = useAuthStore((state) => state.user?.role)
  const isAdmin = roleName === "admin"
  const [fullName, setFullName] = useState("")
  const [cpf, setCpf] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("member")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!roleName || isAdmin) return
    navigate("/", { replace: true })
  }, [roleName, isAdmin, navigate])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      const created = await createMembership({
        fullName: fullName.trim(),
        cpf: onlyDigits(cpf),
        email: email.trim(),
        role,
      })
      navigate(`/memberships/${created.id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível vincular.")
    }
  }

  if (!isAdmin) return null

  return (
    <div className="w-full min-w-0 space-y-5">
      <BackLink to="/memberships" appearance="detail" />
      <section className={cn(moduleCardClass, "w-full space-y-5")}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
            <Shield className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[#0A0A0A]">Vincular pessoa</h2>
            <p className="text-sm text-[#64748B]">A senha não é definida aqui. A pessoa recebe o convite do autenticador.</p>
          </div>
        </div>
        <ActionForm className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label className={moduleLabelClass} htmlFor="name">Nome</Label>
            <Input id="name" className={moduleFieldClass} value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label className={moduleLabelClass} htmlFor="cpf">CPF</Label>
              <CpfField id="cpf" className={moduleFieldClass} value={cpf} onValueChange={setCpf} required />
            </div>
            <div className="min-w-0 space-y-2">
              <Label className={moduleLabelClass} htmlFor="email">E-mail</Label>
              <Input id="email" className={moduleFieldClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label className={moduleLabelClass} htmlFor="role">Papel</Label>
            <SiteSelect id="role" value={role} className="h-12" options={roleOptions} onChange={setRole} />
          </div>
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          <div className="flex justify-end pt-5">
            <Button type="submit" className={modulePrimaryClass}>
              <Save className="h-4 w-4" />
              Salvar
            </Button>
          </div>
        </ActionForm>
      </section>
    </div>
  )
}
