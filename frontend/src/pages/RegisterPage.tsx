import { FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, Building2, Lock, Mail, User } from "lucide-react"

import { AuthPrompt, AuthScreen, FieldBlock, authButtonClass } from "@/components/auth-screen"
import { ActionForm } from "@/components/ui/action-form"
import { Button } from "@/components/ui/button"
import { CpfField } from "@/components/ui/cpf-field"
import { Input } from "@/components/ui/input"
import { PasswordField } from "@/components/ui/password-field"
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
  const invalid = error.length > 0

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
    <AuthScreen title="Criar conta" description="Crie sua conta para continuar." side="left">
      <ActionForm className="mt-8" onSubmit={onSubmit}>
        <div className="space-y-5">
        <FieldBlock id="name" label="Nome" icon={User} invalid={invalid}>
          <Input id="name" autoComplete="name" placeholder="Digite seu nome" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
        </FieldBlock>
        <FieldBlock id="cpf" label="CPF" icon={User} invalid={invalid}>
          <CpfField id="cpf" autoComplete="username" placeholder="Digite seu CPF" value={cpf} onValueChange={setCpf} required />
        </FieldBlock>
        <FieldBlock id="email" label="E-mail" icon={Mail} invalid={invalid}>
          <Input id="email" type="email" autoComplete="email" placeholder="Digite seu e-mail" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </FieldBlock>
        <FieldBlock id="company" label="Empresa" icon={Building2} invalid={invalid}>
          <Input id="company" autoComplete="organization" placeholder="Digite o nome da empresa" value={companyName} onChange={(event) => setCompanyName(event.target.value)} required />
        </FieldBlock>
        <FieldBlock id="password" label="Senha" icon={Lock} invalid={invalid} password>
          <PasswordField id="password" autoComplete="new-password" placeholder="Digite sua senha" minLength={8} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} required />
        </FieldBlock>
        {invalid ? <p className="text-sm text-brand-danger" role="alert">{error}</p> : null}
        </div>
        <Button type="submit" className={authButtonClass}>
          Cadastrar
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </ActionForm>
      <AuthPrompt hint="Já tem uma conta?" action="Entrar" to="/login" />
    </AuthScreen>
  )
}
