import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { listMemberships } from "@/services/membership.service"
import { useAuthStore } from "@/store/auth.store"
import type { Membership } from "@/types/api"

export function MembershipsPage() {
  const role = useAuthStore((state) => state.user?.role)
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [items, setItems] = useState<Membership[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    listMemberships()
      .then((page) => {
        if (active) {
          setItems(page.items)
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
        }
      })
    return () => {
      active = false
    }
  }, [tenantId])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Permissões e Acessos</h1>
          <p className="text-sm text-muted-foreground">Quem entra neste sistema. O funcionário fica em Pessoas.</p>
        </div>
        {role === "admin" ? (
          <Button asChild>
            <Link to="/memberships/new">Vincular</Link>
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {items.map((item) => (
          <li key={item.id}>
            <Link to={`/memberships/${item.id}`} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>
                {item.person_id} — {item.full_name}
              </span>
              <span className="text-muted-foreground">{item.role}</span>
            </Link>
          </li>
        ))}
        {items.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhum vínculo.</li> : null}
      </ul>
    </div>
  )
}
