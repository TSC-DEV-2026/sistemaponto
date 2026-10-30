import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react"
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/utils/cn"

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const weekdays = ["D", "S", "T", "Q", "Q", "S", "S"]

type Day = { y: number; m: number; d: number }

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function toIso(day: Day) {
  return `${day.y}-${pad(day.m + 1)}-${pad(day.d)}`
}

function parseIso(value: string): Day | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  return realDay(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function realDay(y: number, m: number, d: number): Day | null {
  const date = new Date(y, m, d)
  if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return null
  return { y, m, d }
}

function formatBr(day: Day) {
  return `${pad(day.d)}/${pad(day.m + 1)}/${day.y}`
}

function parseDigits(digits: string): Day | null {
  if (digits.length !== 8) return null
  return realDay(Number(digits.slice(4, 8)), Number(digits.slice(2, 4)) - 1, Number(digits.slice(0, 2)))
}

function mask(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8)
  let text = digits.slice(0, 2)
  if (digits.length > 2) text += `/${digits.slice(2, 4)}`
  if (digits.length > 4) text += `/${digits.slice(4, 8)}`
  return text
}

function caretAfterDigits(masked: string, digitCount: number) {
  if (digitCount <= 0) return 0
  let seen = 0
  for (let index = 0; index < masked.length; index += 1) {
    if (/\d/.test(masked[index] ?? "")) seen += 1
    if (seen === digitCount) return index + 1
  }
  return masked.length
}

function sameDay(left: Day | null, right: Day | null) {
  return Boolean(left && right && left.y === right.y && left.m === right.m && left.d === right.d)
}

function saoPauloToday(): Day {
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
  return parseIso(iso) ?? { y: 1970, m: 0, d: 1 }
}

function monthCells(year: number, month: number): Array<Day & { outside: boolean }> {
  const first = new Date(year, month, 1).getDay()
  const count = new Date(year, month + 1, 0).getDate()
  const cells: Array<Day & { outside: boolean }> = []
  for (let index = 0; index < first; index += 1) {
    const date = new Date(year, month, index - first + 1)
    cells.push({ y: date.getFullYear(), m: date.getMonth(), d: date.getDate(), outside: true })
  }
  for (let day = 1; day <= count; day += 1) cells.push({ y: year, m: month, d: day, outside: false })
  while (cells.length % 7 !== 0) {
    const date = new Date(year, month + 1, cells.length - (first + count) + 1)
    cells.push({ y: date.getFullYear(), m: date.getMonth(), d: date.getDate(), outside: true })
  }
  return cells
}

function allowed(day: Day, min?: string, max?: string) {
  const iso = toIso(day)
  if (min && iso < min) return false
  if (max && iso > max) return false
  return true
}

