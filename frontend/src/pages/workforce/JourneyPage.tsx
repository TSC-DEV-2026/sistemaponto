import { useEffect, useState } from "react"

import { CatalogPanel } from "@/components/workforce/CatalogPanel"
import { PunchCorrectionForm, PunchLists } from "@/components/workforce/PunchDay"
import { TimeResultsPanel } from "@/components/workforce/TimeResultsPanel"
import { listRecords, type Employee, type Punch } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"

export function JourneyPage() {
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin"
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [punches, setPunches] = useState<Punch[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [error, setError] = useState("")

  async function loadPunches() {
    const [marks, people] = await Promise.all([
      listRecords<Punch>("/punches", { page: 1, limit: 100 }),
      listRecords<Employee>("/employees", { page: 1, limit: 100 }),
    ])
    setPunches(marks.items)
    setEmployees(people.items)
  }

  useEffect(() => {
    let active = true
    loadPunches().catch((caught: unknown) => {
      if (active) {
        setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      }
    })
    return () => {
      active = false
    }
  }, [tenantId])

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Jornada e Ponto</h1>
        <p className="mt-2 text-sm text-muted-foreground">Jornada é o previsto. Marcação é o ocorrido. Apuração é o resultado do período.</p>
      </div>
      <CatalogPanel
        title="Jornadas"
        hint="O horário descrito aqui é o previsto. A vigência de cada funcionário fica em Pessoas."
        path="/journeys"
        columns={[{ key: "name", label: "Nome" }]}
        fields={[
          { name: "name", label: "Nome", type: "text", required: true },
          { name: "morning_start", label: "Entrada manhã", type: "time" },
          { name: "morning_end", label: "Saída manhã", type: "time" },
          { name: "afternoon_start", label: "Entrada tarde", type: "time" },
          { name: "afternoon_end", label: "Saída tarde", type: "time" },
          { name: "note", label: "Observação", type: "textarea" },
        ]}
      />
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Marcações</h2>
        {isAdmin ? <PunchCorrectionForm employees={employees} onSaved={loadPunches} /> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <PunchLists punches={punches} employeeName={(id) => employees.find((person) => person.id === id)?.full_name || String(id)} />
      </section>
      <TimeResultsPanel employees={employees} />
      <section className="rounded-md border border-border bg-card px-4 py-3 text-sm">
        <h2 className="font-medium">Banco de horas</h2>
        <p className="mt-1 text-muted-foreground">Nenhum saldo. Crédito, débito, validade e compensação ainda não foram definidos.</p>
      </section>
    </div>
  )
}
