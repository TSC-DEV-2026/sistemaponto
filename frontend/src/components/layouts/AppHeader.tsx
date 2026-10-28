import { useEffect, useId, useRef, useState, type AnimationEvent as ReactAnimationEvent, type KeyboardEvent as ReactKeyboardEvent } from "react"
import { Bell, ChevronDown, KeyRound, LogOut, Settings } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"

import { TenantSwitcher } from "@/components/layouts/TenantSwitcher"
import { headingFor } from "@/page-headings"
import { logout } from "@/services/auth.service"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/utils/cn"

type MenuPhase = "closed" | "open" | "closing"

function prefersStill() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function initials(fullName: string) {
  const particles = new Set(["de", "da", "do", "dos", "das", "e"])
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter((part) => part && !particles.has(part.toLocaleLowerCase("pt-BR")))
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("pt-BR"))
    .join("")
}

export function AppHeader() {
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  const navigate = useNavigate()
  const heading = headingFor(location.pathname)
  const menuId = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [phase, setPhase] = useState<MenuPhase>("closed")

  function hideMenu(immediate = false) {
    setPhase((current) => {
      if (current === "closed") return current
      if (immediate || prefersStill()) return "closed"
      return current === "open" ? "closing" : current
    })
  }

  useEffect(() => {
    setPhase("closed")
  }, [location.pathname])

  useEffect(() => {
    if (phase !== "open") return
    root.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus()
  }, [phase])

  useEffect(() => {
    if (phase === "closed") return
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) {
        hideMenu()
      }
    }
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        hideMenu()
        trigger.current?.focus()
      }
    }
    document.addEventListener("mousedown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [phase])

  function onMenuKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[role='menuitem']"))
    const index = items.indexOf(document.activeElement as HTMLElement)
    if (event.key === "ArrowDown") {
      event.preventDefault()
      items[(index + 1) % items.length]?.focus()
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      items[(index - 1 + items.length) % items.length]?.focus()
    } else if (event.key === "Home") {
      event.preventDefault()
      items[0]?.focus()
    } else if (event.key === "End") {
      event.preventDefault()
      items[items.length - 1]?.focus()
    }
  }

  function onMenuAnimationEnd(event: ReactAnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || event.animationName !== "profile-menu-out") return
    setPhase("closed")
  }

  async function sair() {
    setPhase("closed")
    try {
      await logout()
    } finally {
      useAuthStore.getState().clear()
      navigate("/login")
    }
  }

  const mark = user?.full_name ? initials(user.full_name) : ""

  return (
    <header className="flex min-h-20 items-center justify-between gap-3 border-b border-[#E7EBF0] bg-white px-6 md:px-8">
      <div className="min-w-0">
        <h1 className="truncate text-[22px] font-bold tracking-tight text-brand-ink sm:text-2xl">{heading.title}</h1>
        {heading.subtitle ? <p className="mt-1 hidden truncate text-[13px] text-brand-quiet sm:block">{heading.subtitle}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <TenantSwitcher />
        <Link
          to="/notifications"
          aria-label="Notificações"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-[#3F3F46] hover:bg-brand-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta/40"
        >
          <Bell className="h-5 w-5" strokeWidth={1.75} />
        </Link>
        {user?.full_name ? (
          <div className="relative" ref={root}>
            <button
              ref={trigger}
              type="button"
              className={cn(
                "profile-trigger inline-flex max-w-full items-center gap-2 rounded-full border border-[#E7EBF0] bg-white py-1 pl-1 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta/40 sm:pr-3",
                phase === "open" && "profile-trigger-open",
              )}
              aria-haspopup="menu"
              aria-expanded={phase !== "closed"}
              aria-controls={menuId}
              onClick={() => (phase === "open" ? hideMenu() : setPhase("open"))}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-cta text-xs font-semibold text-white" aria-hidden>
                {mark}
              </span>
              <span className="hidden max-w-[180px] truncate text-[13px] font-medium text-brand-ink sm:block">{user.full_name}</span>
              <ChevronDown className="profile-chevron h-4 w-4 shrink-0 text-brand-quiet" strokeWidth={1.75} aria-hidden />
            </button>
            {phase !== "closed" ? (
              <div
                id={menuId}
                role="menu"
                aria-label="Conta"
                data-state={phase === "open" ? "open" : "closing"}
                className="profile-menu absolute right-0 z-30 mt-2 w-[270px] max-w-[calc(100vw-3rem)] origin-top-right rounded-[14px] border border-[#E7EBF0] bg-white p-1.5 shadow-[0_12px_28px_rgba(15,23,42,0.09),0_22px_48px_rgba(15,23,42,0.06)]"
                onKeyDown={onMenuKey}
                onAnimationEnd={onMenuAnimationEnd}
              >
                <div className="flex items-center gap-3 px-2.5 py-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-cta text-xs font-semibold text-white" aria-hidden>
                    {mark}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-brand-ink">{user.full_name}</span>
                    {user.email ? <span className="mt-0.5 block truncate text-xs font-normal text-brand-quiet">{user.email}</span> : null}
                  </span>
                </div>
                <div className="mx-2 my-1 h-px bg-[#E7EBF0]" />
                <Link role="menuitem" to="/settings" className="profile-item flex h-11 items-center gap-3 rounded-lg px-3 text-[13px]" onClick={() => hideMenu()}>
                  <Settings className="profile-item-icon h-[17px] w-[17px] shrink-0" strokeWidth={1.75} />
                  Configurações
                </Link>
                <Link role="menuitem" to="/change-password" className="profile-item flex h-11 items-center gap-3 rounded-lg px-3 text-[13px]" onClick={() => hideMenu()}>
                  <KeyRound className="profile-item-icon h-[17px] w-[17px] shrink-0" strokeWidth={1.75} />
                  Senha
                </Link>
                <div className="mx-2 my-1 h-px bg-[#E7EBF0]" />
                <button role="menuitem" type="button" className="profile-item profile-item-danger flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px]" onClick={() => void sair()}>
                  <LogOut className="profile-item-icon h-[17px] w-[17px] shrink-0" strokeWidth={1.75} />
                  Sair
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  )
}
