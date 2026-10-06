import { Navigate, Outlet } from "react-router-dom"

import { useAuthStore } from "@/store/auth.store"

export function TenantRoute() {
  const activeTenant = useAuthStore((state) => state.activeTenant)
  if (!activeTenant) {
    return <Navigate to="/select-tenant" replace />
  }
  return <Outlet />
}
