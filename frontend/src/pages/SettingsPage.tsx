import { Bell, Building2, KeyRound, Pencil, Save, Shield, Trash2 } from "lucide-react"
import { FormEvent, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { leaveAccount, logout, me, resendVerification, switchTenant, updateAccount } from "@/services/auth.service"
import { useAuthStore } from "@/store/auth.store"
import { formatCpf } from "@/utils/digits"

export function SettingsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const setSession = useAuthStore((state) => state.setSession)
  const [editing, setEditing] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [name, setName] = useState(user?.full_name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [resendEmail, setResendEmail] = useState(user?.email || "")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    me()
      .then((next) => {
        if (!active) return
        setSession(next)
        setName(next.full_name)
        setEmail(next.email)
        setResendEmail(next.email)
      })
      .catch((caught: unknown) => {
        if (active) {
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

  async function onLeave() {
    setError("")
    setMessage("")
    try {
      await leaveAccount()
      const currentId = useAuthStore.getState().activeTenant?.id
      const others = useAuthStore.getState().tenants.filter((tenant) => tenant.id !== currentId)
      if (others.length > 0) {
        const session = await switchTenant(others[0].id)
        setSession(session)
        setName(session.full_name)
        setEmail(session.email)
        setResendEmail(session.email)
        setConfirmLeave(false)
        setEditing(false)
        return
      }
      await logout()
      useAuthStore.getState().clear()
      navigate("/login")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível excluir o acesso.")
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <section className="space-y-4 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium">Minha conta</h2>
        <p className="text-sm text-muted-foreground">
          E-mail {user?.email_verified ? "confirmado" : "ainda não confirmado"}. O acesso não depende dessa confirmação.
        </p>
        {editing ? (
          <ActionForm className="space-y-3" onSubmit={onSave}>
            <div className="space-y-2">
              <Label htmlFor="account-name">Nome</Label>
              <Input id="account-name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-email">E-mail</Label>
              <Input id="account-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">CPF</p>
              <p>{formatCpf(user?.cpf || "")}</p>
            </div>
            <div className="flex gap-2">
              <Button type="submit">
                <Save className="h-4 w-4" />
                Salvar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setName(user?.full_name || "")
                  setEmail(user?.email || "")
                  setEditing(false)
                  setError("")
                }}
              >
                Cancelar
              </Button>
            </div>
          </ActionForm>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Nome</p>
              <p>{user?.full_name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">E-mail</p>
              <p>{user?.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">CPF</p>
              <p>{formatCpf(user?.cpf || "")}</p>
            </div>
            {confirmLeave ? (
              <div className="flex flex-wrap items-center gap-2">
                <span>Excluir o acesso nesta empresa?</span>
                <Button type="button" variant="destructive" onClick={() => onLeave()}>
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirmLeave(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setName(user?.full_name || "")
                    setEmail(user?.email || "")
                    setEditing(true)
                    setError("")
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirmLeave(true)}>
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </div>
            )}
          </div>
        )}
        <ActionForm className="space-y-3" onSubmit={onResend}>
          <Label htmlFor="email">Reenviar verificação</Label>
          <Input id="email" type="email" value={resendEmail} onChange={(event) => setResendEmail(event.target.value)} required />
          {message ? <p className="text-sm">{message}</p> : null}
          <Button type="submit" variant="outline">Reenviar</Button>
        </ActionForm>
        <Button variant="outline" className="w-fit" asChild>
          <Link to="/change-password">
            <KeyRound className="h-4 w-4" />
            Trocar senha
          </Link>
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium">Empresas</h2>
        <Button variant="outline" className="w-fit" asChild>
          <Link to="/tenants">
            <Building2 className="h-4 w-4" />
            Empresas
          </Link>
        </Button>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium">Notificações</h2>
        <Button variant="outline" className="w-fit" asChild>
          <Link to="/notifications">
            <Bell className="h-4 w-4" />
            Notificações
          </Link>
        </Button>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium">Permissões e acessos</h2>
        <Button variant="outline" className="w-fit" asChild>
          <Link to="/memberships">
            <Shield className="h-4 w-4" />
            Permissões e acessos
          </Link>
        </Button>
      </section>
    </div>
  )
}
