import { useEffect, useState } from "react"

import { Spinner } from "@/components/ui/spinner"
import { getHourBank, listRecords, type HourBank, type Punch } from "@/services/workforce.service"
import { toastError } from "@/store/toast.store"
import { showDuration } from "@/utils/labels"

function when(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}

export function OwnClockSummary({ employeeId, hourBank, showBank = true }: { employeeId: number; hourBank: boolean; showBank?: boolean }) {
  const [bank, setBank] = useState<HourBank | null>(null)
  const [punches, setPunches] = useState<Punch[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setFailed(false)
    const bankLoad = showBank && hourBank ? getHourBank(employeeId) : Promise.resolve(null)
    Promise.all([bankLoad, listRecords<Punch>("/punches", { employee_id: employeeId, page: 1, limit: 8 })])
      .then(([balance, page]) => {
        if (!active) return
        setBank(balance)
        setPunches(page.items)
      })
      .catch((caught: unknown) => {
        if (!active) return
        setFailed(true)
        toastError(caught instanceof Error ? caught.message : "Não foi possível carregar.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [employeeId, hourBank, showBank])

  if (loading) {
    return (
      <div className="flex justify-center rounded-[14px] border border-ui-line bg-white px-5 py-10">
        <Spinner label="Carregando o ponto" />
      </div>
    )
  }

  return (
    <div className={showBank ? "grid grid-cols-1 gap-4 lg:grid-cols-2" : "grid grid-cols-1 gap-4"}>
      {showBank ? (
      <section className="rounded-[14px] border border-ui-line bg-white p-5 shadow-[0_8px_24px_rgb(var(--ui-shadow)/0.04)]">
        <h2 className="text-base font-semibold text-ui-ink">Saldo do banco</h2>
        {hourBank && bank ? (
          <dl className="mt-4 space-y-2 text-sm text-ui-heading">
            <div className="flex items-center justify-between gap-3">
              <dt>Saldo</dt>
              <dd className="font-semibold">{showDuration(bank.balance_minutes)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Créditos</dt>
              <dd>{showDuration(bank.credit_minutes)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Débitos</dt>
              <dd>{showDuration(bank.debit_minutes)}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-ui-slate">Este cadastro não usa banco de horas.</p>
        )}
      </section>
      ) : null}
      <section className="rounded-[14px] border border-ui-line bg-white p-5 shadow-[0_8px_24px_rgb(var(--ui-shadow)/0.04)]">
        <h2 className="text-base font-semibold text-ui-ink">Histórico de marcações</h2>
        {punches.length === 0 && !failed ? <p className="mt-3 text-sm text-ui-slate">Nenhuma marcação.</p> : null}
        {punches.length > 0 ? (
          <ul className="mt-3 divide-y divide-[rgb(var(--ui-line-hair))]">
            {punches.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-ui-heading">{when(item.occurred_at)}</span>
                <span className={item.valid ? "text-brand-cta" : "text-ui-slate"}>{item.valid ? "Válida" : "Histórico"}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  )
}
