import { useEffect, useId, useRef, useState, type AnimationEvent as ReactAnimationEvent, type KeyboardEvent as ReactKeyboardEvent } from "react"
import { Building2, Check, ChevronDown } from "lucide-react"

import { switchTenant } from "@/services/auth.service"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/utils/cn"

type MenuPhase = "closed" | "open" | "closing"

function prefersStill() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function TenantSwitcher() {
  const tenants = useAuthStore((state) => state.tenants)
  const activeTenant = useAuthStore((state) => state.activeTenant)
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
    if (phase !== "open") return
    root.current?.querySelector<HTMLElement>("[role='menuitemradio']")?.focus()
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
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[role='menuitemradio']"))
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

  async function onChoose(tenantId: number) {
    if (!tenantId || tenantId === activeTenant?.id) {
      hideMenu()
      return
    }
    const session = await switchTenant(tenantId)
    useAuthStore.getState().setSession(session)
    window.location.assign("/")
  }

  if (tenants.length === 0) {
    return null
  }

  const currentName = activeTenant?.name || "Empresa"

  return (
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
        aria-label={`Empresa, ${currentName}`}
        onClick={() => (phase === "open" ? hideMenu() : setPhase("open"))}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F6EE] text-[#1E8A3A]" aria-hidden>
          <Building2 className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span className="hidden max-w-[140px] truncate text-[13px] font-medium text-brand-ink sm:block">{currentName}</span>
        <ChevronDown className="profile-chevron h-4 w-4 shrink-0 text-brand-quiet" strokeWidth={1.75} aria-hidden />
      </button>
      {phase !== "closed" ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Empresa"
          data-state={phase === "open" ? "open" : "closing"}
          className="profile-menu absolute right-0 z-30 mt-2 w-[270px] max-w-[calc(100vw-3rem)] origin-top-right rounded-[14px] border border-[#E7EBF0] bg-white p-1.5 shadow-[0_12px_28px_rgba(15,23,42,0.09),0_22px_48px_rgba(15,23,42,0.06)]"
          onKeyDown={onMenuKey}
          onAnimationEnd={onMenuAnimationEnd}
        >
          <div className="px-2.5 py-2">
            <p className="text-xs font-medium text-brand-quiet">Empresa</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-brand-ink">{currentName}</p>
          </div>
          <div className="mx-2 my-1 h-px bg-[#E7EBF0]" />
          {tenants.map((tenant) => {
            const selected = tenant.id === activeTenant?.id
            return (
              <button
                key={tenant.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className="profile-item flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px]"
                onClick={() => void onChoose(tenant.id)}
              >
                <Building2 className="profile-item-icon h-[17px] w-[17px] shrink-0" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 truncate">{tenant.name}</span>
                {selected ? <Check className="h-4 w-4 shrink-0 text-[#1E8A3A]" strokeWidth={1.75} aria-hidden /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
