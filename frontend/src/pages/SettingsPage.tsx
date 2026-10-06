import { FormEvent, useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resendVerification } from "@/services/auth.service"
import { useAuthStore } from "@/store/auth.store"

export function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const [email, setEmail] = useState(user?.email || "")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

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
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          E-mail {user?.email_verified ? "confirmado" : "ainda não confirmado"}. O acesso não depende dessa confirmação.
        </p>
      </div>
      <div className="flex flex-col gap-2 text-sm">
        <Link to="/tenants">Empresas</Link>
        <Link to="/change-password">Trocar senha</Link>
      </div>
      <form className="space-y-3" onSubmit={onSubmit}>
        <Label htmlFor="email">Reenviar verificação</Label>
        <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        {message ? <p className="text-sm">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" variant="outline">Reenviar</Button>
      </form>
    </div>
  )
}
