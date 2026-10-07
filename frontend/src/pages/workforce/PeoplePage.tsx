import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { CatalogPanel } from "@/components/workforce/CatalogPanel"
import { listRecords, type Employee } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { showDate, situationLabel } from "@/utils/labels"

export function PeoplePage() {
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin"
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [tab, setTab] = useState("employees")
  const [items, setItems] = useState<Employee[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    if (tab !== "employees") {
      return
    }
    let active = true
    listRecords<Employee>("/employees", { page: 1, limit: 100 })
      .then((page) => {
        if (active) {
          setItems(page.items)
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
        }
      })
    return () => {
      active = false
    }
  }, [tab, tenantId])

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Pessoas</h1>
          <p className="text-sm text-muted-foreground">Funcionários, cargos e centros de custo. Quem entra no sistema continua em Permissões e Acessos.</p>
        </div>
        {isAdmin && tab === "employees" ? (
          <Button asChild>
            <Link to="/people/new">Novo funcionário</Link>
          </Button>
        ) : null}
      </div>
      <div className="flex gap-2">
        {[
          ["employees", "Funcionários"],
          ["jobs", "Cargos"],
          ["costs", "Centros de custo"],
        ].map(([id, label]) => (
          <Button key={id} type="button" variant={tab === id ? "default" : "outline"} size="sm" onClick={() => setTab(id)}>
            {label}
          </Button>
        ))}
      </div>
      {tab === "employees" ? (
        <>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {items.map((item) => (
              <li key={item.id}>
                <Link to={`/people/${item.id}`} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span>
                    {item.full_name}
                    <span className="ml-2 text-muted-foreground">{item.job_label || "Sem cargo"}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {situationLabel[item.situation || ""] || "Sem situação"} · {showDate(item.admission_date)}
                  </span>
                </Link>
              </li>
            ))}
            {items.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhum funcionário.</li> : null}
          </ul>
        </>
      ) : null}
      {tab === "jobs" ? <CatalogPanel title="Cargos" hint="O histórico do cargo fica no funcionário." path="/jobs" columns={[{ key: "name", label: "Nome" }]} fields={[{ name: "name", label: "Nome", type: "text", required: true }]} /> : null}
      {tab === "costs" ? (
        <CatalogPanel
          title="Centros de custo"
          hint="A vigência do centro fica no funcionário."
          path="/cost-centers"
          columns={[{ key: "name", label: "Nome" }]}
          fields={[{ name: "name", label: "Nome", type: "text", required: true }]}
        />
      ) : null}
    </div>
  )
}
