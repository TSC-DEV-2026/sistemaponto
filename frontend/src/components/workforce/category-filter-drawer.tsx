import { Check, ChevronDown, ChevronRight, Minus, Search, X, CheckCheck, Square } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { type CategoryRecord } from "@/components/workforce/ClassificationFilter"
import { moduleFieldClass, moduleLabelClass, modulePrimaryClass, moduleQuietClass } from "@/components/workforce/module-visual"
import { conceptIcon } from "@/utils/concept-icons"
import { cn } from "@/utils/cn"

function fold(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim()
}

function categorySummary(categories: CategoryRecord[], selected: number[]) {
  const groups = categories
    .map((category) => ({
      name: category.name,
      picked: category.values.filter((value) => selected.includes(value.id)),
      total: category.values.length,
    }))
    .filter((item) => item.picked.length > 0)
  if (groups.length === 0) return "Todas"
  if (groups.length === 1) {
    const group = groups[0]
    if (group.total > 0 && group.picked.length === group.total) return group.name
    if (group.picked.length === 1) return `${group.name}: ${group.picked[0].name}`
    return `${group.name}: ${group.picked.length} valores`
  }
  return `${groups.length} categorias`
}

function visibleCategories(categories: CategoryRecord[], query: string) {
  const term = fold(query)
  if (!term) return categories.map((category) => ({ category, values: category.values }))
  return categories.flatMap((category) => {
    if (fold(category.name).includes(term)) return [{ category, values: category.values }]
    const values = category.values.filter((value) => fold(value.name).includes(term))
    return values.length > 0 ? [{ category, values }] : []
  })
}

function MarkBox({ state }: { state: "on" | "off" | "some" }) {
  return (
    <span className={cn("flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border", state === "off" ? "border-[#D5DCE3] bg-white" : "border-[#1E8A3A] bg-[#1E8A3A] text-white")}>
      {state === "on" ? <Check className="h-3.5 w-3.5" strokeWidth={2.75} /> : null}
      {state === "some" ? <Minus className="h-3.5 w-3.5" strokeWidth={2.75} /> : null}
    </span>
  )
}

export function CategoryFilterField({
  id,
  categories,
  selected,
  loading,
  onChange,
}: {
  id: string
  categories: CategoryRecord[]
  selected: number[]
  loading: boolean
  onChange: (ids: number[]) => void
}) {
  const [present, setPresent] = useState(false)
  const [phase, setPhase] = useState<"in" | "out">("in")
  const buttonRef = useRef<HTMLButtonElement>(null)
  const summary = categorySummary(categories, selected)
  const Icon = conceptIcon.category

  function openDrawer() {
    setPhase("in")
    setPresent(true)
  }

  function close() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPresent(false)
      buttonRef.current?.focus()
      return
    }
    setPhase("out")
  }

  function finishClose() {
    setPresent(false)
    buttonRef.current?.focus()
  }

  return (
    <>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className={cn(
          "flex h-[50px] w-full items-center gap-2 rounded-[10px] border px-4 text-left text-[15px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30",
          selected.length > 0 || present ? "border-[#1E8A3A] bg-[#EAF7EF] text-[#1E8A3A]" : "border-[#E2E8F0] bg-white text-[#0A0A0A] hover:border-[#8ED4A8] hover:bg-[#F7FCF9]",
          loading && "cursor-wait disabled:opacity-100",
        )}
        aria-haspopup="dialog"
        aria-expanded={present}
        aria-busy={loading || undefined}
        disabled={loading}
        onClick={() => {
          if (!loading) openDrawer()
        }}
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0 flex-1 truncate">{loading ? "Carregando" : selected.length > 0 ? summary : "Escolher categorias"}</span>
        {loading ? <Spinner className="h-4 w-4 text-[#1E8A3A]" /> : <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />}
      </button>
      {present ? <CategoryDrawer categories={categories} selected={selected} phase={phase} onChange={onChange} onClose={close} onExited={finishClose} /> : null}
    </>
  )
}

