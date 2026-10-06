import { FormEvent, useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createTenant, listTenants } from "@/services/tenant.service"
import { useAuthStore } from "@/store/auth.store"
import type { Tenant } from "@/types/api"
import { onlyDigits } from "@/utils/digits"

export function TenantsPage() {
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin"
  const [items, setItems] = useState<Tenant[]>([])
  const [name, setName] = useState("")
  const [document, setDocument] = useState("")
  const [error, setError] = useState("")

  async function load() {
    const page = await listTenants()
    setItems(page.items)
  }

  useEffect(() => {
    load().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
    })
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      await createTenant(name.trim(), onlyDigits(document))
      setName("")
      setDocument("")
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível criar.")
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Empresas</h1>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {items.map((item) => (
          <li key={item.id}>
            <Link to={`/tenants/${item.id}`} className="block px-4 py-3 text-sm">
              <span className="font-medium">{item.name}</span>
              <span className="ml-2 text-muted-foreground">{item.document || "sem CNPJ"}</span>
            </Link>
          </li>
        ))}
      </ul>
      {isAdmin ? (
        <form className="max-w-lg space-y-3" onSubmit={onSubmit}>
          <h2 className="text-sm font-medium">Nova empresa</h2>
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="document">CNPJ</Label>
            <Input id="document" inputMode="numeric" value={document} onChange={(event) => setDocument(event.target.value)} required />
          </div>
          <Button type="submit">Criar</Button>
        </form>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
