import { FormEvent, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CatalogPanel, fieldClass } from "@/components/workforce/CatalogPanel"
import { createRecord, listRecords, type Employee, type Punch } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { punchSourceLabel, showDateTime } from "@/utils/labels"

export function JourneyPage() {
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin"
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [punches, setPunches] = useState<Punch[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeId, setEmployeeId] = useState("")
  const [occurredAt, setOccurredAt] = useState("")
  const [note, setNote] = useState("")
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

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      await createRecord("/punches", {
        employee_id: Number(employeeId),
        occurred_at: new Date(occurredAt).toISOString(),
        note: note.trim() || null,
      })
      setNote("")
      await loadPunches()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Jornada e Ponto</h1>
        <p className="mt-2 text-sm text-muted-foreground">Jornada é o previsto. Marcação é o ocorrido. Apuração é o resultado e ainda não é calculada.</p>
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
        {isAdmin ? (
          <form className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="employee">Funcionário</Label>
              <select id="employee" className={fieldClass} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} required>
                <option value="">Selecione</option>
                {employees.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="when">Quando</Label>
              <input id="when" className={fieldClass} type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Observação</Label>
              <Input id="note" value={note} onChange={(event) => setNote(event.target.value)} />
            </div>
            <Button type="submit">Lançar marcação</Button>
          </form>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {punches.map((item) => (
            <li key={item.id} className="px-4 py-3 text-sm">
              {employees.find((person) => person.id === item.employee_id)?.full_name || item.employee_id} · {showDateTime(item.occurred_at)} · {punchSourceLabel[item.source] || item.source}
            </li>
          ))}
          {punches.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhuma marcação.</li> : null}
        </ul>
      </section>
      <section className="rounded-md border border-border bg-card px-4 py-3 text-sm">
        <h2 className="font-medium">Apuração</h2>
        <p className="mt-1 text-muted-foreground">Nenhum resultado calculado. Tolerância, atraso, hora extra, intervalo e banco de horas ainda não têm regra definida.</p>
      </section>
      <section className="rounded-md border border-border bg-card px-4 py-3 text-sm">
        <h2 className="font-medium">Banco de horas</h2>
        <p className="mt-1 text-muted-foreground">Nenhum saldo. Crédito, débito, validade e compensação ainda não foram definidos.</p>
      </section>
    </div>
  )
}
