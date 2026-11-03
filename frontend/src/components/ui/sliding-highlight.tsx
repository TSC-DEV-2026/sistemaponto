import { useLayoutEffect, useRef, useState, type HTMLAttributes } from "react"

import { cn } from "@/utils/cn"

type Box = { left: number; top: number; width: number; height: number }

export function SlidingHighlight({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<Box | null>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    function measure() {
      const current = rootRef.current
      const active = current?.querySelector<HTMLElement>("[data-slide-active='true']")
      if (!current || !active) {
        setBox((previous) => (previous === null ? previous : null))
        return
      }
      const next = { left: active.offsetLeft, top: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight }
      setBox((previous) => (previous && previous.left === next.left && previous.top === next.top && previous.width === next.width && previous.height === next.height ? previous : next))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    return () => observer.disconnect()
  })

  return (
    <div ref={rootRef} className={cn("relative", className)} {...props}>
      {box ? (
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-lg bg-white shadow-sm transition-[left,top,width,height] duration-200 ease-out motion-reduce:transition-none"
          style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
        />
      ) : null}
      {children}
    </div>
  )
}
