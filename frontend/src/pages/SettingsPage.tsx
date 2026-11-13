import { Bell, Layers, ChevronRight, IdCard, KeyRound, Mail, Pencil, Save, Send, Shield, User, type LucideIcon } from "lucide-react"
import { FormEvent, useEffect, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { moduleCardClass, moduleFieldClass, moduleLabelClass, modulePrimaryClass, moduleQuietClass } from "@/components/workforce/module-visual"
import { me, resendVerification, updateAccount } from "@/services/auth.service"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/utils/cn"
import { formatCpf } from "@/utils/digits"

function shown(value: string | undefined) {
  const text = (value || "").trim()
  return text ? text : <span className="font-medium text-[#94A3B8]">Não informado</span>
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function IconTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
      <Icon className="h-5 w-5" strokeWidth={1.75} />
    </span>
  )
}

function AccountFact({ icon: Icon, label, value, wrap = false }: { icon: LucideIcon; label: string; value: ReactNode; wrap?: boolean }) {
  return (
    <div className="flex min-h-[66px] min-w-0 items-center gap-3 rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-3">
      <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[#EAF7EF] text-[#1E8A3A]" aria-hidden>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-xs leading-4 text-[#64748B]">{label}</p>
        <p className={cn("mt-0.5 text-[15px] font-semibold leading-5 text-[#0A0A0A]", wrap ? "break-all" : "truncate")}>{value}</p>
      </div>
    </div>
  )
}

const management = [
  { icon: Layers, title: "Organizações", text: "Gerenciar organizações.", to: "/tenants", admin: false },
  { icon: Bell, title: "Notificações", text: "Configurações de notificações.", to: "/notifications", admin: false },
  { icon: Shield, title: "Permissões e acessos", text: "Gerenciar acessos.", to: "/memberships", admin: true },
] as const

export function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const setSession = useAuthStore((state) => state.setSession)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.full_name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [resendEmail, setResendEmail] = useState(user?.email || "")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loaded, setLoaded] = useState(Boolean(user))

  useEffect(() => {
    let active = true
    me()
      .then((next) => {
        if (!active) return
        setSession(next)
        setName(next.full_name)
        setEmail(next.email)
        setResendEmail(next.email)
        setLoaded(true)
      })
      .catch((caught: unknown) => {
        if (active) {
          setLoaded(true)
          setError(caught instanceof Error ? caught.message : "Não foi possível carregar a conta.")
        }
      })
    return () => {
      active = false
    }
  }, [setSession])

  async function onSave(event: FormEvent) {
    event.preventDefault()
    setError("")
    setMessage("")
    try {
      const saved = await updateAccount(name.trim(), email.trim())
      setSession(saved)
      setName(saved.full_name)
      setEmail(saved.email)
      setResendEmail(saved.email)
      setEditing(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.")
    }
  }

  async function onResend(event: FormEvent) {
    event.preventDefault()
    setError("")
    setMessage("")
    try {
      const result = await resendVerification(resendEmail.trim())
      setMessage(result.message)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível reenviar.")
    }
  }

  const verified = Boolean(user?.email_verified)
  const displayName = user?.full_name || ""
  const links = management.filter((item) => !item.admin || user?.role === "admin")

  return (
    <div className="w-full min-w-0 space-y-4">
      <section className={cn(moduleCardClass, "space-y-5")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EAF7EF] text-sm font-semibold text-[#1E8A3A]" aria-hidden>
              {initials(displayName)}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-[#0A0A0A]">{displayName.trim() || "Minha conta"}</h2>
              <p className="text-sm text-[#64748B]">Informações do perfil</p>
            </div>
          </div>
          {loaded && user && !editing ? (
            <Button
              type="button"
              className={cn(moduleQuietClass, "h-11 w-full px-4 sm:w-auto")}
              onClick={() => {
                setName(user.full_name || "")
                setEmail(user.email || "")
                setEditing(true)
                setError("")
              }}
            >
              <Pencil className="h-4 w-4 text-[#1E8A3A]" />
              Editar
            </Button>
          ) : null}
        </div>
        {!loaded ? (
          <div className="flex justify-center py-10" role="status">
            <Spinner label="Carregando a conta" className="h-8 w-8 text-[#1E8A3A]" />
          </div>
        ) : null}
        {loaded && user && editing ? (
          <ActionForm className="space-y-4" onSubmit={onSave}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className={moduleLabelClass} htmlFor="account-name">Nome</Label>
                <Input id="account-name" className={moduleFieldClass} value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label className={moduleLabelClass} htmlFor="account-email">E-mail</Label>
                <Input id="account-email" className={moduleFieldClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
            </div>
            <AccountFact icon={IdCard} label="CPF" value={shown(formatCpf(user.cpf || ""))} />
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                className={cn(moduleQuietClass, "h-11 px-4")}
                onClick={() => {
                  setName(user.full_name || "")
                  setEmail(user.email || "")
                  setEditing(false)
                  setError("")
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" className={modulePrimaryClass}>
                <Save className="h-4 w-4" />
                Salvar
              </Button>
            </div>
          </ActionForm>
        ) : null}
        {loaded && user && !editing ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <AccountFact icon={User} label="Nome" value={shown(user.full_name)} />
            <AccountFact icon={Mail} label="E-mail" value={shown(user.email)} wrap />
            <AccountFact icon={IdCard} label="CPF" value={shown(formatCpf(user.cpf || ""))} />
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className={cn(moduleCardClass, "space-y-4")}>
          <div className="flex items-center gap-3">
            <IconTile icon={Mail} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#0A0A0A]">Verificação de e-mail</h2>
                {loaded && user ? (
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", verified ? "bg-[#EAF7EF] text-[#1E8A3A]" : "bg-[#F4F4F5] text-[#64748B]")}>
                    {verified ? "Confirmado" : "Não confirmado"}
                  </span>
                ) : null}
              </div>
              {loaded && user && !verified ? <p className="text-sm text-[#64748B]">O acesso não depende dessa confirmação.</p> : null}
            </div>
          </div>
          {!loaded ? (
            <div className="flex justify-center py-8" role="status">
              <Spinner label="Carregando a verificação" className="h-8 w-8 text-[#1E8A3A]" />
            </div>
          ) : user ? (
            <>
              <ActionForm className="space-y-3" onSubmit={onResend}>
                <div className="space-y-2">
                  <Label className={moduleLabelClass} htmlFor="email">E-mail</Label>
                  <Input id="email" className={cn(moduleFieldClass, "h-[46px]")} type="email" value={resendEmail} onChange={(event) => setResendEmail(event.target.value)} required />
                </div>
                {message ? <p className="text-sm text-[#1E8A3A]" role="status">{message}</p> : null}
                <div className="flex justify-end">
                  <Button type="submit" className={cn(moduleQuietClass, "h-11 px-4")}>
                    <Send className="h-4 w-4" />
                    Reenviar
                  </Button>
                </div>
              </ActionForm>
            </>
          ) : null}
        </section>

        <section className={cn(moduleCardClass, "space-y-4")}>
          <div className="flex items-center gap-3">
            <IconTile icon={KeyRound} />
            <h2 className="text-lg font-semibold text-[#0A0A0A]">Segurança</h2>
          </div>
          <p className="text-sm leading-6 text-[#64748B]">Gerencie a senha de acesso à sua conta.</p>
          <Link
            to="/change-password"
            className="group flex min-h-16 items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-[0_4px_12px_rgba(15,23,42,0.035)] transition-[border-color,box-shadow] duration-200 hover:border-[#AEBBC9] hover:shadow-[0_8px_20px_rgba(15,23,42,0.075)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30 motion-reduce:transition-none"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
              <KeyRound className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1 text-sm font-semibold text-[#0A0A0A]">Trocar senha</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#64748B] transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden />
          </Link>
        </section>
      </div>

      <section className={cn(moduleCardClass, "space-y-4")}>
        <h2 className="text-lg font-semibold text-[#0A0A0A]">Gerenciamento do sistema</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className="group flex min-h-16 items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-[0_4px_12px_rgba(15,23,42,0.035)] transition-[border-color,box-shadow] duration-200 hover:border-[#AEBBC9] hover:shadow-[0_8px_20px_rgba(15,23,42,0.075)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30 motion-reduce:transition-none"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-[#0A0A0A]">{item.title}</span>
                  <span className="mt-0.5 block text-sm text-[#64748B]">{item.text}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#64748B] transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden />
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
