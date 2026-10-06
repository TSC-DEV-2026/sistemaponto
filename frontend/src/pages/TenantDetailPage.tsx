import { FormEvent, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getTenant, removeTenant, updateTenant } from "@/services/tenant.service"
import { useAuthStore } from "@/store/auth.store"
import { onlyDigits } from "@/utils/digits"

export function TenantDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin"
  const activeId = useAuthStore((state) => state.activeTenant?.id)
  const id = Number(params.id)
  const [name, setName] = useState("")
  const [document, setDocument] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    getTenant(id)
      .then((row) => {
        if (active) {
          setName(row.name)
          setDocument(row.document || "")
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Não foi possível carregar.")
        }
      })
    return () => {
      active = false
    }
  }, [id])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      await updateTenant(id, name.trim(), onlyDigits(document))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.")
    }
  }

  async function onDelete() {
    setError("")
    try {
      await removeTenant(id)
      navigate("/tenants")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível excluir.")
    }
  }

  const canEdit = isAdmin && activeId === id

  return (
    <form className="mx-auto max-w-lg space-y-4" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">Empresa</h1>
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" value={name} onChange={(event) => setName(event.target.value)} disabled={!canEdit} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="document">CNPJ</Label>
        <Input id="document" value={document} onChange={(event) => setDocument(event.target.value)} disabled={!canEdit} />
      </div>
      {!canEdit ? <p className="text-sm text-muted-foreground">Troque para esta empresa para editá-la.</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {canEdit ? (
        <div className="flex gap-2">
          <Button type="submit">Salvar</Button>
          <Button type="button" variant="destructive" onClick={() => void onDelete()}>Excluir</Button>
        </div>
      ) : null}
    </form>
  )
}
