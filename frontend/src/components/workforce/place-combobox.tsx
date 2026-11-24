import { Check, ChevronDown, Search, type LucideIcon } from "lucide-react"
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react"

import { authInputClass } from "@/components/auth-screen"
import { Spinner } from "@/components/ui/spinner"
import { listRecords, type NamedRecord } from "@/services/workforce.service"
import { cn } from "@/utils/cn"

function fold(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim()
}

export function PlaceCombobox({
  id,
  icon: Icon,
  options,
  selected,
  emptyLabel,
  searchPlaceholder,
  emptyResult,
  searchPath,
  extendSearch = false,
  loading = false,
  onChange,
}: {
  id: string
  icon: LucideIcon
  options: NamedRecord[]
  selected: number[]
  emptyLabel: string
  searchPlaceholder: string
  emptyResult: string
  searchPath: string
  extendSearch?: boolean
  loading?: boolean
  onChange: (ids: number[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(-1)
  const [remote, setRemote] = useState<NamedRecord[]>([])
  const [searching, setSearching] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const keyboardMove = useRef(false)
  const names = useRef(new Map<number, string>())
  const request = useRef(0)
  const listId = useId()

  useEffect(() => {
    for (const item of options) names.current.set(item.id, item.name)
  }, [options])

  useEffect(() => {
    if (loading) setOpen(false)
  }, [loading])

  useEffect(() => {
    if (open) {
      setMounted(true)
      setQuery("")
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
    inputRef.current?.focus()
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onPointer)
    return () => document.removeEventListener("mousedown", onPointer)
  }, [open, mounted])

  useEffect(() => {
    const term = query.trim()
    if (!open || !extendSearch || !term) {
      setRemote([])
      setSearching(false)
      return
    }
    const current = ++request.current
    setSearching(true)
    const timer = window.setTimeout(() => {
      listRecords<NamedRecord>(searchPath, { page: 1, limit: 100, name: term })
        .then((page) => {
          if (current !== request.current) return
          setRemote(page.items)
          for (const item of page.items) names.current.set(item.id, item.name)
        })
        .catch(() => {
          if (current === request.current) setRemote([])
        })
        .finally(() => {
          if (current === request.current) setSearching(false)
        })
    }, 280)
    return () => window.clearTimeout(timer)
  }, [query, open, extendSearch, searchPath])

  const rows = useMemo(() => {
    const term = fold(query)
    const pool = new Map<number, NamedRecord>()
    for (const item of options) pool.set(item.id, item)
    for (const item of remote) pool.set(item.id, item)
    return [...pool.values()]
      .filter((item) => !term || fold(item.name).includes(term))
      .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"))
      .slice(0, 100)
  }, [options, remote, query])

  useEffect(() => {
    setActive(-1)
  }, [query])

  useEffect(() => {
    if (!open || !mounted || !keyboardMove.current) return
    keyboardMove.current = false
    listRef.current?.querySelector<HTMLElement>("[data-active='true']")?.scrollIntoView({ block: "nearest" })
  }, [active, open, mounted])

  function moveActive(next: number | ((index: number) => number)) {
    keyboardMove.current = true
    setActive(next)
  }

  function toggle(idValue: number) {
    onChange(selected.includes(idValue) ? selected.filter((item) => item !== idValue) : [...selected, idValue])
  }

  function onInputKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      moveActive((index) => Math.min(rows.length - 1, index + 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      moveActive((index) => Math.max(0, index - 1))
    } else if (event.key === "Home") {
      event.preventDefault()
      moveActive(0)
    } else if (event.key === "End") {
      event.preventDefault()
      moveActive(Math.max(0, rows.length - 1))
    } else if (event.key === "Enter") {
      event.preventDefault()
      const next = rows[current]
      if (next) toggle(next.id)
    } else if (event.key === "Escape") {
      event.preventDefault()
      setOpen(false)
      buttonRef.current?.focus()
    } else if (event.key === "Tab") {
      setOpen(false)
    }
  }

  const current = active < 0 || rows.length === 0 ? -1 : Math.min(active, rows.length - 1)
  const summary = selected.length === 0 ? emptyLabel : selected.map((item) => names.current.get(item) || "Selecionado").join(", ")

  return (
    <div ref={rootRef} className={cn("relative w-full", mounted && "z-30")}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className={cn(
          "flex h-[50px] w-full items-center rounded-[10px] border border-solid border-[#E4E8ED] bg-white pl-[44px] pr-10 text-left text-[15px] font-normal text-brand-ink shadow-[0_4px_10px_rgba(15,23,42,0.035),0_10px_22px_rgba(15,23,42,0.045)] outline-none transition-[border-color,box-shadow] duration-[160ms] ease-[ease] hover:border-[#C5CDD6] focus-visible:border-[#53bb7e] focus-visible:shadow-[0_0_0_1px_rgba(50,149,92,0.22),0_6px_18px_rgba(50,149,92,0.16),0_10px_28px_rgba(80,186,130,0.18)]",
          loading && "cursor-wait disabled:opacity-100",
          open && "border-[#53bb7e] shadow-[0_0_0_1px_rgba(50,149,92,0.22),0_6px_18px_rgba(50,149,92,0.16),0_10px_28px_rgba(80,186,130,0.18)] hover:border-[#56ad7b]",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-busy={loading || undefined}
        disabled={loading}
        title={summary}
        onClick={() => {
          if (!loading) setOpen((value) => !value)
        }}
      >
        <Icon className="pointer-events-none absolute left-[14px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#94A3B8]" strokeWidth={1.75} aria-hidden />
        <span className={cn("truncate", loading && "text-[#64748B]")}>{loading ? "Carregando" : summary}</span>
        {loading ? (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
            <Spinner className="h-4 w-4 text-[#1E8A3A]" />
          </span>
        ) : (
          <ChevronDown className={cn("pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8] transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
        )}
      </button>
      {mounted ? (
        <div className={cn("absolute z-30 mt-[5px] w-full rounded-xl border border-[#E4E4E7] bg-white p-1.5 shadow-[0_8px_18px_rgba(15,23,42,0.06)]", open ? "site-select-in" : "pointer-events-none site-select-out")}>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-[14px] top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-[#94A3B8]" strokeWidth={1.75} aria-hidden />
            <input
              ref={inputRef}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls={listId}
              aria-activedescendant={rows[current] ? `${listId}-${current}` : undefined}
              value={query}
              placeholder={searchPlaceholder}
              className={cn(authInputClass(), "shadow-none hover:shadow-none focus:border-[#C5CDD6] focus:shadow-none hover:focus:border-[#C5CDD6] hover:focus:shadow-none")}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onInputKey}
            />
          </div>
          <ul ref={listRef} id={listId} role="listbox" aria-labelledby={id} aria-multiselectable="true" className="flex max-h-60 flex-col gap-1 overflow-auto">
            {rows.map((option, index) => {
              const chosen = selected.includes(option.id)
              const highlighted = index === current
              return (
                <li
                  key={option.id}
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
                  onClick={() => toggle(option.id)}
                >
                  <span className={cn("flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border", chosen ? "border-[#1E8A3A] bg-[#1E8A3A] text-white" : "border-[#D5DCE3] bg-white")} aria-hidden>
                    {chosen ? <Check className="h-3 w-3" strokeWidth={2.75} /> : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{option.name}</span>
                </li>
              )
            })}
            {rows.length === 0 ? <li className="px-3 py-3 text-sm text-brand-quiet">{searching ? "Buscando..." : emptyResult}</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
