import { switchTenant } from "@/services/auth.service"
import { useAuthStore } from "@/store/auth.store"

export function TenantSwitcher() {
  const tenants = useAuthStore((state) => state.tenants)
  const activeTenant = useAuthStore((state) => state.activeTenant)

  async function onChange(value: string) {
    const tenantId = Number(value)
    if (!tenantId || tenantId === activeTenant?.id) {
      return
    }
    const session = await switchTenant(tenantId)
    useAuthStore.getState().setSession(session)
    window.location.assign("/")
  }

  if (tenants.length === 0) {
    return null
  }

  return (
    <label className="block space-y-1 text-xs text-muted-foreground">
      Empresa
      <select
        className="h-10 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground"
        value={activeTenant?.id ?? ""}
        onChange={(event) => void onChange(event.target.value)}
      >
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name}
          </option>
        ))}
      </select>
    </label>
  )
}
