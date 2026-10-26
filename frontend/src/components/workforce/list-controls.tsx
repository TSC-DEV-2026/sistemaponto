import { Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, paginationItems } from "@/components/ui/pagination"
import { listRecords } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"

export const pageSizes = [5, 10, 20]

const fieldClass = "h-10 w-full rounded-md border border-border bg-card px-3 text-sm"

export type ListParams = Record<string, string | number | boolean | undefined>

export function ListSearch({
  id,
  value,
  onChange,
  onSearch,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  onSearch: () => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-60 flex-1 space-y-2">
        <Label htmlFor={id}>Pesquisar</Label>
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return
            event.preventDefault()
            onSearch()
          }}
        />
      </div>
      <Button type="button" onClick={onSearch}>
        <Search className="h-4 w-4" />
        Pesquisar
      </Button>
    </div>
  )
}

export function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  empty = "Todos",
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  empty?: string
}) {
  return (
    <div className="min-w-40 flex-1 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{empty}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function ListPager({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number
  pageSize: number
  total: number
  onPage: (page: number) => void
  onPageSize: (size: number) => void
}) {
  if (total <= 0) return null
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(page, pages)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-1" role="group" aria-label="Itens por página">
        {pageSizes.map((size) => (
          <Button key={size} type="button" size="sm" variant={pageSize === size ? "default" : "outline"} className="w-10 px-0" onClick={() => onPageSize(size)}>
            {size}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          Página {current} de {pages} ({total} {total === 1 ? "item" : "itens"})
        </p>
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious disabled={current <= 1} onClick={() => onPage(current - 1)} />
            </PaginationItem>
            {paginationItems(current, pages).map((item, index) => (
              <PaginationItem key={item === "ellipsis" ? `reticencias-${index}` : item}>
                {item === "ellipsis" ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink isActive={item === current} onClick={() => onPage(item)}>
                    {item}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext disabled={current * pageSize >= total} onClick={() => onPage(current + 1)} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}

export function usePagedList<T>(path: string, filters: ListParams, enabled = true, reloadKey = 0) {
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [items, setItems] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(enabled)
  const [reload, setReload] = useState(0)
  const request = useRef(0)
  const filtersRef = useRef(filters)
  const seen = useRef("")
  filtersRef.current = filters
  const filterKey = JSON.stringify(filters)

  useEffect(() => {
    if (!enabled) {
      setItems([])
      setTotal(0)
      setLoading(false)
      return
    }
    if (seen.current !== filterKey) {
      seen.current = filterKey
      if (page !== 1) {
        setPage(1)
        return
      }
    }
    const current = ++request.current
    setLoading(true)
    listRecords<T>(path, { page, limit: pageSize, ...filtersRef.current })
      .then((result) => {
        if (current !== request.current) return
        if (result.items.length === 0 && page > 1) {
          setPage(page - 1)
          return
        }
        setItems(result.items)
        setTotal(result.total)
        setError("")
      })
      .catch((caught: unknown) => {
        if (current === request.current) setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      })
      .finally(() => {
        if (current === request.current) setLoading(false)
      })
  }, [path, page, pageSize, tenantId, reload, reloadKey, filterKey, enabled])

  return {
    page,
    setPage,
    pageSize,
    setPageSize: (size: number) => {
      setPageSize(size)
      setPage(1)
    },
    items,
    total,
    loading,
    error,
    setError,
    reload: () => setReload((current) => current + 1),
  }
}
