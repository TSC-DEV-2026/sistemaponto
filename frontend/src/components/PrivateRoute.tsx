import { Navigate, Outlet } from "react-router-dom"

import { useSession } from "@/hooks/useSession"

export function PrivateRoute() {
  const { ready, isAuthenticated } = useSession()
  if (!ready) {
    return null
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
