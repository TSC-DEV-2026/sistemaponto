import { FormEvent, useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

import { PublicFrame } from "@/components/PublicFrame"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resendVerification, verifyEmail } from "@/services/auth.service"

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const [token] = useState(() => params.get("token") || "")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token) {
      return
    }
    window.history.replaceState({}, "", "/verify-email/confirm")
    verifyEmail(token)
      .then(() => setMessage("E-mail confirmado."))
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Não foi possível confirmar o e-mail.")
      })
  }, [token])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setMessage("")
    try {
      const result = await resendVerification(email.trim())
      setMessage(result.message)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível reenviar.")
    }
  }

  return (
    <PublicFrame title="Verificar e-mail">
      {token ? (
        <div className="space-y-4">
          {message ? <p className="text-sm">{message}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!message && !error ? <p className="text-sm text-muted-foreground">Confirmando o link…</p> : null}
          <Link to="/login" className="block text-center text-sm text-muted-foreground">Ir para o login</Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          {message ? <p className="text-sm">{message}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full">Reenviar</Button>
          <Link to="/login" className="block text-center text-sm text-muted-foreground">Voltar ao login</Link>
        </form>
      )}
    </PublicFrame>
  )
}
