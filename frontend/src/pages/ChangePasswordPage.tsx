import { FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { changePassword } from "@/services/auth.service"

export function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setMessage("")
    if (newPassword !== confirm) {
      setError("A confirmação não confere com a senha nova.")
      return
    }
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword("")
      setNewPassword("")
      setConfirm("")
      setMessage("Senha alterada.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível trocar a senha.")
    }
  }

  return (
    <form className="mx-auto max-w-lg space-y-4" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">Trocar senha</h1>
      <div className="space-y-2">
        <Label htmlFor="current">Senha atual</Label>
        <Input id="current" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="next">Senha nova</Label>
        <Input id="next" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirmar senha</Label>
        <Input id="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={confirm} onChange={(event) => setConfirm(event.target.value)} required />
      </div>
      {message ? <p className="text-sm">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit">Salvar</Button>
    </form>
  )
}
