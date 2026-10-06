import { create } from "zustand"

import type { SessionUser, Tenant } from "@/types/api"

type AuthState = {
  user: SessionUser | null
  isAuthenticated: boolean
  ready: boolean
  activeTenant: Tenant | null
  tenants: Tenant[]
  setSession: (user: SessionUser) => void
  clear: () => void
  setReady: (ready: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  ready: false,
  activeTenant: null,
  tenants: [],
  setSession: (user) =>
    set({
      user,
      isAuthenticated: true,
      activeTenant: user.active_tenant,
      tenants: user.tenants,
    }),
  clear: () => set({ user: null, isAuthenticated: false, activeTenant: null, tenants: [] }),
  setReady: (ready) => set({ ready }),
}))