export function DatePickerField({
  id,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  error = false,
  min,
  max,
  placeholder = "DD/MM/AAAA",
}: {
  id: string
  label?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
  error?: boolean
  min?: string
  max?: string
  placeholder?: string
}) {
  const selected = parseIso(value)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [view, setView] = useState<"days" | "months" | "years">("days")
  const [draft, setDraft] = useState(selected ? formatBr(selected) : "")
  const [cursor, setCursor] = useState<Day>(selected ?? saoPauloToday())
  const [above, setAbove] = useState(false)
  const [alignRight, setAlignRight] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  useEffect(() => {
    if (document.activeElement === inputRef.current) return
    setDraft(selected ? formatBr(selected) : "")
  }, [value])

  useEffect(() => {
    if (open) {
      setMounted(true)
      setView("days")
      const anchor = selected ?? saoPauloToday()
      setCursor(anchor)
      const rect = rootRef.current?.getBoundingClientRect()
      if (rect) {
        setAbove(rect.bottom + 380 > window.innerHeight && rect.top > 380)
        setAlignRight(rect.left + 340 > window.innerWidth - 16)
      }
      return
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMounted(false)
      return
    }
    const timer = window.setTimeout(() => setMounted(false), 140)
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

  function commit(day: Day) {
    if (!allowed(day, min, max)) return
    onChange(toIso(day))
    setDraft(formatBr(day))
    setCursor(day)
    setOpen(false)
  }

  function onType(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const caret = input.selectionStart ?? input.value.length
    const digitsBefore = input.value.slice(0, caret).replace(/\D/g, "").length
    const digits = input.value.replace(/\D/g, "").slice(0, 8)
    const next = mask(digits)
    setDraft(next)
    const place = caretAfterDigits(next, Math.min(digitsBefore, digits.length))
    requestAnimationFrame(() => {
      const field = inputRef.current
      if (!field || document.activeElement !== field) return
      field.setSelectionRange(place, place)
    })
    if (digits.length === 0) {
      onChange("")
      return
    }
    if (digits.length < 8) return
    const day = parseDigits(digits)
    if (!day || !allowed(day, min, max)) return
    onChange(toIso(day))
    setCursor(day)
  }

  function onInputKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false)
      return
    }
    if (event.key === "ArrowDown" && !open) {
      event.preventDefault()
      setOpen(true)
      return
    }
    if (!open || event.key !== "Enter") return
    event.preventDefault()
    const typed = parseDigits(draft.replace(/\D/g, ""))
    if (typed && allowed(typed, min, max)) commit(typed)
    else commit(cursor)
  }

  const today = saoPauloToday()
  const cells = monthCells(cursor.y, cursor.m)
  const yearStart = cursor.y - (cursor.y % 12)

  function previous() {
    if (view === "years") setCursor({ ...cursor, y: cursor.y - 12 })
    else if (view === "months") setCursor({ ...cursor, y: cursor.y - 1 })
    else setCursor({ y: cursor.m === 0 ? cursor.y - 1 : cursor.y, m: cursor.m === 0 ? 11 : cursor.m - 1, d: 1 })
  }

  function next() {
    if (view === "years") setCursor({ ...cursor, y: cursor.y + 12 })
    else if (view === "months") setCursor({ ...cursor, y: cursor.y + 1 })
    else setCursor({ y: cursor.m === 11 ? cursor.y + 1 : cursor.y, m: (cursor.m + 1) % 12, d: 1 })
  }

  return (
    <div ref={rootRef} className={cn("relative", mounted && "z-30")}>
      {label ? (
        <Label className="mb-2 block font-semibold text-brand-ink" htmlFor={id}>
          {label}
        </Label>
      ) : null}
      <div
        className={cn(
          "flex h-12 cursor-text items-center gap-2 rounded-[10px] border border-[#D9DEE5] bg-white px-3.5 shadow-[0_3px_8px_rgba(15,23,42,0.035)] transition-[border-color,box-shadow] duration-[180ms] hover:border-[#B8C3CF] hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)]",
          (open || error) && "border-[#1E8A3A] shadow-[0_0_0_3px_rgba(30,138,58,0.1)]",
          error && "border-brand-danger shadow-[0_0_0_3px_rgba(239,83,80,0.12)]",
          disabled && "pointer-events-none bg-brand-paper",
        )}
        onMouseDown={(event) => {
          const target = event.target as HTMLElement
          if (target.closest("[data-clear]")) return
          if (target.closest("input")) return
          event.preventDefault()
          setOpen(true)
          inputRef.current?.focus()
        }}
      >
        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[rgba(30,138,58,0.08)] text-[#1E8A3A]", open && "bg-[rgba(30,138,58,0.14)]")} aria-hidden>
          <Calendar className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <input
          ref={inputRef}
          id={id}
          value={draft}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          disabled={disabled}
          aria-expanded={open}
          aria-controls={listId}
          aria-required={required || undefined}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-[#0A0A0A] outline-none placeholder:text-[#9CA3AF]"
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onBlur={() => setDraft(selected ? formatBr(selected) : "")}
          onChange={onType}
          onKeyDown={onInputKey}
        />
        {value ? (
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#94A3B8] transition-colors duration-150 hover:bg-[#F4F4F5] hover:text-[#0A0A0A]"
            data-clear
            aria-label="Limpar data"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange("")
              setDraft("")
              inputRef.current?.focus()
            }}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
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
            inputRef.current?.focus()
            setOpen(true)
          }}
        />
      ) : null}
      {mounted ? (
        <div
          id={listId}
          role="dialog"
          aria-label={label || "Calendário"}
          className={cn(
            "absolute z-30 w-[min(340px,calc(100vw-2rem))] rounded-[14px] border border-[#E4E4E7] bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]",
            above ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]",
            alignRight ? "right-0" : "left-0",
            open ? "site-select-in" : "pointer-events-none site-select-out",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4E4E7] bg-white text-[#52525B] transition-colors duration-150 hover:bg-[rgba(30,138,58,0.08)] hover:text-[#1E8A3A]" aria-label="Anterior" onClick={previous}>
              <ChevronLeft className="h-[18px] w-[18px]" />
            </button>
            <div className="flex items-center gap-1 text-[15px] font-semibold text-[#0A0A0A]">
              <button type="button" className="rounded-md px-1.5 py-1 hover:bg-[rgba(30,138,58,0.08)] hover:text-[#1E8A3A]" onClick={() => setView(view === "months" ? "days" : "months")}>
                {months[cursor.m]}
              </button>
              <button type="button" className="rounded-md px-1.5 py-1 hover:bg-[rgba(30,138,58,0.08)] hover:text-[#1E8A3A]" onClick={() => setView(view === "years" ? "days" : "years")}>
                {view === "years" ? `${yearStart} – ${yearStart + 11}` : cursor.y}
              </button>
            </div>
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4E4E7] bg-white text-[#52525B] transition-colors duration-150 hover:bg-[rgba(30,138,58,0.08)] hover:text-[#1E8A3A]" aria-label="Seguinte" onClick={next}>
              <ChevronRight className="h-[18px] w-[18px]" />
            </button>
          </div>
          {view === "days" ? (
            <>
              <div className="mt-4 grid grid-cols-7 text-center text-xs text-[#71717A]">
                {weekdays.map((day, index) => (
                  <span key={`${day}-${index}`}>{day}</span>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 justify-items-center gap-y-1">
                {cells.map((day) => {
                  const chosen = sameDay(day, selected)
                  const current = sameDay(day, cursor)
                  const blocked = !allowed(day, min, max)
                  return (
                    <button
                      key={toIso(day)}
                      type="button"
                      disabled={blocked}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors duration-150",
                        chosen ? "bg-[#1E8A3A] font-semibold text-white" : "text-[#0A0A0A] hover:bg-[rgba(30,138,58,0.08)] hover:text-[#187432]",
                        day.outside && !chosen && "text-[#C5CDD6]",
                        !chosen && sameDay(day, today) && "ring-1 ring-[#1E8A3A]/40",
                        current && !chosen && "bg-[rgba(30,138,58,0.08)]",
                        blocked && "pointer-events-none opacity-30",
                      )}
                      onClick={() => commit(day)}
                    >
                      {day.d}
                    </button>
                  )
                })}
              </div>
            </>
          ) : null}
          {view === "months" ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {months.map((month, index) => (
                <button
                  key={month}
                  type="button"
                  className={cn("rounded-lg px-2 py-2 text-sm transition-colors duration-150 hover:bg-[rgba(30,138,58,0.08)] hover:text-[#187432]", index === cursor.m && "bg-[#1E8A3A] font-semibold text-white hover:bg-[#1E8A3A] hover:text-white")}
                  onClick={() => {
                    setCursor({ ...cursor, m: index })
                    setView("days")
                  }}
                >
                  {month.slice(0, 3)}
                </button>
              ))}
            </div>
          ) : null}
          {view === "years" ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }, (_, index) => yearStart + index).map((year) => (
                <button
                  key={year}
                  type="button"
                  className={cn("rounded-lg px-2 py-2 text-sm transition-colors duration-150 hover:bg-[rgba(30,138,58,0.08)] hover:text-[#187432]", year === cursor.y && "bg-[#1E8A3A] font-semibold text-white hover:bg-[#1E8A3A] hover:text-white")}
                  onClick={() => {
                    setCursor({ ...cursor, y: year })
                    setView("months")
                  }}
                >
                  {year}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function YearPickerField({
  id,
  value,
  onChange,
  required = false,
  placeholder = "Selecione o ano",
}: {
  id: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
}) {
  const selected = /^\d{4}$/.test(value) ? Number(value) : null
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [draft, setDraft] = useState(selected ? String(selected) : "")
  const [cursor, setCursor] = useState(selected ?? new Date().getFullYear())
  const [above, setAbove] = useState(false)
  const [alignRight, setAlignRight] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const yearStart = cursor - (cursor % 12)

  useEffect(() => {
    if (document.activeElement === inputRef.current) return
    setDraft(selected ? String(selected) : "")
  }, [selected])

  useEffect(() => {
    if (open) {
      setMounted(true)
      setCursor(selected ?? new Date().getFullYear())
      const rect = rootRef.current?.getBoundingClientRect()
      if (rect) {
        setAbove(rect.bottom + 280 > window.innerHeight && rect.top > 280)
        setAlignRight(rect.left + 340 > window.innerWidth - 16)
      }
      return
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMounted(false)
      return
    }
    const timer = window.setTimeout(() => setMounted(false), 140)
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

  function choose(year: number) {
    onChange(String(year))
    setDraft(String(year))
    setCursor(year)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={cn("relative", mounted && "z-30")}>
      <div
        className={cn(
          "flex h-12 cursor-text items-center gap-2 rounded-[10px] border border-[#D9DEE5] bg-white px-3.5 shadow-[0_3px_8px_rgba(15,23,42,0.035)] transition-[border-color,box-shadow] duration-[180ms] hover:border-[#B8C3CF] hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)]",
          open && "border-[#1E8A3A] shadow-[0_0_0_3px_rgba(30,138,58,0.1)]",
        )}
        onMouseDown={(event) => {
          const target = event.target as HTMLElement
          if (target.closest("[data-clear]") || target.closest("input") || target.closest("button")) return
          event.preventDefault()
          setOpen(true)
          inputRef.current?.focus()
        }}
      >
        <button
          type="button"
          className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[rgba(30,138,58,0.08)] text-[#1E8A3A]", open && "bg-[rgba(30,138,58,0.14)]")}
          aria-label="Escolher ano"
          aria-expanded={open}
          aria-controls={listId}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setOpen((current) => !current)
            inputRef.current?.focus()
          }}
        >
          <Calendar className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <input
          ref={inputRef}
          id={id}
          value={draft}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          aria-expanded={open}
          aria-controls={listId}
          aria-required={required || undefined}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-[#0A0A0A] outline-none placeholder:text-[#9CA3AF]"
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 4)
            setDraft(digits)
            if (digits.length === 4) {
              onChange(digits)
              setCursor(Number(digits))
              return
            }
            if (digits.length === 0) onChange("")
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false)
            if (event.key === "ArrowDown" && !open) {
              event.preventDefault()
              setOpen(true)
            }
          }}
          onBlur={() => {
            if (/^\d{4}$/.test(draft)) return
            setDraft(selected ? String(selected) : "")
          }}
        />
        {value ? (
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#94A3B8] transition-colors duration-150 hover:bg-[#F4F4F5] hover:text-[#0A0A0A]"
            data-clear
            aria-label="Limpar ano"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange("")
              setDraft("")
              inputRef.current?.focus()
            }}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
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
            inputRef.current?.focus()
            setOpen(true)
          }}
        />
      ) : null}
      {mounted ? (
        <div
          id={listId}
          role="dialog"
          aria-label="Anos"
          className={cn(
            "absolute z-30 w-[min(340px,calc(100vw-2rem))] rounded-[14px] border border-[#E4E4E7] bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]",
            above ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]",
            alignRight ? "right-0" : "left-0",
            open ? "site-select-in" : "pointer-events-none site-select-out",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4E4E7] bg-white text-[#52525B] transition-colors duration-150 hover:bg-[rgba(30,138,58,0.08)] hover:text-[#1E8A3A]" aria-label="Anos anteriores" onClick={() => setCursor((current) => current - 12)}>
              <ChevronLeft className="h-[18px] w-[18px]" />
            </button>
            <p className="text-[15px] font-semibold text-[#0A0A0A]">
              {yearStart} – {yearStart + 11}
            </p>
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4E4E7] bg-white text-[#52525B] transition-colors duration-150 hover:bg-[rgba(30,138,58,0.08)] hover:text-[#1E8A3A]" aria-label="Próximos anos" onClick={() => setCursor((current) => current + 12)}>
              <ChevronRight className="h-[18px] w-[18px]" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }, (_, index) => yearStart + index).map((year) => (
              <button
                key={year}
                type="button"
                className={cn("rounded-lg px-2 py-2 text-sm transition-colors duration-150 hover:bg-[rgba(30,138,58,0.08)] hover:text-[#187432]", year === selected && "bg-[#1E8A3A] font-semibold text-white hover:bg-[#1E8A3A] hover:text-white")}
                onClick={() => choose(year)}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
