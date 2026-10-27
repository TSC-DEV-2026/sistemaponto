import { FormEvent, useState } from "react"
import { ArrowRight, Mail } from "lucide-react"

import { AuthPrompt, AuthScreen, FieldBlock, authButtonClass } from "@/components/auth-screen"
import { ActionForm } from "@/components/ui/action-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { forgotPassword } from "@/services/auth.service"

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const invalid = error.length > 0

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setMessage("")
    try {
      const result = await forgotPassword(email.trim())
      setMessage(result.message)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível enviar.")
    }
  }

  return (
    <AuthScreen title="Esqueci a senha" description="Informe o e-mail da sua conta.">
      <ActionForm className="mt-8" onSubmit={onSubmit}>
        <FieldBlock id="email" label="E-mail" icon={Mail} invalid={invalid}>
          <Input id="email" type="email" autoComplete="email" placeholder="Digite seu e-mail" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </FieldBlock>
        {message ? <p className="mt-4 text-sm leading-6 text-[#6E747F]" role="status">{message}</p> : null}
        {invalid ? <p className="mt-4 text-sm text-brand-danger" role="alert">{error}</p> : null}
        <Button type="submit" className={authButtonClass}>
          Enviar
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </ActionForm>
      <AuthPrompt hint="Lembrou a senha?" action="Entrar" to="/login" />
    </AuthScreen>
  )
}
