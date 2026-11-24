import { Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { switchTenant } from "@/services/auth.service"
import { useAuthStore } from "@/store/auth.store"

export function SelectTenantPage() {
  const tenants = useAuthStore((state) => state.tenants)

  async function choose(tenantId: number) {
    try {
      const session = await switchTenant(tenantId)
      useAuthStore.getState().setSession(session)
      window.location.assign("/")
    } catch {
      // O interceptor já avisou o erro.
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 py-10">
      <h1 className="text-xl font-semibold">Escolha a organização</h1>
      {tenants.map((tenant) => (
        <Button key={tenant.id} type="button" variant="outline" className="w-full justify-start" onClick={() => choose(tenant.id)}>
          <Layers className="h-4 w-4" />
          {tenant.name}
        </Button>
      ))}
    </div>
  )
}
