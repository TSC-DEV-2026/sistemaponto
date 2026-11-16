import { useEffect, useState } from "react"

import { listRecords, type NamedRecord } from "@/services/workforce.service"

export type GroupRecord = { id: number; name: string; values: NamedRecord[] }

export async function loadGroups() {
  const first = await listRecords<NamedRecord>("/groups", { page: 1, limit: 100 })
  const rows = [...first.items]
  const pages = Math.ceil(first.total / 100)
  for (let page = 2; page <= pages; page += 1) {
    const next = await listRecords<NamedRecord>("/groups", { page, limit: 100 })
    rows.push(...next.items)
  }
  const loaded: GroupRecord[] = []
  for (const item of rows) {
    const valuesPage = await listRecords<NamedRecord>("/group-values", {
      page: 1,
      limit: 100,
      group_id: item.id,
    })
    const values = [...valuesPage.items]
    const valuePages = Math.ceil(valuesPage.total / 100)
    for (let page = 2; page <= valuePages; page += 1) {
      const next = await listRecords<NamedRecord>("/group-values", {
        page,
        limit: 100,
        group_id: item.id,
      })
      values.push(...next.items)
    }
    loaded.push({ id: item.id, name: item.name, values })
  }
  return loaded
}

export function GroupFilter({
  selected,
  onChange,
}: {
  selected: number[]
  onChange: (ids: number[]) => void
}) {
  const [groups, setGroups] = useState<GroupRecord[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    loadGroups()
      .then((loaded) => {
        if (active) setGroups(loaded)
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar os grupos.")
      })
    return () => {
      active = false
    }
  }, [])

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id])
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (groups.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <fieldset key={group.id} className="min-w-0 space-y-2">
          <legend className="text-sm font-semibold text-[#0A0A0A]">{group.name}</legend>
          {group.values.length === 0 ? <p className="text-sm text-[#64748B]">Sem valores.</p> : null}
          <div className="space-y-1">
            {group.values.map((value) => (
              <label key={value.id} className="flex items-center gap-2 text-sm text-[#334155]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#1E8A3A]"
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
