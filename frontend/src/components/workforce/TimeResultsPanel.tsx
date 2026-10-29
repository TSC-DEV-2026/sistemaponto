import { FormEvent, useEffect, useState } from "react"

import { ActionForm } from "@/components/ui/action-form"
import { Button } from "@/components/ui/button"
import { DatePickerField } from "@/components/ui/date-picker-field"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { ApuracaoDaySummary, dayMarks } from "@/components/workforce/apuracao-day"
import { readApuracaoQuery, rememberApuracaoScroll, saveApuracaoQuery } from "@/components/workforce/apuracao-session"
import { EmployeeCombobox } from "@/components/workforce/employee-combobox"
import { fieldClass } from "@/components/workforce/CatalogPanel"
import { getTimeResults, type Employee, type TimeResult, type TimeResults } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { punchDay, showDate, showDuration } from "@/utils/labels"

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

const resultNote =
  "Usa as marcações que valem, a jornada vigente, o feriado e as ocorrências. Escala 5x2. Tolerância de 10 minutos. Intervalo mínimo de 1 hora. Com banco, o excedente soma no saldo e o que fica abaixo compensa. Sem banco, o excedente é hora extra e a falta de tempo desconta. O adicional noturno não entra no saldo."

export function TimeResultsPanel({
  employeeId,
  employees,
  heading = true,
  appearance,
}: {
  employeeId?: number
  employees?: Employee[]
  heading?: boolean
  appearance?: "module"
}) {
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const saved = appearance === "module" ? readApuracaoQuery(tenantId) : null
  const returning = Boolean(saved?.scrollPending)
  const [selected, setSelected] = useState(returning && saved ? String(saved.employeeId) : "")
  const [startsOn, setStartsOn] = useState(returning && saved ? saved.startsOn : `${today().slice(0, 8)}01`)
  const [endsOn, setEndsOn] = useState(returning && saved ? saved.endsOn : today)
  const [result, setResult] = useState<TimeResults | null>(returning && saved ? saved.result : null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (appearance !== "module") return
    const query = readApuracaoQuery(tenantId)
    if (!query?.scrollPending) {
      setSelected("")
      setResult(null)
      return
    }
    setSelected(String(query.employeeId))
    setStartsOn(query.startsOn)
    setEndsOn(query.endsOn)
    setResult(query.result)
    const timer = window.setTimeout(() => {
      const current = readApuracaoQuery(tenantId)
      if (!current?.scrollPending) return
      window.scrollTo(0, 0)
      saveApuracaoQuery({ ...current, scrollY: 0, scrollPending: false })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [appearance, tenantId])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    if (appearance === "module") {
      setResult(null)
      setLoading(true)
    }
    try {
      const data = await getTimeResults(employeeId ?? Number(selected), startsOn, endsOn)
      setResult(data)
      if (appearance === "module" && tenantId) {
        saveApuracaoQuery({
          tenantId,
          employeeId: data.employee_id,
          startsOn: data.starts_on,
          endsOn: data.ends_on,
          result: data,
          scrollY: 0,
          scrollPending: false,
        })
      }
    } catch (caught) {
      setResult(null)
      setError(caught instanceof Error ? caught.message : "Não foi possível apurar.")
    } finally {
      if (appearance === "module") setLoading(false)
    }
  }

  const visible = result?.items.filter(hasSignal) ?? []

  if (appearance === "module") {
    return (
      <section className="space-y-4">
        <ActionForm className="rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-6" onSubmit={onSubmit}>
          <p className="text-sm leading-6 text-brand-muted">{resultNote}</p>
          {employees ? (
            <div className="mt-6 space-y-2">
              <Label className="font-semibold text-brand-ink" htmlFor="result-employee">
                Funcionário
              </Label>
              <EmployeeCombobox id="result-employee" value={selected} employees={employees} emptyLabel="Selecione" required extendSearch={employees.length >= 100} onChange={setSelected} />
            </div>
          ) : null}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <DatePickerField id="result-start" label="De" value={startsOn} onChange={setStartsOn} required />
            <DatePickerField id="result-end" label="Até" value={endsOn} onChange={setEndsOn} required />
          </div>
          <Button type="submit" className="mt-5 h-12 w-full rounded-[10px] bg-brand-cta text-white shadow-[0_8px_20px_rgba(30,138,58,0.18)] transition-[background-color,box-shadow] duration-200 hover:bg-brand-cta-hover hover:shadow-[0_10px_24px_rgba(30,138,58,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30 motion-reduce:transition-none">
            Apurar
          </Button>
        </ActionForm>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {loading ? (
          <div className="flex justify-center rounded-xl border border-[#E4E4E7] bg-white px-5 py-10">
            <Spinner />
          </div>
        ) : null}
        {result ? (
          <section className="rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-6">
            <h3 className="text-base font-semibold text-brand-ink">Resultado da apuração</h3>
            <p className="mt-1 text-sm text-brand-muted">Consulte os resultados por dia.</p>
            <p className="mt-2 text-sm text-[#52525B]">
              Período {showDate(result.starts_on)} a {showDate(result.ends_on)}
            </p>
            {visible.length > 0 ? (
              <div className="mt-4 flex flex-col gap-3">
                {visible.map((item) => (
                  <ApuracaoDaySummary
                    key={item.work_date}
                    item={item}
                    to={`/schedules/apuracao/${item.work_date.slice(0, 10)}?funcionario=${result.employee_id}&de=${result.starts_on.slice(0, 10)}&ate=${result.ends_on.slice(0, 10)}`}
                    onOpen={() => rememberApuracaoScroll(window.scrollY)}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-brand-quiet">Nenhum resultado encontrado para o período selecionado.</p>
            )}
          </section>
        ) : null}
      </section>
    )
  }

  return (
    <section className="space-y-3">
      {heading ? <h2 className="text-sm font-medium">Apuração</h2> : null}
      <p className="text-sm text-muted-foreground">{resultNote}</p>
      <ActionForm className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={onSubmit}>
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
      </ActionForm>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {result ? (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {visible.map((item) => (
            <li key={item.work_date} className="space-y-1 px-4 py-3 text-sm">
              <p className="font-medium">{showDate(item.work_date)}</p>
              <p className="text-muted-foreground">
                Previsto {showDuration(item.expected_minutes)} · Trabalhado {showDuration(item.worked_minutes)} · Atraso {showDuration(item.delay_minutes)} · Saída antecipada {showDuration(item.early_leave_minutes)}
              </p>
              <p className="text-muted-foreground">
                Hora extra {showDuration(item.overtime_minutes)} · Falta de tempo {showDuration(item.shortage_minutes)} · Banco {showDuration(item.bank_minutes)} · Noturno {showDuration(item.night_minutes)} · Adicional {showDuration(item.night_additional_minutes)}
              </p>
              {dayMarks(item) ? <p>{dayMarks(item)}</p> : null}
            </li>
          ))}
          {visible.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhum dia com jornada, marcação ou ocorrência neste período.</li> : null}
        </ul>
      ) : null}
    </section>
  )
}
