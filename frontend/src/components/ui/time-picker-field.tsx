import { Clock } from "lucide-react"
import { useEffect, useId, useRef, useState, type ChangeEvent, type FocusEvent, type KeyboardEvent, type RefObject } from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/utils/cn"

type ClockValue = { hour: number; minute: number }

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function parseClock(value: string): ClockValue | null {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value.trim())
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return { hour, minute }
}

function formatClock(value: ClockValue) {
  return `${pad(value.hour)}:${pad(value.minute)}`
}

function maskClock(digits: string) {
  const clean = digits.replace(/\D/g, "").slice(0, 4)
  if (clean.length <= 2) return clean
  return `${clean.slice(0, 2)}:${clean.slice(2)}`
}

function caretAfterDigits(masked: string, count: number) {
  let seen = 0
  for (let index = 0; index < masked.length; index += 1) {
    if (/\d/.test(masked[index])) seen += 1
    if (seen === count) return index + 1
  }
  return masked.length
}

function showValue(value: string) {
  const parsed = parseClock(value)
  return parsed ? formatClock(parsed) : ""
}

export function TimePickerField({
  id,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  readOnly = false,
  error = false,
  inputLabel,
}: {
  id: string
  label?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  error?: boolean
  inputLabel?: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const hourListRef = useRef<HTMLDivElement>(null)
  const minuteListRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [above, setAbove] = useState(false)
  const [alignRight, setAlignRight] = useState(false)
  const [draft, setDraft] = useState(showValue(value))
  const [hour, setHour] = useState<number | null>(null)
  const [minute, setMinute] = useState<number | null>(null)
  const locked = disabled || readOnly

  useEffect(() => {
    if (document.activeElement === inputRef.current) return
    setDraft(showValue(value))
  }, [value])

  useEffect(() => {
    if (open) {
      setMounted(true)
      const rect = rootRef.current?.getBoundingClientRect()
      if (rect) {
        setAbove(rect.bottom + 292 > window.innerHeight && rect.top > 292)
        setAlignRight(rect.left + 196 > window.innerWidth - 16)
      }
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
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return
      event.preventDefault()
      setDraft(showValue(value))
      setOpen(false)
    }
    document.addEventListener("mousedown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open, value])

  useEffect(() => {
    if (!open) return
    hourListRef.current?.querySelector<HTMLElement>("[aria-selected='true']")?.scrollIntoView({ block: "nearest" })
    minuteListRef.current?.querySelector<HTMLElement>("[aria-selected='true']")?.scrollIntoView({ block: "nearest" })
  }, [open, hour, minute])

  function reveal(nextHour: number | null, nextMinute: number | null) {
    const parsed = parseClock(draft) || parseClock(value)
    setHour(nextHour ?? parsed?.hour ?? null)
    setMinute(nextMinute ?? parsed?.minute ?? null)
    setOpen(true)
    inputRef.current?.focus()
  }

  function commit(text: string) {
    setDraft(text)
    onChange(text)
    setOpen(false)
  }

  function confirm() {
    if (hour === null || minute === null) return
    commit(formatClock({ hour, minute }))
  }

  function cancel() {
    setDraft(showValue(value))
    setOpen(false)
    inputRef.current?.focus()
  }

  function onType(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const caret = input.selectionStart ?? input.value.length
    const digitsBefore = input.value.slice(0, caret).replace(/\D/g, "").length
    const digits = input.value.replace(/\D/g, "").slice(0, 4)
    const next = maskClock(digits)
    setDraft(next)
    const place = caretAfterDigits(next, Math.min(digitsBefore, digits.length))
    requestAnimationFrame(() => {
      const field = inputRef.current
      if (!field || document.activeElement !== field) return
      field.setSelectionRange(place, place)
    })
    const parsed = parseClock(next)
    if (parsed) {
      setHour(parsed.hour)
      setMinute(parsed.minute)
    }
  }

  function onBlur(event: FocusEvent<HTMLInputElement>) {
    if (rootRef.current?.contains(event.relatedTarget as Node)) return
    if (!draft.trim()) {
      setDraft("")
      onChange("")
      return
    }
    const parsed = parseClock(draft)
    if (parsed) {
      const text = formatClock(parsed)
      setDraft(text)
      onChange(text)
      return
    }
    setDraft(showValue(value))
  }

  function onInputKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      cancel()
      return
    }
    if (event.key === "ArrowDown" && !open && !locked) {
      event.preventDefault()
      reveal(null, null)
      return
    }
    if (event.key !== "Enter") return
    event.preventDefault()
    if (!draft.trim()) {
      commit("")
      return
    }
    const parsed = parseClock(draft)
    if (parsed) commit(formatClock(parsed))
  }

  function move(event: KeyboardEvent<HTMLButtonElement>, index: number, total: number, select: (next: number) => void, list: HTMLDivElement | null) {
    const next = event.key === "ArrowDown" ? Math.min(total - 1, index + 1) : event.key === "ArrowUp" ? Math.max(0, index - 1) : event.key === "Home" ? 0 : event.key === "End" ? total - 1 : null
    if (next === null || next === index) return
    event.preventDefault()
    select(next)
    requestAnimationFrame(() => list?.querySelector<HTMLElement>(`[data-index='${next}']`)?.focus())
  }

  return (
    <div ref={rootRef} className={cn("relative min-w-0", mounted && "z-30")}>
      {label ? (
        <Label className="mb-2 block font-semibold text-brand-ink" htmlFor={id}>
          {label}
        </Label>
      ) : null}
      <div
        className={cn(
          "flex h-12 min-w-0 items-center gap-2 rounded-[10px] border border-[#D9DEE5] bg-white px-3.5 shadow-[0_3px_8px_rgba(15,23,42,0.035)] transition-[border-color,box-shadow] duration-[180ms] hover:border-[#B8C3CF] hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)]",
          (open || error) && "border-[#1E8A3A] shadow-[0_0_0_3px_rgba(30,138,58,0.1)]",
          error && "border-brand-danger shadow-[0_0_0_3px_rgba(239,83,80,0.12)]",
          disabled && "cursor-not-allowed bg-brand-paper",
          readOnly && "bg-brand-paper",
        )}
        onMouseDown={(event) => {
          if (locked) return
          const target = event.target as HTMLElement
          if (target.closest("[data-clock]")) return
          if (target.closest("input")) return
          event.preventDefault()
          reveal(null, null)
        }}
      >
        <input
          ref={inputRef}
          id={id}
          value={draft}
          inputMode="numeric"
          autoComplete="off"
          placeholder="HH:mm"
          disabled={disabled}
          readOnly={readOnly}
          aria-label={inputLabel}
          aria-expanded={open}
          aria-controls={listId}
          aria-required={required || undefined}
          className="min-w-0 flex-1 bg-transparent text-sm text-[#0A0A0A] outline-none placeholder:text-[#9CA3AF] disabled:text-[#71717A]"
          onClick={() => {
            if (!locked) reveal(null, null)
          }}
          onChange={onType}
          onBlur={onBlur}
          onKeyDown={onInputKey}
        />
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[rgba(30,138,58,0.08)] text-[#1E8A3A] transition-colors duration-150 hover:bg-[rgba(30,138,58,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30 disabled:cursor-not-allowed disabled:bg-[#F4F4F5] disabled:text-[#71717A]"
          data-clock
          aria-label="Escolher horário"
          disabled={locked}
          onClick={() => (open ? cancel() : reveal(null, null))}
        >
          <Clock className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      {required ? (
        <input tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute h-px w-px opacity-0" value={value} required onChange={() => undefined} />
      ) : null}
      {mounted ? (
        <div
          id={listId}
          role="dialog"
          aria-label="Selecionar horário"
          className={cn(
            "absolute z-30 w-[188px] max-w-[calc(100vw-2rem)] rounded-xl border border-[#E4E4E7] bg-white p-2.5 shadow-[0_10px_28px_rgba(15,23,42,0.08)]",
            above ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]",
            alignRight ? "right-0" : "left-0",
            open ? "site-select-in" : "pointer-events-none site-select-out",
          )}
        >
          <div className="grid grid-cols-2 gap-1.5">
            <ClockColumn label="Horas" total={24} selected={hour} listRef={hourListRef} onSelect={setHour} onMove={move} />
            <ClockColumn label="Minutos" total={60} selected={minute} listRef={minuteListRef} onSelect={setMinute} onMove={move} />
          </div>
          <div className="mt-2.5 flex justify-end gap-1.5">
            <button type="button" className="h-8 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-sm text-[#0A0A0A] transition-colors duration-150 hover:bg-[#F4F4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30" onClick={cancel}>
              Cancelar
            </button>
            <button type="button" className="h-8 rounded-lg bg-[#1E8A3A] px-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#219440] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30 disabled:cursor-not-allowed disabled:opacity-40" disabled={hour === null || minute === null} onClick={confirm}>
              Confirmar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ClockColumn({
  label,
  total,
  selected,
  listRef,
  onSelect,
  onMove,
}: {
  label: string
  total: number
  selected: number | null
  listRef: RefObject<HTMLDivElement>
  onSelect: (value: number) => void
  onMove: (event: KeyboardEvent<HTMLButtonElement>, index: number, total: number, select: (next: number) => void, list: HTMLDivElement | null) => void
}) {
  return (
    <div className="min-w-0">
      <div ref={listRef} role="listbox" aria-label={label} className="max-h-40 overflow-y-auto">
        <p className="sticky top-0 z-10 bg-white pb-1 text-center text-xs font-semibold text-[#52525B]">{label}</p>
        {Array.from({ length: total }, (_, index) => {
          const chosen = selected === index
          return (
            <button
              key={index}
              type="button"
              role="option"
              data-index={index}
              aria-selected={chosen}
              className={cn(
                "flex h-8 w-full items-center justify-center rounded-lg text-sm transition-colors duration-150",
                chosen ? "bg-[#1E8A3A] font-semibold text-white" : "text-[#0A0A0A] hover:bg-[rgba(30,138,58,0.08)] hover:text-[#187432]",
              )}
              onClick={() => onSelect(index)}
              onKeyDown={(event) => onMove(event, index, total, onSelect, listRef.current)}
            >
              {pad(index)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
