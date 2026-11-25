import { useEffect, useState } from "react"

import { listRecords, type NamedRecord } from "@/services/workforce.service"
import { toastError } from "@/store/toast.store"

export type CategoryRecord = { id: number; name: string; values: NamedRecord[] }

async function loadPages<T>(path: string, params: Record<string, string | number> = {}) {
  const first = await listRecords<T>(path, { page: 1, limit: 100, ...params })
  const rows = [...first.items]
  const pages = Math.ceil(first.total / 100)
  if (pages <= 1) return rows
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, index) => listRecords<T>(path, { page: index + 2, limit: 100, ...params })),
  )
  for (const page of rest) rows.push(...page.items)
  return rows
}

export async function loadCategories() {
  const rows = await loadPages<NamedRecord>("/categories", { fields: "id,name" })
  const loaded = await Promise.all(
    rows.map(async (item) => {
      const values = await loadPages<NamedRecord>("/category-values", {
        category_id: item.id,
        fields: "id,name,category_id",
      })
      return { id: item.id, name: item.name, values }
    }),
  )
  return loaded
}

export function CategoryFilter({
  selected,
  onChange,
}: {
  selected: number[]
  onChange: (ids: number[]) => void
}) {
  const [groups, setGroups] = useState<CategoryRecord[]>([])

  useEffect(() => {
    let active = true
    loadCategories()
      .then((loaded) => {
        if (active) setGroups(loaded)
      })
      .catch(() => {
        if (active) toastError("Não foi possível carregar as categorias.")
      })
    return () => {
      active = false
    }
  }, [])

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id])
  }

  if (groups.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <fieldset key={group.id} className="min-w-0 space-y-2">
          <legend className="text-sm font-semibold text-ui-ink">{group.name}</legend>
          {group.values.length === 0 ? <p className="text-sm text-ui-slate">Sem valores.</p> : null}
          <div className="space-y-1">
            {group.values.map((value) => (
              <label key={value.id} className="flex items-center gap-2 text-sm text-ui-slate-deep">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand-cta"
                  checked={selected.includes(value.id)}
                  onChange={() => toggle(value.id)}
                />
                {value.name}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  )
}

export function classificationQuery(ids: number[]) {
  return ids.length > 0 ? ids.join(",") : ""
}
