import { FormEvent, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { getMembership, removeMembership, updateMembership } from "@/services/membership.service"
import { useAuthStore } from "@/store/auth.store"
import type { Membership } from "@/types/api"

export function MembershipDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin"
  const id = Number(params.id)
  const [item, setItem] = useState<Membership | null>(null)
  const [role, setRole] = useState("member")
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    getMembership(id)
      .then((row) => {
        if (active) {
          setItem(row)
          setRole(row.role)
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
      const saved = await updateMembership(id, role)
      setItem(saved)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.")
    }
  }

  async function onDelete() {
    setError("")
    try {
      await removeMembership(id)
      navigate("/memberships")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível excluir.")
    }
  }

  return (
    <form className="mx-auto max-w-lg space-y-4" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {item ? `${item.person_id} — ${item.full_name}` : ""}
      </h1>
      <div className="space-y-2">
        <Label htmlFor="role">Papel</Label>
        <select id="role" className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm" value={role} onChange={(event) => setRole(event.target.value)} disabled={!isAdmin}>
          <option value="member">Membro</option>
          <option value="manager">Gestor</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {isAdmin ? (
        <div className="flex gap-2">
          <Button type="submit">Salvar</Button>
          <Button type="button" variant="destructive" onClick={() => void onDelete()}>Excluir</Button>
        </div>
      ) : null}
    </form>
  )
}
