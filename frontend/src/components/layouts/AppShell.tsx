import { KeyRound, LogOut } from "lucide-react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"

import { TenantSwitcher } from "@/components/layouts/TenantSwitcher"
import { Button } from "@/components/ui/button"
import { dashboardItem, navGroups } from "@/navigation"
import { logout } from "@/services/auth.service"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/utils/cn"

function isActive(pathname: string, to: string) {
  if (to === "/") {
    return pathname === "/"
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function AppShell() {
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  const navigate = useNavigate()
  const DashboardIcon = dashboardItem.icon

  async function sair() {
    try {
      await logout()
    } finally {
      useAuthStore.getState().clear()
      navigate("/login")
    }
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      <aside className="flex max-h-[45vh] flex-col overflow-y-auto border-b border-border bg-card md:max-h-none md:min-h-screen md:border-b-0 md:border-r">
        <div className="px-4 py-4">
          <p className="text-sm font-semibold">sistemaponto</p>
          <p className="truncate text-xs text-muted-foreground">{user?.full_name}</p>
        </div>
        <nav className="flex flex-col gap-3 px-2">
          <Link
            to={dashboardItem.to}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm",
              isActive(location.pathname, dashboardItem.to) && "bg-muted font-medium",
            )}
          >
            <DashboardIcon className="h-4 w-4" />
            {dashboardItem.label}
          </Link>
          {navGroups.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              <p className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                      isActive(location.pathname, item.to) && "bg-muted font-medium",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="mt-auto space-y-3 p-4">
          <TenantSwitcher />
          <Link to="/change-password" className="inline-flex items-center gap-2 text-sm">
            <KeyRound className="h-4 w-4" />
            Senha
          </Link>
          <Button type="button" variant="ghost" size="sm" onClick={() => void sair()}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>
      <main className="px-4 py-6 md:px-8">
        <Outlet />
      </main>
    </div>
  )
}
