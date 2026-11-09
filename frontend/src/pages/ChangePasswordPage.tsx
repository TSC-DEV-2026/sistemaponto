import { KeyRound, Save } from "lucide-react"
import { FormEvent, useState } from "react"

import { ActionForm } from "@/components/ui/action-form"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PasswordField } from "@/components/ui/password-field"
import { moduleCardClass, moduleFieldClass, moduleLabelClass, modulePrimaryClass } from "@/components/workforce/module-visual"
import { changePassword } from "@/services/auth.service"
import { cn } from "@/utils/cn"

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
    <div className="w-full min-w-0 space-y-5">
      <BackLink to="/settings" appearance="detail" />
      <ActionForm className={cn(moduleCardClass, "space-y-5")} onSubmit={onSubmit}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
            <KeyRound className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[#0A0A0A]">Trocar senha</h2>
            <p className="text-sm text-[#64748B]">Altere a senha de acesso.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label className={moduleLabelClass} htmlFor="current">Senha atual</Label>
            <PasswordField id="current" className={moduleFieldClass} autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label className={moduleLabelClass} htmlFor="next">Senha nova</Label>
            <PasswordField id="next" className={moduleFieldClass} autoComplete="new-password" minLength={8} maxLength={72} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label className={moduleLabelClass} htmlFor="confirm">Confirmar senha</Label>
            <PasswordField id="confirm" className={moduleFieldClass} autoComplete="new-password" minLength={8} maxLength={72} value={confirm} onChange={(event) => setConfirm(event.target.value)} required />
          </div>
        </div>
        {message ? <p className="text-sm text-[#1E8A3A]">{message}</p> : null}
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        <div className="flex justify-end">
          <Button type="submit" className={modulePrimaryClass}>
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </div>
      </ActionForm>
    </div>
  )
}
