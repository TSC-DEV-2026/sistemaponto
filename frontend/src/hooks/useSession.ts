import { useEffect } from "react"

import { me } from "@/services/auth.service"
import { useAuthStore } from "@/store/auth.store"

let hydration: Promise<void> | null = null

function hydrate(): Promise<void> {
  if (!hydration) {
    hydration = me()
      .then((user) => {
        useAuthStore.getState().setSession(user)
      })
      .catch(() => {
        useAuthStore.getState().clear()
      })
      .finally(() => {
        useAuthStore.getState().setReady(true)
      })
  }
  return hydration
}

export function useSession() {
  const ready = useAuthStore((state) => state.ready)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const activeTenant = useAuthStore((state) => state.activeTenant)

  useEffect(() => {
    void hydrate()
  }, [])

  return { ready, isAuthenticated, activeTenant }
}
