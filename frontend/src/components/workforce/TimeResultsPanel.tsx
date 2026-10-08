import { FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { fieldClass } from "@/components/workforce/CatalogPanel"
import { getTimeResults, type Employee, type TimeResult, type TimeResults } from "@/services/workforce.service"
import { punchDay, showDate, showMinutes, showSignedMinutes } from "@/utils/labels"

function today() {
  return punchDay(new Date().toISOString())
}

function hasSignal(item: TimeResult) {
  return (
    item.expected_minutes > 0 ||
    item.worked_minutes > 0 ||
    item.delay_minutes > 0 ||
    item.early_leave_minutes > 0 ||
    item.overtime_minutes > 0 ||
    item.shortage_minutes > 0 ||
    item.bank_minutes !== 0 ||
    item.night_minutes > 0 ||
    item.absence ||
    item.incomplete ||
    item.holiday ||
    item.warnings.length > 0
  )
}

function marks(item: TimeResult) {
  const labels = [
    item.holiday ? "Feriado" : "",
    item.absence ? "Falta" : "",
    item.incomplete ? "Ponto incompleto" : "",
    ...item.warnings,
  ].filter(Boolean)
  return labels.join(" · ")
}

export function TimeResultsPanel({ employeeId, employees }: { employeeId?: number; employees?: Employee[] }) {
  const [selected, setSelected] = useState("")
  const [startsOn, setStartsOn] = useState(() => `${today().slice(0, 8)}01`)
  const [endsOn, setEndsOn] = useState(today)
  const [result, setResult] = useState<TimeResults | null>(null)
  const [error, setError] = useState("")

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      const data = await getTimeResults(employeeId ?? Number(selected), startsOn, endsOn)
      setResult(data)
    } catch (caught) {
      setResult(null)
      setError(caught instanceof Error ? caught.message : "Não foi possível apurar.")
    }
  }

  const visible = result?.items.filter(hasSignal) ?? []

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium">Apuração</h2>
      <p className="text-sm text-muted-foreground">
        Usa as marcações que valem, a jornada vigente, o feriado e as ocorrências. Escala 5x2. Tolerância de 10 minutos. Intervalo mínimo de 1 hora. Com banco, o excedente soma no saldo e o que fica abaixo compensa. Sem banco, o excedente é hora extra e a falta de tempo desconta. O adicional noturno não entra no saldo.
      </p>
      <form className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={onSubmit}>
        {employees ? (
          <div className="space-y-2">
            <Label htmlFor="result-employee">Funcionário</Label>
            <select id="result-employee" className={fieldClass} value={selected} onChange={(event) => setSelected(event.target.value)} required>
              <option value="">Selecione</option>
              {employees.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="result-start">De</Label>
            <input id="result-start" className={fieldClass} type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="result-end">Até</Label>
            <input id="result-end" className={fieldClass} type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} required />
          </div>
        </div>
        <Button type="submit">Apurar</Button>
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {result ? (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {visible.map((item) => (
            <li key={item.work_date} className="space-y-1 px-4 py-3 text-sm">
              <p className="font-medium">{showDate(item.work_date)}</p>
              <p className="text-muted-foreground">
                Previsto {showMinutes(item.expected_minutes)} · Trabalhado {showMinutes(item.worked_minutes)} · Atraso {showMinutes(item.delay_minutes)} · Saída antecipada {showMinutes(item.early_leave_minutes)}
              </p>
              <p className="text-muted-foreground">
                Hora extra {showMinutes(item.overtime_minutes)} · Falta de tempo {showMinutes(item.shortage_minutes)} · Banco {showSignedMinutes(item.bank_minutes)} · Noturno {showMinutes(item.night_minutes)} · Adicional {showMinutes(item.night_additional_minutes)}
              </p>
              {marks(item) ? <p>{marks(item)}</p> : null}
            </li>
          ))}
          {visible.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhum dia com jornada, marcação ou ocorrência neste período.</li> : null}
        </ul>
      ) : null}
    </section>
  )
}
