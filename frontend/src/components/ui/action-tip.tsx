import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"

import { cn } from "@/utils/cn"

export function ActionTip({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [spot, setSpot] = useState({ top: 0, left: 0, above: false })

  function place() {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const above = rect.bottom + 40 > window.innerHeight && rect.top > 40
    setSpot({ top: above ? rect.top - 8 : rect.bottom + 8, left: rect.left + rect.width / 2, above })
  }

  useEffect(() => {
    if (!open) return
    function move() {
      place()
    }
    window.addEventListener("scroll", move, true)
    window.addEventListener("resize", move)
    return () => {
      window.removeEventListener("scroll", move, true)
      window.removeEventListener("resize", move)
    }
  }, [open])

  function show() {
    place()
    setOpen(true)
  }

  return (
    <span ref={ref} className="inline-flex" onMouseEnter={show} onMouseLeave={() => setOpen(false)} onFocus={show} onBlur={() => setOpen(false)}>
      {children}
      {open
        ? createPortal(
            <span
              role="tooltip"
              className={cn(
                "pointer-events-none fixed z-[60] -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-xs font-medium text-[#0A0A0A] shadow-[0_4px_12px_rgba(15,23,42,0.08)]",
                spot.above && "-translate-y-full",
              )}
              style={{ top: spot.top, left: spot.left }}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </span>
  )
}
