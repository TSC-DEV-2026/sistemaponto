import { useState } from "react"

import { Button } from "@/components/ui/button"
import { switchTenant } from "@/services/auth.service"
import { useAuthStore } from "@/store/auth.store"

export function SelectTenantPage() {
  const tenants = useAuthStore((state) => state.tenants)
  const [error, setError] = useState("")

  async function choose(tenantId: number) {
    setError("")
    try {
      const session = await switchTenant(tenantId)
      useAuthStore.getState().setSession(session)
      window.location.assign("/")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível escolher a empresa.")
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 py-10">
      <h1 className="text-xl font-semibold">Escolha a empresa</h1>
      {tenants.map((tenant) => (
        <Button key={tenant.id} type="button" variant="outline" className="w-full justify-start" onClick={() => void choose(tenant.id)}>
          {tenant.name}
        </Button>
      ))}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
