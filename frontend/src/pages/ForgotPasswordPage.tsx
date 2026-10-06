import { FormEvent, useState } from "react"
import { Link } from "react-router-dom"

import { PublicFrame } from "@/components/PublicFrame"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { forgotPassword } from "@/services/auth.service"

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

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
    <PublicFrame title="Esqueci a senha">
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        {message ? <p className="text-sm">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full">Enviar</Button>
        <Link to="/login" className="block text-center text-sm text-muted-foreground">Voltar ao login</Link>
      </form>
    </PublicFrame>
  )
}
