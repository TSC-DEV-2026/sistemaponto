import { FormEvent, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createRecord, listRecords, removeRecord, updateRecord, type NamedRecord } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"

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

type Props = {
  title: string
  hint: string
  path: string
  columns: { key: string; label: string }[]
  fields: CatalogField[]
}

export function CatalogPanel({ title, hint, path, columns, fields }: Props) {
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin"
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [items, setItems] = useState<NamedRecord[]>([])
  const [error, setError] = useState("")
  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [options, setOptions] = useState<Record<string, { value: string; label: string }[]>>({})

  function blank() {
    const next: Record<string, string> = {}
    for (const field of fields) {
      next[field.name] = field.type === "checkbox" ? "true" : ""
    }
    return next
  }

  async function load() {
    const page = await listRecords<NamedRecord>(path, { page: 1, limit: 100 })
    setItems(page.items)
  }

  useEffect(() => {
    let active = true
    setForm(blank())
    Promise.all(
      fields.map(async (field) => {
        const loaded = field.loadOptions ? await field.loadOptions() : field.options || []
        return [field.name, loaded] as const
      }),
    )
      .then((pairs) => {
        if (active) {
          setOptions(Object.fromEntries(pairs))
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Não foi possível carregar.")
        }
      })
    load()
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
        }
      })
    return () => {
      active = false
    }
  }, [path, tenantId])

  function display(item: NamedRecord, key: string) {
    const value = item[key as keyof NamedRecord]
    const choice = options[key]?.find((option) => option.value === String(value ?? ""))
    if (choice) {
      return choice.label
    }
    if (typeof value === "boolean") {
      return value ? "Ativo" : "Inativo"
    }
    if (value === null || value === undefined || value === "") {
      return "—"
    }
    return String(value)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    const body: Record<string, unknown> = {}
    for (const field of fields) {
      const raw = form[field.name] ?? ""
      if (field.type === "checkbox") {
        body[field.name] = raw === "true"
      } else if (field.name.endsWith("_id")) {
        body[field.name] = raw ? Number(raw) : null
      } else {
        body[field.name] = raw.trim() ? raw.trim() : null
      }
    }
    try {
      if (editing === null) {
        await createRecord(path, body)
      } else {
        await updateRecord(path, editing, body)
      }
      setEditing(null)
      setForm(blank())
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.")
    }
  }

  async function onDelete(id: number) {
    setError("")
    try {
      await removeRecord(path, id)
      if (editing === id) {
        setEditing(null)
        setForm(blank())
      }
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível excluir.")
    }
  }

  function edit(item: NamedRecord) {
    const next = blank()
    for (const field of fields) {
      const value = item[field.name as keyof NamedRecord]
      if (field.type === "checkbox") {
        next[field.name] = value === false ? "false" : "true"
      } else {
        next[field.name] = value === null || value === undefined ? "" : String(value)
      }
    }
    setEditing(item.id)
    setForm(next)
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      {isAdmin ? (
        <form className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={onSubmit}>
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={`${path}-${field.name}`}>{field.label}</Label>
              {field.type === "select" ? (
                <select
                  id={`${path}-${field.name}`}
                  className={fieldClass}
                  value={form[field.name] ?? ""}
                  required={field.required}
                  disabled={editing !== null && field.name === "kind"}
                  onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                >
                  <option value="">Selecione</option>
                  {(options[field.name] || []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "checkbox" ? (
                <select
                  id={`${path}-${field.name}`}
                  className={fieldClass}
                  value={form[field.name] ?? "true"}
                  onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  id={`${path}-${field.name}`}
                  className="min-h-20 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                  value={form[field.name] ?? ""}
                  onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                />
              ) : (
                <Input
                  id={`${path}-${field.name}`}
                  type={field.type}
                  required={field.required}
                  value={form[field.name] ?? ""}
                  onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                />
              )}
            </div>
          ))}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit">{editing === null ? "Salvar" : "Atualizar"}</Button>
            {editing !== null ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(null)
                  setForm(blank())
                }}
              >
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}
      {!isAdmin && error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <button type="button" className="text-left" onClick={() => edit(item)}>
              {columns.map((column) => (
                <span key={column.key} className="mr-3">
                  <span className="text-muted-foreground">{column.label}: </span>
                  {display(item, column.key)}
                </span>
              ))}
            </button>
            {isAdmin ? (
              <Button type="button" variant="destructive" size="sm" onClick={() => void onDelete(item.id)}>
                Excluir
              </Button>
            ) : null}
          </li>
        ))}
        {items.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhum cadastro.</li> : null}
      </ul>
    </section>
  )
}
