import { FormEvent, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

import { PublicFrame } from "@/components/PublicFrame"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resetPassword } from "@/services/auth.service"

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const [token] = useState(() => params.get("token") || "")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  if (token && window.location.search.includes("token=")) {
    window.history.replaceState({}, "", "/reset-password")
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setMessage("")
    if (password !== confirm) {
      setError("A confirmação não confere com a senha nova.")
      return
    }
    if (!token) {
      setError("Token ausente. Abra o link enviado por e-mail.")
      return
    }
    try {
      await resetPassword(token, password)
      setMessage("Senha definida. Você já pode entrar.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível definir a senha.")
    }
  }

  return (
    <PublicFrame title="Definir senha">
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="password">Senha nova</Label>
          <Input id="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar senha</Label>
          <Input id="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={confirm} onChange={(event) => setConfirm(event.target.value)} required />
        </div>
        {message ? <p className="text-sm">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full">Salvar</Button>
        <Link to="/login" className="block text-center text-sm text-muted-foreground">Ir para o login</Link>
      </form>
    </PublicFrame>
  )
}
