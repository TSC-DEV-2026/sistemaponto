import { listRecords, type NamedRecord } from "@/services/workforce.service"

export const fieldClass = "h-10 w-full rounded-md border border-border bg-card px-3 text-sm"

export function optionsOf(path: string) {
  return listRecords<NamedRecord>(path, { page: 1, limit: 100 }).then((page) =>
    page.items.map((item) => ({ value: String(item.id), label: item.name })),
  )
}

export type CatalogField = {
  name: string
  label: string
  type: "text" | "date" | "time" | "textarea" | "select" | "checkbox"
  required?: boolean
  options?: { value: string; label: string }[]
  loadOptions?: () => Promise<{ value: string; label: string }[]>
}
