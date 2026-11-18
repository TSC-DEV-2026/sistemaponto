import { useEffect, useState } from "react"

import { Spinner } from "@/components/ui/spinner"
import { getHourBank, listRecords, type HourBank, type Punch } from "@/services/workforce.service"
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
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    const bankLoad = showBank && hourBank ? getHourBank(employeeId) : Promise.resolve(null)
    Promise.all([bankLoad, listRecords<Punch>("/punches", { employee_id: employeeId, page: 1, limit: 8 })])
      .then(([balance, page]) => {
        if (!active) return
        setBank(balance)
        setPunches(page.items)
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Não foi possível carregar.")
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
      <div className="flex justify-center rounded-[14px] border border-[#E2E8F0] bg-white px-5 py-10">
        <Spinner label="Carregando o ponto" />
      </div>
    )
  }

  return (
    <div className={showBank ? "grid grid-cols-1 gap-4 lg:grid-cols-2" : "grid grid-cols-1 gap-4"}>
      {showBank ? (
      <section className="rounded-[14px] border border-[#E2E8F0] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <h2 className="text-base font-semibold text-[#0A0A0A]">Saldo do banco</h2>
        {hourBank && bank ? (
          <dl className="mt-4 space-y-2 text-sm text-[#1B2534]">
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
          <p className="mt-3 text-sm text-[#64748B]">Este cadastro não usa banco de horas.</p>
        )}
      </section>
      ) : null}
      <section className="rounded-[14px] border border-[#E2E8F0] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <h2 className="text-base font-semibold text-[#0A0A0A]">Histórico de marcações</h2>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        {punches.length === 0 ? <p className="mt-3 text-sm text-[#64748B]">Nenhuma marcação.</p> : null}
        {punches.length > 0 ? (
          <ul className="mt-3 divide-y divide-[#E7EBF0]">
            {punches.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-[#1B2534]">{when(item.occurred_at)}</span>
                <span className={item.valid ? "text-[#1E8A3A]" : "text-[#64748B]"}>{item.valid ? "Válida" : "Histórico"}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  )
}
