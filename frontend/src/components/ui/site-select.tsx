import { Check, ChevronDown, User, type LucideIcon } from "lucide-react"
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"

import { cn } from "@/utils/cn"

const triggerClass =
  "flex h-[50px] w-full items-center rounded-[10px] border border-solid border-[#E4E8ED] bg-white px-3.5 pr-10 text-left text-[15px] font-normal text-brand-ink shadow-[0_4px_10px_rgba(15,23,42,0.035),0_10px_22px_rgba(15,23,42,0.045)] outline-none transition-[border-color,box-shadow] duration-[160ms] ease-[ease] hover:border-[#C5CDD6] focus-visible:border-[#53bb7e] focus-visible:shadow-[0_0_0_1px_rgba(50,149,92,0.22),0_6px_18px_rgba(50,149,92,0.16),0_10px_28px_rgba(80,186,130,0.18)]"

const fieldTriggerClass =
  "flex h-11 w-full items-center rounded-[10px] border border-[#D9DEE5] bg-white pl-[42px] pr-10 text-left text-sm text-brand-ink shadow-[0_3px_8px_rgba(15,23,42,0.035)] outline-none transition-[border-color,box-shadow] duration-[180ms] ease-out hover:border-[#B8C3CF] hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)] focus-visible:border-[#1E8A3A] focus-visible:shadow-[0_0_0_3px_rgba(30,138,58,0.09)]"

export function SiteSelect({
  id,
  value,
  options,
  onChange,
  required = false,
  variant = "default",
  icon,
}: {
  id: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  required?: boolean
  variant?: "default" | "field"
  icon?: LucideIcon
}) {
  const field = variant === "field"
  const Icon = icon
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()
  const selectedIndex = Math.max(0, options.findIndex((item) => item.value === value))
  const selected = options[selectedIndex]

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMounted(false)
      return
    }
    const timer = window.setTimeout(() => setMounted(false), 160)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onPointer)
    return () => document.removeEventListener("mousedown", onPointer)
  }, [open])

  useEffect(() => {
    if (!open || !mounted) return
    listRef.current?.focus()
  }, [open, mounted])

  useEffect(() => {
    if (!open || !mounted) return
    listRef.current?.querySelector<HTMLElement>("[data-active='true']")?.scrollIntoView({ block: "nearest" })
  }, [active, open, mounted])

  function close(focusButton = false) {
    setOpen(false)
    if (focusButton) buttonRef.current?.focus()
  }

  function choose(next: string) {
    onChange(next)
    close(true)
  }

  function onTriggerKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowDown" && event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    setActive(selectedIndex)
    setOpen(true)
  }

  function onListKey(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActive((index) => Math.min(options.length - 1, index + 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActive((index) => Math.max(0, index - 1))
    } else if (event.key === "Home") {
      event.preventDefault()
      setActive(0)
    } else if (event.key === "End") {
      event.preventDefault()
      setActive(options.length - 1)
    } else if (event.key === "Enter") {
      event.preventDefault()
      const next = options[active]
      if (next) choose(next.value)
    } else if (event.key === "Escape") {
      event.preventDefault()
      close(true)
    } else if (event.key === "Tab") {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className={cn("relative w-full", mounted && "z-30")}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className={cn(
          field ? fieldTriggerClass : triggerClass,
          Icon && !field && "pl-[44px]",
          open && (field ? "border-[#1E8A3A] shadow-[0_0_0_3px_rgba(30,138,58,0.09)]" : "border-[#53bb7e] shadow-[0_0_0_1px_rgba(50,149,92,0.22),0_6px_18px_rgba(50,149,92,0.16),0_10px_28px_rgba(80,186,130,0.18)]"),
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-required={required || undefined}
        onClick={() => {
          setActive(selectedIndex)
          setOpen((current) => !current)
        }}
        onKeyDown={onTriggerKey}
      >
        {field ? <User className="pointer-events-none absolute left-[14px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#94A3B8]" strokeWidth={1.75} aria-hidden /> : null}
        {Icon && !field ? <Icon className="pointer-events-none absolute left-[14px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#94A3B8]" strokeWidth={1.75} aria-hidden /> : null}
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          className={cn(
            "pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8] motion-reduce:transition-none",
            field ? "transition-transform duration-200" : "transition-transform duration-150",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute h-px w-px opacity-0"
          value={value}
          required
          onChange={() => undefined}
          onInvalid={(event) => {
            event.preventDefault()
            buttonRef.current?.focus()
          }}
        />
      ) : null}
      {mounted ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={id}
          tabIndex={-1}
          className={cn(
            "absolute z-30 mt-[5px] flex max-h-60 w-full flex-col gap-1 overflow-auto rounded-xl border border-[#E4E4E7] bg-white p-1.5 shadow-[0_8px_18px_rgba(15,23,42,0.06)] outline-none",
            open ? "site-select-in" : "pointer-events-none site-select-out",
          )}
          onKeyDown={onListKey}
        >
          {options.map((option, index) => {
            const chosen = option.value === value
            const highlighted = index === active
            return (
              <li
                key={option.value || "vazio"}
                role="option"
                aria-selected={chosen}
                data-active={highlighted || undefined}
                className={cn(
                  "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm text-brand-ink transition-colors duration-150",
                  chosen && "bg-[rgba(30,138,58,0.07)] font-semibold text-[#1E8A3A]",
                  !chosen && highlighted && "bg-[#F4F4F5]",
                )}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option.value)}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {chosen ? <Check className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden /> : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