function CategoryDrawer({
  categories,
  selected,
  phase,
  onChange,
  onClose,
  onExited,
}: {
  categories: CategoryRecord[]
  selected: number[]
  phase: "in" | "out"
  onChange: (ids: number[]) => void
  onClose: () => void
  onExited: () => void
}) {
  const titleId = useId()
  const searchId = useId()
  const searchRef = useRef<HTMLInputElement>(null)
  const closeRef = useRef(onClose)
  const exitedRef = useRef(onExited)
  const phaseRef = useRef(phase)
  closeRef.current = onClose
  exitedRef.current = onExited
  phaseRef.current = phase
  const [query, setQuery] = useState("")
  const [collapsed, setCollapsed] = useState<number[]>([])
  const listed = visibleCategories(categories, query)
  const everyId = categories.flatMap((category) => category.values.map((value) => value.id))
  const allMarked = everyId.length > 0 && everyId.every((id) => selected.includes(id))
  const searching = fold(query).length > 0

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus())
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        closeRef.current()
      }
    }
    document.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [])

  function toggleCategory(category: CategoryRecord) {
    const ids = category.values.map((value) => value.id)
    if (ids.length === 0) return
    const allOn = ids.every((id) => selected.includes(id))
    onChange(allOn ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])])
  }

  function toggleValue(id: number) {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id])
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className={cn("absolute inset-0 bg-[rgba(15,23,42,0.45)]", phase === "in" ? "category-drawer-shade-in" : "category-drawer-shade-out")}
        onMouseDown={() => {
          if (phaseRef.current === "in") onClose()
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn("relative flex h-full w-full max-w-[440px] flex-col bg-white shadow-[0_24px_64px_rgba(15,23,42,0.18)]", phase === "in" ? "category-drawer-in" : "category-drawer-out")}
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget) return
          if (event.animationName === "category-drawer-out" && phaseRef.current === "out") exitedRef.current()
        }}
      >
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-[#0A0A0A]">Categorias</h2>
            <p className="mt-1 text-sm text-[#64748B]">{selected.length === 0 ? "Nenhum valor marcado" : `${selected.length} ${selected.length === 1 ? "valor marcado" : "valores marcados"}`}</p>
          </div>
          <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#64748B] transition-colors duration-200 hover:bg-[#F4F4F5] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30 motion-reduce:transition-none" aria-label="Fechar" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="space-y-4 px-5 pb-4">
          <div className="space-y-2">
            <Label className={moduleLabelClass} htmlFor={searchId}>Pesquisar</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#94A3B8]" strokeWidth={1.75} aria-hidden />
              <Input ref={searchRef} id={searchId} value={query} placeholder="Pesquisar categoria ou valor" className={cn(moduleFieldClass, "pl-10")} onChange={(event) => setQuery(event.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className={cn(moduleQuietClass, "h-11 px-4")} disabled={allMarked} onClick={() => onChange([...everyId])}>
              <CheckCheck className="h-4 w-4" />
              Marcar todos
            </Button>
            <Button type="button" className={cn(moduleQuietClass, "h-11 px-4")} disabled={selected.length === 0} onClick={() => onChange([])}>
              <Square className="h-4 w-4" />
              Desmarcar todos
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {listed.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-[#64748B]">Nenhuma categoria encontrada.</p>
          ) : (
            <ul className="space-y-1">
              {listed.map(({ category, values }) => {
                const picked = category.values.filter((value) => selected.includes(value.id)).length
                const state = category.values.length === 0 || picked === 0 ? "off" : picked === category.values.length ? "on" : "some"
                const shown = searching || !collapsed.includes(category.id)
                return (
                  <li key={category.id}>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-[#F7FCF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30 disabled:cursor-default disabled:hover:bg-transparent"
                        role="checkbox"
                        aria-checked={state === "on" ? true : state === "some" ? "mixed" : false}
                        disabled={category.values.length === 0}
                        onClick={() => toggleCategory(category)}
                      >
                        <MarkBox state={state} />
                        <span className="min-w-0">
                          <span className={cn("block truncate text-[15px] font-semibold", state === "off" ? "text-[#0A0A0A]" : "text-[#1E8A3A]")}>{category.name}</span>
                          {category.values.length === 0 ? <span className="mt-0.5 block text-xs text-[#64748B]">Sem valores.</span> : null}
                          {state === "some" ? <span className="mt-0.5 block text-xs text-[#64748B]">{picked} de {category.values.length}</span> : null}
                        </span>
                      </button>
                      {category.values.length > 0 ? (
                        <button
                          type="button"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F4F4F5] hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30"
                          aria-expanded={shown}
                          aria-label={shown ? `Recolher ${category.name}` : `Expandir ${category.name}`}
                          onClick={() => setCollapsed((current) => current.includes(category.id) ? current.filter((item) => item !== category.id) : [...current, category.id])}
                        >
                          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200 motion-reduce:transition-none", shown && "rotate-180")} aria-hidden />
                        </button>
                      ) : null}
                    </div>
                    {shown && values.length > 0 ? (
                      <ul className="mb-1 ml-[22px] border-l border-[#E7E8EA] pl-3">
                        {values.map((value) => {
                          const marked = selected.includes(value.id)
                          return (
                            <li key={value.id}>
                              <button
                                type="button"
                                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[#F7FCF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30"
                                role="checkbox"
                                aria-checked={marked}
                                onClick={() => toggleValue(value.id)}
                              >
                                <MarkBox state={marked ? "on" : "off"} />
                                <span className={cn("truncate text-[15px]", marked ? "font-medium text-[#1E8A3A]" : "text-[#0A0A0A]")}>{value.name}</span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="flex justify-end border-t border-[#E2E8F0] px-5 py-4">
          <Button type="button" className={modulePrimaryClass} onClick={onClose}>
            <Check className="h-4 w-4" />
            Concluir
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
