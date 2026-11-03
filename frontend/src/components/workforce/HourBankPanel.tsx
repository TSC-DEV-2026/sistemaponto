import { Clock, Layers } from "lucide-react"
import { FormEvent, useEffect, useState } from "react"

import { ActionForm } from "@/components/ui/action-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ListPlaceholder } from "@/components/ui/list-placeholder"
import { SiteSelect } from "@/components/ui/site-select"
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
import { cn } from "@/utils/cn"
import { hourBankEffectLabel, hourBankKindLabel, punchDay, showDate, showMinutes, showSignedMinutes } from "@/utils/labels"

export function BankBalance({ balance }: { balance: HourBank }) {
  const stats = [
    { label: "Crédito", value: showMinutes(balance.credit_minutes), dot: "bg-[#1E8A3A]" },
    { label: "Débito", value: showMinutes(balance.debit_minutes), dot: "bg-[#EF5350]" },
    { label: "Pago em hora extra", value: showMinutes(balance.paid_overtime_minutes), dot: "bg-[#3B82F6]" },
    { label: "Descontado como falta", value: showMinutes(balance.discounted_absence_minutes), dot: "bg-[#F9A825]" },
  ]
  return (
    <div className="rounded-[14px] border border-[rgba(30,138,58,0.12)] bg-[linear-gradient(105deg,rgba(30,138,58,0.045),rgba(255,255,255,0.98))] p-5 shadow-[0_6px_18px_rgba(15,23,42,0.04)] sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-4 lg:w-[240px] lg:shrink-0 lg:border-r lg:border-[#E4E8ED] lg:pr-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]">
            <Clock className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] text-[#52525B]">Saldo atual</p>
            <p className="mt-0.5 text-[26px] font-bold leading-none tabular-nums text-[#0A0A0A]">{showSignedMinutes(balance.balance_minutes)}</p>
          </div>
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-5 border-t border-[#E7EBE4] pt-5 sm:grid-cols-4 lg:border-t-0 lg:pt-0">
          {stats.map((item) => (
            <div key={item.label} className="min-w-0">
              <p className="flex items-start gap-1.5 text-[13px] leading-5 text-[#52525B]">
                <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", item.dot)} aria-hidden />
                <span>{item.label}</span>
              </p>
              <p className="mt-1 text-[15px] font-semibold tabular-nums text-[#0A0A0A]">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
      {balance.warning ? <p className="mt-4 text-sm text-brand-ink">{balance.warning}</p> : null}
    </div>
  )
}

export function HourBankPanel({
  employeeId,
  employees,
  canLaunch,
  usesBank = false,
  appearance,
}: {
  employeeId?: number
  employees?: Employee[]
  canLaunch: boolean
  usesBank?: boolean
  appearance?: "module"
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

  if (appearance === "module") {
    return (
      <section className="rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-brand-ink">Banco de horas</h2>
          <p className="mt-1 text-sm text-brand-quiet">Consulte os lançamentos do banco.</p>
        </div>
        <div className="mt-[18px] max-w-md space-y-2">
          <Label className="font-semibold text-brand-ink" htmlFor="bank-entry-kind">
            Tipo
          </Label>
          <SiteSelect
            id="bank-entry-kind"
            value={entryKind}
            icon={Layers}
            options={[{ value: "", label: "Todos" }, ...Object.entries(hourBankKindLabel).map(([value, label]) => ({ value, label }))]}
            onChange={setEntryKind}
          />
        </div>
        {chosenId && !enabled ? <p className="mt-4 text-sm text-brand-quiet">Este funcionário não usa banco de horas.</p> : null}
        {balance ? (
          <div className="mt-5">
            <BankBalance balance={balance} />
          </div>
        ) : null}
        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        {entries.error ? <p className="mt-4 text-sm text-destructive">{entries.error}</p> : null}
        {chosenId && entries.items.length === 0 && !entries.error ? (
          entries.loading ? (
            <ul className="mt-8">
              <ListPlaceholder loading empty="Nenhum lançamento." />
            </ul>
          ) : (
            <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-white px-6 py-10 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(30,138,58,0.08)] text-[#1E8A3A]">
                <Clock className="h-6 w-6" strokeWidth={1.75} aria-hidden />
              </span>
              <p className="mt-4 text-[15px] font-semibold text-[#0A0A0A]">Nenhum lançamento.</p>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#52525B]">Não há registros no banco de horas deste funcionário.</p>
            </div>
          )
        ) : null}
        {entries.items.length > 0 ? (
          <ul className="mt-5 divide-y divide-[#F0F0F2] overflow-hidden rounded-xl border border-[#E2E8F0]">
            {entries.items.map((item) => (
              <li key={item.id} className="px-4 py-3 text-sm text-brand-ink">
                {showDate(item.entry_on)} · {hourBankKindLabel[item.kind] || item.kind} · {showMinutes(item.minutes)}
                {item.effect ? ` · ${hourBankEffectLabel[item.effect] || item.effect}` : ""}
                {item.note ? ` · ${item.note}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
        {entries.total > 0 ? (
          <div className="mt-4 border-t border-[#F0F0F2] pt-4">
            <ListPager page={entries.page} pageSize={entries.pageSize} total={entries.total} onPage={entries.setPage} onPageSize={entries.setPageSize} tone="module" />
          </div>
        ) : null}
      </section>
    )
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
