import { useEffect, useState } from "react"

import { listRecords, type NamedRecord } from "@/services/workforce.service"
import { toastError } from "@/store/toast.store"

export type CategoryRecord = { id: number; name: string; values: NamedRecord[] }

export async function loadCategories() {
  const first = await listRecords<NamedRecord>("/categories", { page: 1, limit: 100 })
  const rows = [...first.items]
  const pages = Math.ceil(first.total / 100)
  for (let page = 2; page <= pages; page += 1) {
    const next = await listRecords<NamedRecord>("/categories", { page, limit: 100 })
    rows.push(...next.items)
  }
  const loaded: CategoryRecord[] = []
  for (const item of rows) {
    const valuesPage = await listRecords<NamedRecord>("/category-values", {
      page: 1,
      limit: 100,
      category_id: item.id,
    })
    const values = [...valuesPage.items]
    const valuePages = Math.ceil(valuesPage.total / 100)
    for (let page = 2; page <= valuePages; page += 1) {
      const next = await listRecords<NamedRecord>("/category-values", {
        page,
        limit: 100,
        category_id: item.id,
      })
      values.push(...next.items)
    }
    loaded.push({ id: item.id, name: item.name, values })
  }
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
