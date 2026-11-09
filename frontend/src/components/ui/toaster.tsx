import { useEffect, useRef, useState } from "react"
import { Check, X } from "lucide-react"

import { useToastStore, type ToastKind } from "@/store/toast.store"
import { cn } from "@/utils/cn"

const kinds: Record<ToastKind, { label: string; icon: string; card: string; title: string }> = {
  success: {
    label: "Sucesso",
    icon: "bg-[#16A34A]",
    card: "border-[#22C55E] bg-[#F0FDF4]",
    title: "text-[#15803D]",
  },
  warning: {
    label: "Aviso",
    icon: "bg-[#F59E0B]",
    card: "border-[#F59E0B] bg-[#FFFBEB]",
    title: "text-[#92400E]",
  },
  error: {
    label: "Erro",
    icon: "bg-[#EF4444]",
    card: "border-[#EF4444] bg-[#FEF2F2]",
    title: "text-[#B91C1C]",
  },
}

type ShownToast = {
  id: number
  kind: ToastKind
  message: string
  leaving: boolean
}

function ToastGlyph({ kind }: { kind: ToastKind }) {
  if (kind === "warning") {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
        <rect x="10.6" y="4" width="2.8" height="10.4" rx="1.4" fill="currentColor" />
        <circle cx="12" cy="18.4" r="1.6" fill="currentColor" />
      </svg>
    )
  }
  const Icon = kind === "success" ? Check : X
  return <Icon className="h-[18px] w-[18px]" strokeWidth={2.75} />
}

export function Toaster() {
  const items = useToastStore((state) => state.items)
  const dismiss = useToastStore((state) => state.dismiss)
  const push = useToastStore((state) => state.push)
  const [shown, setShown] = useState<ShownToast[]>([])
  const shownRef = useRef<ShownToast[]>([])
  const exitTimers = useRef(new Map<number, number>())

  useEffect(() => {
    const raw = sessionStorage.getItem("ponto-toast")
    if (!raw) return
    sessionStorage.removeItem("ponto-toast")
    try {
      const saved = JSON.parse(raw) as { kind?: ToastKind; message?: string }
      if (saved.kind && saved.message) push(saved.kind, saved.message)
    } catch {
      sessionStorage.removeItem("ponto-toast")
    }
  }, [push])

  useEffect(() => {
    const timers = exitTimers.current
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      timers.clear()
    }
  }, [])

  useEffect(() => {
    const current = shownRef.current
    const active = new Set(items.map((item) => item.id))
    const removed = current.filter((item) => !active.has(item.id) && !item.leaving)
    const next: ShownToast[] = []
    const seen = new Set<number>()

    for (const item of current) {
      const live = items.find((entry) => entry.id === item.id)
      if (live) {
        next.push({ ...live, leaving: false })
      } else {
        next.push(item.leaving ? item : { ...item, leaving: true })
      }
      seen.add(item.id)
    }
    for (const item of items) {
      if (!seen.has(item.id)) next.push({ ...item, leaving: false })
    }

    shownRef.current = next
    setShown(next)

    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180
    for (const item of removed) {
      if (exitTimers.current.has(item.id)) continue
      const timer = window.setTimeout(() => {
        exitTimers.current.delete(item.id)
        shownRef.current = shownRef.current.filter((entry) => entry.id !== item.id)
        setShown(shownRef.current)
      }, delay)
      exitTimers.current.set(item.id, timer)
    }
  }, [items])

  if (shown.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-[80] flex flex-col gap-3 sm:left-auto sm:w-[400px]" aria-live="polite">
      {shown.map((item) => {
        const kind = kinds[item.kind]
        return (
          <div
            key={item.id}
            role={item.kind === "error" ? "alert" : "status"}
            className={cn(
              "toast-card pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-2xl border py-3.5 pl-3.5 pr-3",
              item.leaving ? "toast-out" : "toast-in",
              kind.card,
            )}
          >
            <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white", kind.icon)} aria-hidden>
              <ToastGlyph kind={item.kind} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block text-sm font-bold leading-5", kind.title)}>{kind.label}</span>
              <span className="mt-0.5 block break-words text-[13px] font-normal leading-[1.4] text-[#3F3F46]">{item.message}</span>
            </span>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#3F3F46] ring-1 ring-black/10 transition-colors duration-200 hover:bg-[#F4F4F5] hover:text-[#18181B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A]/30"
              aria-label="Fechar aviso"
              onClick={() => dismiss(item.id)}
            >
              <X className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
