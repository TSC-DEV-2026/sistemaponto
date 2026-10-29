import { useLayoutEffect, useRef, useState } from "react"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Link, Outlet, useLocation } from "react-router-dom"

import { AppHeader } from "@/components/layouts/AppHeader"
import { dashboardItem, navGroups, type NavItem } from "@/navigation"
import { useAuthStore } from "@/store/auth.store"

const STORAGE_KEY = "sistemaponto.sidebar"

function isActive(pathname: string, to: string) {
  if (to === "/") {
    return pathname === "/"
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}

function readCollapsed() {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(STORAGE_KEY) === "collapsed"
}

type Indicator = { x: number; y: number; h: number; flush: boolean; anchor: "center" | "link" }

function useActiveIndicator(pathname: string, collapsed: boolean, role: string | null | undefined) {
  const navRef = useRef<HTMLElement>(null)
  const collapsedRef = useRef(collapsed)
  const [indicator, setIndicator] = useState<Indicator | null>(null)
  const [animate, setAnimate] = useState(false)

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return

    const sidebarChanged = collapsedRef.current !== collapsed
    collapsedRef.current = collapsed
    if (sidebarChanged) setAnimate(false)

    const measure = () => {
      const link = nav.querySelector<HTMLElement>('[data-active="true"]')
      if (!link) {
        setIndicator(null)
        return
      }
      const first = nav.querySelector<HTMLElement>(".app-nav-link")
      const desktop = window.matchMedia("(min-width: 768px)").matches
      const aside = nav.closest<HTMLElement>(".app-sidebar")
      const collapsedNow = aside?.dataset.collapsed === "true"
      setIndicator({
        x: link.offsetLeft,
        y: link.offsetTop,
        h: link.offsetHeight,
        flush: desktop && first === link,
        anchor: desktop && collapsedNow ? "center" : "link",
      })
    }

    measure()
    const link = nav.querySelector<HTMLElement>('[data-active="true"]')
    const scroll = nav.closest<HTMLElement>(".app-sidebar-scroll")
    if (link && scroll) {
      const linkBox = link.getBoundingClientRect()
      const scrollBox = scroll.getBoundingClientRect()
      const margin = 12
      if (linkBox.bottom > scrollBox.bottom - margin) {
        scroll.scrollTop += linkBox.bottom - (scrollBox.bottom - margin)
      } else if (linkBox.top < scrollBox.top + margin) {
        scroll.scrollTop -= scrollBox.top + margin - linkBox.top
      }
    }
    const observer = new ResizeObserver(measure)
    observer.observe(nav)
    const aside = nav.closest<HTMLElement>(".app-sidebar")
    if (aside) observer.observe(aside)
    const desktopQuery = window.matchMedia("(min-width: 768px)")
    desktopQuery.addEventListener("change", measure)
    const frame = sidebarChanged ? window.requestAnimationFrame(() => setAnimate(true)) : 0
    return () => {
      observer.disconnect()
      desktopQuery.removeEventListener("change", measure)
      window.cancelAnimationFrame(frame)
    }
  }, [pathname, collapsed, role])

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return { navRef, indicator, animate }
}

function SideLink({ item, pathname, collapsed }: { item: Pick<NavItem, "to" | "label" | "icon">; pathname: string; collapsed: boolean }) {
  const active = isActive(pathname, item.to)
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      className="app-nav-link"
      data-active={active ? "true" : "false"}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="app-nav-icon" strokeWidth={1.75} aria-hidden />
      <span className="app-nav-label">{item.label}</span>
    </Link>
  )
}

export function AppShell() {
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const { navRef, indicator, animate } = useActiveIndicator(location.pathname, collapsed, user?.role)

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current
      window.localStorage.setItem(STORAGE_KEY, next ? "collapsed" : "open")
      return next
    })
  }

  return (
    <div className="app-frame min-h-screen" data-collapsed={collapsed ? "true" : "false"}>
      <aside className="app-sidebar" data-collapsed={collapsed ? "true" : "false"}>
        <div className="app-sidebar-scroll">
          <div className="app-brand">
            <p className="app-brand-name">
              sistema<span className="app-brand-point">ponto</span>
            </p>
            <button
              type="button"
              className="app-collapse"
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              onClick={toggleSidebar}
            >
              {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.75} />}
            </button>
          </div>
          <nav className="app-nav" aria-label="Menu principal" ref={navRef}>
            {indicator ? (
              <span
                className="app-nav-active"
                data-animate={animate ? "true" : "false"}
                data-flush={indicator.flush ? "true" : "false"}
                aria-hidden="true"
                style={{
                  top: indicator.y,
                  height: indicator.h,
                  right: 0,
                  left: indicator.anchor === "center" ? "calc(50% - 22px)" : indicator.x,
                }}
              />
            ) : null}
            <SideLink item={dashboardItem} pathname={location.pathname} collapsed={collapsed} />
            {navGroups.map((group) => {
              const items = group.items.filter((item) => !item.adminOnly || user?.role === "admin")
              if (items.length === 0) return null
              return (
                <div key={group.label} className="app-nav-block">
                  <p className="app-nav-group">{group.label}</p>
                  {items.map((item) => (
                    <SideLink key={item.to} item={item} pathname={location.pathname} collapsed={collapsed} />
                  ))}
                </div>
              )
            })}
          </nav>
        </div>
      </aside>
      <div className="flex min-h-screen min-w-0 flex-col bg-brand-paper">
        <AppHeader />
        <main className="min-w-0 w-full flex-1 px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
