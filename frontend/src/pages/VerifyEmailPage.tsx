import { FormEvent, useEffect, useState } from "react"
import { ArrowRight, Mail } from "lucide-react"
import { useSearchParams } from "react-router-dom"

import { AuthPrompt, AuthScreen, FieldBlock, authButtonClass } from "@/components/auth-screen"
import { ActionForm } from "@/components/ui/action-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { resendVerification, verifyEmail } from "@/services/auth.service"

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const [token] = useState(() => params.get("token") || "")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const invalid = error.length > 0

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
    <AuthScreen title="Verificar e-mail" description="Confirme o endereço para continuar.">
      {token ? (
        <div className="mt-8 space-y-4 text-center">
          {message ? <p className="text-sm leading-6 text-[#6E747F]" role="status">{message}</p> : null}
          {error ? <p className="text-sm text-brand-danger" role="alert">{error}</p> : null}
          {!message && !error ? <p className="text-sm leading-6 text-[#6E747F]">Confirmando o link…</p> : null}
        </div>
      ) : (
        <ActionForm className="mt-8" onSubmit={onSubmit}>
          <FieldBlock id="email" label="E-mail" icon={Mail} invalid={invalid}>
            <Input id="email" type="email" autoComplete="email" placeholder="Digite seu e-mail" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </FieldBlock>
          {message ? <p className="mt-4 text-sm leading-6 text-[#6E747F]" role="status">{message}</p> : null}
          {invalid ? <p className="mt-4 text-sm text-brand-danger" role="alert">{error}</p> : null}
          <Button type="submit" className={authButtonClass}>
            Reenviar
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </ActionForm>
      )}
      <AuthPrompt hint="Quer acessar agora?" action="Entrar" to="/login" />
    </AuthScreen>
  )
}