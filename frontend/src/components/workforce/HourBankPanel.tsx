import { FormEvent, useEffect, useState } from "react"

import { ActionForm } from "@/components/ui/action-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ListPlaceholder } from "@/components/ui/list-placeholder"
import { fieldClass } from "@/components/workforce/CatalogPanel"
import { moduleTextClass } from "@/components/workforce/module-visual"
import { FilterSelect, ListPager, usePagedList } from "@/components/workforce/list-controls"
import {
  createRecord,
  getHourBank,
  type Employee,
  type HourBank,
  type HourBankEntry,
} from "@/services/workforce.service"
import { hourBankEffectLabel, hourBankKindLabel, punchDay, showDate, showMinutes, showSignedMinutes } from "@/utils/labels"

export function HourBankPanel({
  employeeId,
  employees,
  canLaunch,
  usesBank = false,
}: {
  employeeId?: number
  employees?: Employee[]
  canLaunch: boolean
  usesBank?: boolean
}) {
  const [selected, setSelected] = useState(employeeId ? String(employeeId) : "")
  const [balance, setBalance] = useState<HourBank | null>(null)
  const [entryKind, setEntryKind] = useState("")
  const [saved, setSaved] = useState(0)
  const [kind, setKind] = useState("settlement")
  const [minutes, setMinutes] = useState("")
  const [entryOn, setEntryOn] = useState(punchDay(new Date().toISOString()))
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const chosenId = employeeId ?? (selected ? Number(selected) : 0)
  const person = employees?.find((item) => item.id === chosenId)
  const enabled = employees ? Boolean(person?.hour_bank) : usesBank
  const entries = usePagedList<HourBankEntry>(
    "/hour-bank-entries",
    { ...(chosenId ? { employee_id: chosenId } : {}), ...(entryKind ? { kind: entryKind } : {}) },
    chosenId > 0,
    saved,
  )

  async function load(nextId: number) {
    setBalance(await getHourBank(nextId))
    setSaved((current) => current + 1)
  }

  useEffect(() => {
    if (!chosenId) {
      return
    }
    let active = true
    load(chosenId).catch((caught: unknown) => {
      if (active) {
        setBalance(null)
        setError(caught instanceof Error ? caught.message : "Não foi possível consultar o saldo.")
      }
    })
    return () => {
      active = false
    }
  }, [chosenId])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      await createRecord("/hour-bank-entries", {
        employee_id: chosenId,
        kind,
        minutes: Number(minutes),
        entry_on: entryOn,
        note: note.trim() || null,
      })
      setMinutes("")
      setNote("")
      await load(chosenId)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível lançar.")
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium">Banco de horas</h2>
      <p className="text-sm text-muted-foreground">
        O saldo é contínuo e não tem limite. O prazo é de 6 meses e, neste corte, só avisa quando vai expirar. Saldo positivo quitado sai como hora extra. Saldo negativo quitado desconta como falta.
      </p>
      {employees ? (
        <div className="space-y-2">
          <Label htmlFor="bank-employee">Funcionário</Label>
          <select id="bank-employee" className={fieldClass} value={selected} onChange={(event) => setSelected(event.target.value)}>
            <option value="">Selecione</option>
            {employees.map((item) => (
              <option key={item.id} value={item.id}>
                {item.full_name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {chosenId && !enabled ? <p className="text-sm text-muted-foreground">Este funcionário não usa banco de horas.</p> : null}
      {balance ? (
        <div className="rounded-md border border-border bg-card px-4 py-3 text-sm">
          <p>Saldo {showSignedMinutes(balance.balance_minutes)}</p>
          <p className="mt-1 text-muted-foreground">
            Crédito {showMinutes(balance.credit_minutes)} · Débito {showMinutes(balance.debit_minutes)} · Pago em hora extra {showMinutes(balance.paid_overtime_minutes)} · Descontado como falta {showMinutes(balance.discounted_absence_minutes)}
          </p>
          {balance.warning ? <p className="mt-2">{balance.warning}</p> : null}
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {canLaunch && chosenId && enabled ? (
        <ActionForm className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="bank-kind">Lançamento</Label>
            <select id="bank-kind" className={fieldClass} value={kind} onChange={(event) => setKind(event.target.value)}>
              {Object.entries(hourBankKindLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-minutes">Minutos</Label>
            <Input id="bank-minutes" inputMode="numeric" value={minutes} onChange={(event) => setMinutes(event.target.value)} required />
          </div>
          {kind === "settlement" && balance && balance.balance_minutes !== 0 ? (
            <Button type="button" variant="outline" onClick={() => setMinutes(String(Math.abs(balance.balance_minutes)))}>
              Quitar o saldo inteiro
            </Button>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="bank-day">Data</Label>
            <input id="bank-day" className={fieldClass} type="date" value={entryOn} onChange={(event) => setEntryOn(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-note">Observação</Label>
            <textarea id="bank-note" className={moduleTextClass} value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
          <Button type="submit">Lançar</Button>
        </ActionForm>
      ) : null}
      {chosenId ? (
        <div className="space-y-3">
          <FilterSelect
            id="bank-entry-kind"
            label="Tipo"
            value={entryKind}
            options={Object.entries(hourBankKindLabel).map(([value, label]) => ({ value, label }))}
            onChange={setEntryKind}
          />
          {entries.error ? <p className="text-sm text-destructive">{entries.error}</p> : null}
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {entries.items.map((item) => (
              <li key={item.id} className="px-4 py-3 text-sm">
                {showDate(item.entry_on)} · {hourBankKindLabel[item.kind] || item.kind} · {showMinutes(item.minutes)}
                {item.effect ? ` · ${hourBankEffectLabel[item.effect] || item.effect}` : ""}
                {item.note ? ` · ${item.note}` : ""}
              </li>
            ))}
            {entries.items.length === 0 ? <ListPlaceholder loading={entries.loading} empty="Nenhum lançamento." /> : null}
          </ul>
          <ListPager page={entries.page} pageSize={entries.pageSize} total={entries.total} onPage={entries.setPage} onPageSize={entries.setPageSize} />
        </div>
      ) : null}
    </section>
  )
}
