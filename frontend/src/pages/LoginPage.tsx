import { FormEvent, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ArrowRight, Lock, User } from "lucide-react"

import { AuthPrompt, AuthScreen, FieldBlock, authButtonClass, authInputClass } from "@/components/auth-screen"
import { ActionForm } from "@/components/ui/action-form"
import { Button } from "@/components/ui/button"
import { CpfField } from "@/components/ui/cpf-field"
import { PasswordField } from "@/components/ui/password-field"
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
  const invalid = error.length > 0

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
    <AuthScreen title="Entrar" description="Acesse sua conta para continuar.">
      {message ? (
        <p className="mt-4 text-center text-sm leading-6 text-brand-muted" role="status">
          {message}
        </p>
      ) : null}

      <ActionForm className="mt-8" onSubmit={onSubmit}>
        <FieldBlock id="cpf" label="CPF" icon={User} invalid={invalid}>
          <CpfField
            id="cpf"
            name="username"
            autoComplete="username"
            placeholder="Digite seu CPF"
            value={cpf}
            onValueChange={setCpf}
            required
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? "login-error" : undefined}
            className={authInputClass(invalid)}
          />
        </FieldBlock>

        <div className="mt-5 space-y-2">
          <FieldBlock id="password" label="Senha" icon={Lock} invalid={invalid} password>
            <PasswordField
              id="password"
              name="password"
              autoComplete="current-password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? "login-error" : undefined}
              className={authInputClass(invalid, true)}
            />
          </FieldBlock>
          {invalid ? (
            <p id="login-error" className="text-sm text-brand-danger" role="alert">
              {error}
            </p>
          ) : null}
          <Link
            to="/forgot-password"
            className="block text-right text-sm font-medium text-[#1E8A3A] transition-colors duration-150 hover:text-[#187432] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30"
          >
            Esqueceu a senha?
          </Link>
        </div>

        <Button type="submit" className={authButtonClass}>
          Entrar
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </ActionForm>

      <AuthPrompt hint="Não tem uma conta?" action="Criar conta" to="/register" />
    </AuthScreen>
  )
}
