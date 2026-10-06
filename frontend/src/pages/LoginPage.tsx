import { FormEvent, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"

import { PublicFrame } from "@/components/PublicFrame"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login } from "@/services/auth.service"
import { useAuthStore } from "@/store/auth.store"
import { onlyDigits } from "@/utils/digits"

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const notice = (location.state as { message?: string } | null)?.message || ""
  const [cpf, setCpf] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState(notice)
  const [error, setError] = useState("")

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setMessage("")
    try {
      const session = await login(onlyDigits(cpf), password)
      useAuthStore.getState().setSession(session)
      useAuthStore.getState().setReady(true)
      navigate(session.active_tenant ? "/" : "/select-tenant")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível entrar.")
    }
  }

  return (
    <PublicFrame title="Entrar">
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="cpf">CPF</Label>
          <Input id="cpf" inputMode="numeric" autoComplete="username" value={cpf} onChange={(event) => setCpf(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>
        {message ? <p className="text-sm">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full">Entrar</Button>
        <Link to="/forgot-password" className="block text-center text-sm text-muted-foreground">Esqueci a senha</Link>
        <Link to="/register" className="block text-center text-sm text-muted-foreground">Criar conta</Link>
      </form>
    </PublicFrame>
  )
}
