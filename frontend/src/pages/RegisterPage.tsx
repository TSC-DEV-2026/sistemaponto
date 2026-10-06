import { FormEvent, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { PublicFrame } from "@/components/PublicFrame"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { register } from "@/services/auth.service"
import { useAuthStore } from "@/store/auth.store"
import { onlyDigits } from "@/utils/digits"

export function RegisterPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState("")
  const [cpf, setCpf] = useState("")
  const [email, setEmail] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      const session = await register({
        fullName: fullName.trim(),
        cpf: onlyDigits(cpf),
        email: email.trim(),
        companyName: companyName.trim(),
        password,
      })
      if (session.must_login) {
        navigate("/login", { state: { message: "Este CPF já tem senha. Entre com ela para acessar a empresa nova." } })
        return
      }
      useAuthStore.getState().setSession(session)
      useAuthStore.getState().setReady(true)
      navigate("/")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível cadastrar.")
    }
  }

  return (
    <PublicFrame title="Criar conta">
      <form className="space-y-4" onSubmit={onSubmit}>
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
          <Label htmlFor="company">Empresa</Label>
          <Input id="company" value={companyName} onChange={(event) => setCompanyName(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full">Cadastrar</Button>
        <Link to="/login" className="block text-center text-sm text-muted-foreground">Já tenho conta</Link>
      </form>
    </PublicFrame>
  )
}
