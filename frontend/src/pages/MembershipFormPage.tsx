import { FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createMembership } from "@/services/membership.service"
import { onlyDigits } from "@/utils/digits"

export function MembershipFormPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState("")
  const [cpf, setCpf] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("member")
  const [error, setError] = useState("")

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

  return (
    <form className="mx-auto max-w-lg space-y-4" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">Vincular pessoa</h1>
      <p className="text-sm text-muted-foreground">A senha não é definida aqui. A pessoa recebe o convite do autenticador. O gestor aprova solicitações da própria equipe. O administrador também pode.</p>
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cpf">CPF</Label>
        <Input id="cpf" inputMode="numeric" value={cpf} onChange={(event) => setCpf(event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Papel</Label>
        <select id="role" className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm" value={role} onChange={(event) => setRole(event.target.value)}>
          <option value="member">Membro</option>
          <option value="manager">Gestor</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit">Salvar</Button>
    </form>
  )
}
