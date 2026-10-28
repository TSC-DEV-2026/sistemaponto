import { Check, ChevronDown, Search, User } from "lucide-react"
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react"

import { authInputClass } from "@/components/auth-screen"
import { listRecords, type Employee } from "@/services/workforce.service"
import { cn } from "@/utils/cn"

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
}

export function EmployeeCombobox({
  id,
  value,
  employees,
  extendSearch = false,
  emptyLabel = "Todos",
  required = false,
  onChange,
}: {
  id: string
  value: string
  employees: Employee[]
  extendSearch?: boolean
  emptyLabel?: string
  required?: boolean
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(-1)
  const [remote, setRemote] = useState<Employee[]>([])
  const [searching, setSearching] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const names = useRef(new Map<string, string>())
  const request = useRef(0)
  const listId = useId()

  useEffect(() => {
    for (const item of employees) names.current.set(String(item.id), item.full_name)
  }, [employees])

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
      listRecords<Employee>("/employees", { page: 1, limit: 100, full_name: term })
        .then((page) => {
          if (current !== request.current) return
          setRemote(page.items)
          for (const item of page.items) names.current.set(String(item.id), item.full_name)
        })
        .catch(() => {
          if (current === request.current) setRemote([])
        })
        .finally(() => {
          if (current === request.current) setSearching(false)
        })
    }, 280)
    return () => window.clearTimeout(timer)
  }, [query, open, extendSearch])

  const options = useMemo(() => {
    const term = fold(query)
    const pool = new Map<number, Employee>()
    for (const item of employees) pool.set(item.id, item)
    for (const item of remote) pool.set(item.id, item)
    const people = [...pool.values()].filter((item) => !term || fold(item.full_name).includes(term))
    people.sort((left, right) => left.full_name.localeCompare(right.full_name, "pt-BR"))
    const rows = people.slice(0, 100).map((item) => ({ value: String(item.id), label: item.full_name }))
    if (!required && (!term || fold(emptyLabel).includes(term))) rows.unshift({ value: "", label: emptyLabel })
    return rows
  }, [employees, remote, query, emptyLabel, required])

  useEffect(() => {
    setActive(-1)
  }, [query])

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

  function onInputKey(event: KeyboardEvent<HTMLInputElement>) {
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
      setActive(Math.max(0, options.length - 1))
    } else if (event.key === "Enter") {
      event.preventDefault()
      const next = options[current]
      if (next) choose(next.value)
    } else if (event.key === "Escape") {
      event.preventDefault()
      close(true)
    } else if (event.key === "Tab") {
      setOpen(false)
    }
  }

  const current = active < 0 || options.length === 0 ? -1 : Math.min(active, options.length - 1)
  const selectedFromList = employees.find((item) => String(item.id) === value) || remote.find((item) => String(item.id) === value)
  const selectedLabel = value ? selectedFromList?.full_name || names.current.get(value) || "Funcionário" : emptyLabel

  return (
    <div ref={rootRef} className={cn("relative w-full", mounted && "z-30")}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className={cn(
          "flex h-[50px] w-full items-center rounded-[10px] border border-solid border-[#E4E8ED] bg-white pl-[44px] pr-10 text-left text-[15px] font-normal text-brand-ink shadow-[0_4px_10px_rgba(15,23,42,0.035),0_10px_22px_rgba(15,23,42,0.045)] outline-none transition-[border-color,box-shadow] duration-[160ms] ease-[ease] hover:border-[#C5CDD6] focus-visible:border-[#53bb7e] focus-visible:shadow-[0_0_0_1px_rgba(50,149,92,0.22),0_6px_18px_rgba(50,149,92,0.16),0_10px_28px_rgba(80,186,130,0.18)]",
          open && "border-[#53bb7e] shadow-[0_0_0_1px_rgba(50,149,92,0.22),0_6px_18px_rgba(50,149,92,0.16),0_10px_28px_rgba(80,186,130,0.18)] hover:border-[#56ad7b]",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-required={required || undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <User className="pointer-events-none absolute left-[14px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#94A3B8]" strokeWidth={1.75} aria-hidden />
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={cn("pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8] transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
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
            setOpen(true)
          }}
        />
      ) : null}
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
              aria-activedescendant={options[current] ? `${listId}-${current}` : undefined}
              value={query}
              placeholder="Pesquisar funcionário"
              className={cn(authInputClass(false), "shadow-none hover:shadow-none focus:border-[#C5CDD6] focus:shadow-none hover:focus:border-[#C5CDD6] hover:focus:shadow-none")}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onInputKey}
            />
          </div>
          <ul ref={listRef} id={listId} role="listbox" aria-labelledby={id} className="flex max-h-60 flex-col gap-1 overflow-auto">
            {options.map((option, index) => {
              const chosen = option.value === value
              const highlighted = index === current
              return (
                <li
                  key={option.value || "todos"}
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
            {options.length === 0 ? <li className="px-3 py-3 text-sm text-brand-quiet">{searching ? "Buscando..." : "Nenhum funcionário encontrado."}</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
