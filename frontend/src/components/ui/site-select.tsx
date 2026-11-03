import { Check, ChevronDown, Search, User, type LucideIcon } from "lucide-react"
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react"

import { authInputClass } from "@/components/auth-screen"
import { Spinner } from "@/components/ui/spinner"
import { getRecord, listRecords } from "@/services/workforce.service"
import { cn } from "@/utils/cn"

function fold(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim()
}

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
  placeholder,
  loading = false,
  className,
  searchable = false,
  searchPlaceholder = "Pesquisar",
  searchPath,
  searchParams,
  searchKey = "name",
}: {
  id: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  required?: boolean
  variant?: "default" | "field"
  icon?: LucideIcon
  placeholder?: string
  loading?: boolean
  className?: string
  searchable?: boolean
  searchPlaceholder?: string
  searchPath?: string
  searchParams?: Record<string, string | number | boolean | undefined>
  searchKey?: "name" | "full_name"
}) {
  const field = variant === "field"
  const Icon = icon
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState(0)
  const [query, setQuery] = useState("")
  const [remote, setRemote] = useState<{ value: string; label: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [resolved, setResolved] = useState("")
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const keyboardMove = useRef(false)
  const labels = useRef(new Map<string, string>())
  const request = useRef(0)
  const listId = useId()
  const extra = JSON.stringify(searchParams ?? null)
  const visible = useMemo(() => {
    if (!searchable) return options
    const term = fold(query)
    const pool = new Map<string, { value: string; label: string }>()
    for (const item of options) pool.set(item.value || "vazio", item)
    for (const item of remote) pool.set(item.value || "vazio", item)
    const rows = [...pool.values()].filter((item) => !term || fold(item.label).includes(term))
    const blank = rows.filter((item) => item.value === "")
    const named = rows.filter((item) => item.value !== "").sort((left, right) => left.label.localeCompare(right.label, "pt-BR"))
    return [...blank, ...named].slice(0, 100)
  }, [searchable, options, remote, query])
  const selectedIndex = visible.findIndex((item) => item.value === value)
  const selected = options.find((item) => item.value === value) || remote.find((item) => item.value === value)
  const selectedLabel = selected?.label || (value ? labels.current.get(value) || resolved : "") || placeholder

  useEffect(() => {
    if (loading) setOpen(false)
  }, [loading])

  useEffect(() => {
    for (const item of options) labels.current.set(item.value, item.label)
    for (const item of remote) labels.current.set(item.value, item.label)
  }, [options, remote])

  useEffect(() => {
    if (!searchPath || !value || labels.current.has(value) || options.some((item) => item.value === value)) return
    const numeric = Number(value)
    if (!Number.isFinite(numeric) || numeric <= 0) return
    let active = true
    getRecord<{ name?: string; full_name?: string }>(searchPath, numeric)
      .then((row) => {
        const label = row.name || row.full_name
        if (!active || !label) return
        labels.current.set(value, label)
        setResolved(label)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [searchPath, value, options])

  useEffect(() => {
    const term = query.trim()
    if (!open || !searchable || !searchPath || !term) {
      setRemote([])
      setSearching(false)
      return
    }
    const current = ++request.current
    setSearching(true)
    const timer = window.setTimeout(() => {
      const parsed = JSON.parse(extra) as Record<string, string | number | boolean | undefined> | null
      const params = { page: 1, limit: 100, [searchKey]: term, ...(parsed ?? {}) }
      listRecords<{ id: number; name?: string; full_name?: string }>(searchPath, params)
        .then((page) => {
          if (current !== request.current) return
          setRemote(page.items.map((item) => ({ value: String(item.id), label: item.name || item.full_name || String(item.id) })))
        })
        .catch(() => {
          if (current === request.current) setRemote([])
        })
        .finally(() => {
          if (current === request.current) setSearching(false)
        })
    }, 280)
    return () => window.clearTimeout(timer)
  }, [query, open, searchable, searchPath, searchKey, extra])

  useEffect(() => {
    if (open) {
      setMounted(true)
      if (searchable) setQuery("")
      return
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMounted(false)
      return
    }
    const timer = window.setTimeout(() => setMounted(false), 160)
    return () => window.clearTimeout(timer)
  }, [open, searchable])

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
    if (searchable) inputRef.current?.focus()
    else listRef.current?.focus()
  }, [open, mounted, searchable])

  useEffect(() => {
    if (!open || !mounted || !keyboardMove.current) return
    keyboardMove.current = false
    listRef.current?.querySelector<HTMLElement>("[data-active='true']")?.scrollIntoView({ block: "nearest" })
  }, [active, open, mounted])

  function moveActive(next: number | ((index: number) => number)) {
    keyboardMove.current = true
    setActive(next)
  }

  function close(focusButton = false) {
    setOpen(false)
    if (focusButton) buttonRef.current?.focus()
  }

  function choose(next: string) {
    onChange(next)
    close(true)
  }

  function onTriggerKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (loading) return
    if (event.key !== "ArrowDown" && event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    moveActive(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  function onListKey(event: KeyboardEvent<HTMLUListElement | HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      moveActive((index) => Math.min(visible.length - 1, index + 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      moveActive((index) => Math.max(0, index - 1))
    } else if (event.key === "Home") {
      event.preventDefault()
      moveActive(0)
    } else if (event.key === "End") {
      event.preventDefault()
      moveActive(Math.max(0, visible.length - 1))
    } else if (event.key === "Enter") {
      event.preventDefault()
      const next = active >= 0 && active < visible.length ? visible[active] : undefined
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
          loading && "cursor-wait disabled:opacity-100",
          className,
          open && (field ? "border-[#1E8A3A] shadow-[0_0_0_3px_rgba(30,138,58,0.09)]" : "border-[#53bb7e] shadow-[0_0_0_1px_rgba(50,149,92,0.22),0_6px_18px_rgba(50,149,92,0.16),0_10px_28px_rgba(80,186,130,0.18)]"),
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-required={required || undefined}
        aria-busy={loading || undefined}
        disabled={loading}
        onClick={() => {
          if (loading) return
          setActive(selectedIndex >= 0 ? selectedIndex : 0)
          setOpen((current) => !current)
        }}
        onKeyDown={onTriggerKey}
      >
        {field ? <User className="pointer-events-none absolute left-[14px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#94A3B8]" strokeWidth={1.75} aria-hidden /> : null}
        {Icon && !field ? <Icon className="pointer-events-none absolute left-[14px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#94A3B8]" strokeWidth={1.75} aria-hidden /> : null}
        <span className={cn("truncate", loading && "text-[#64748B]")}>{loading ? "Carregando" : selectedLabel}</span>
        {loading ? (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
            <Spinner className="h-4 w-4 text-[#1E8A3A]" />
          </span>
        ) : (
          <ChevronDown
            className={cn(
              "pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8] motion-reduce:transition-none",
              field ? "transition-transform duration-200" : "transition-transform duration-150",
              open && "rotate-180",
            )}
            aria-hidden
          />
        )}
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
        <div className={cn("absolute z-30 mt-[5px] w-full rounded-xl border border-[#E4E4E7] bg-white p-1.5 shadow-[0_8px_18px_rgba(15,23,42,0.06)]", open ? "site-select-in" : "pointer-events-none site-select-out")}>
          {searchable ? (
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-[14px] top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-[#94A3B8]" strokeWidth={1.75} aria-hidden />
              <input
                ref={inputRef}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls={listId}
                aria-activedescendant={visible[active] ? `${listId}-${active}` : undefined}
                value={query}
                placeholder={searchPlaceholder}
                className={cn(authInputClass(false), "shadow-none hover:shadow-none focus:border-[#C5CDD6] focus:shadow-none hover:focus:border-[#C5CDD6] hover:focus:shadow-none")}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onListKey}
              />
            </div>
          ) : null}
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={id}
            tabIndex={searchable ? undefined : -1}
            className="flex max-h-60 flex-col gap-1 overflow-auto outline-none"
            onKeyDown={searchable ? undefined : onListKey}
          >
            {visible.map((option, index) => {
              const chosen = option.value === value
              const highlighted = index === active
              return (
                <li
                  key={option.value || "vazio"}
                  id={`${listId}-${index}`}
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
            {searchable && visible.length === 0 ? <li className="px-3 py-3 text-sm text-brand-quiet">{searching ? "Buscando..." : "Nenhum registro encontrado."}</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
