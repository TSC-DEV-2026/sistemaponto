import { FormEvent, useEffect, useState } from "react"
import { ArrowRight, Lock, Mail } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"

import { AuthPrompt, AuthScreen, FieldBlock, authButtonClass } from "@/components/auth-screen"
import { ActionForm } from "@/components/ui/action-form"
import { Button } from "@/components/ui/button"
import { PasswordField } from "@/components/ui/password-field"
import { resetPassword } from "@/services/auth.service"

const REDIRECT_SECONDS = 4

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [token] = useState(() => params.get("token") || "")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [defined, setDefined] = useState(false)
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS)
  const invalid = error.length > 0

  if (token && window.location.search.includes("token=")) {
    window.history.replaceState({}, "", "/reset-password")
  }

  useEffect(() => {
    if (!defined) {
      return
    }
    if (seconds <= 1) {
      const timer = window.setTimeout(() => navigate("/login", { replace: true }), 1000)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => setSeconds((current) => current - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [defined, seconds, navigate])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
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
      setDefined(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível definir a senha.")
    }
  }

  if (defined) {
    return (
      <AuthScreen title="Senha definida" description="Você será direcionado para o login.">
        <PasswordDefined seconds={seconds} />
        <AuthPrompt hint="Quer entrar agora?" action="Entrar" to="/login" />
      </AuthScreen>
    )
  }

  return (
    <AuthScreen title="Definir senha" description="Escolha uma senha nova para continuar.">
      <ActionForm className="mt-8" onSubmit={onSubmit}>
        <div className="space-y-5">
          <FieldBlock id="password" label="Senha nova" icon={Lock} invalid={invalid} password>
            <PasswordField id="password" autoComplete="new-password" placeholder="Digite a senha nova" minLength={8} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} required />
          </FieldBlock>
          <FieldBlock id="confirm" label="Confirmar senha" icon={Lock} invalid={invalid} password>
            <PasswordField id="confirm" autoComplete="new-password" placeholder="Confirme a senha nova" minLength={8} maxLength={72} value={confirm} onChange={(event) => setConfirm(event.target.value)} required />
          </FieldBlock>
          {invalid ? <p className="text-sm text-brand-danger" role="alert">{error}</p> : null}
        </div>
        <Button type="submit" className={authButtonClass}>
          Salvar
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </ActionForm>
      <AuthPrompt hint="Senha pronta?" action="Entrar" to="/login" />
    </AuthScreen>
  )
}

function PasswordDefined({ seconds }: { seconds: number }) {
  const turn = ((REDIRECT_SECONDS - seconds) / REDIRECT_SECONDS) * 360
  const unit = seconds === 1 ? "segundo" : "segundos"

  return (
    <div className="mt-8 flex flex-col items-center">
      <div
        className="flex h-[168px] w-[168px] items-center justify-center rounded-full"
        style={{ background: `conic-gradient(#18944B ${turn}deg, #E7EBF0 0deg)` }}
        aria-hidden
      >
        <div className="flex h-[148px] w-[148px] items-center justify-center rounded-full bg-white">
          <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[#E9FAF4] shadow-[0_12px_30px_rgba(24,148,75,0.14)]">
            <Mail className="h-[58px] w-[58px] text-[#18944B]" strokeWidth={1.5} />
          </div>
        </div>
      </div>
      <p className="mt-7 text-[64px] font-bold leading-none tabular-nums tracking-tight text-[#1B2534]" aria-hidden>
        {seconds}
      </p>
      <p className="mt-2 text-sm font-medium text-[#6E747F]" aria-hidden>
        {unit}
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        Senha definida. Direcionando para o login em {seconds} {unit}.
      </p>
    </div>
  )
}
