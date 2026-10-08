import { FormEvent, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { fieldClass } from "@/components/workforce/CatalogPanel"
import { me } from "@/services/auth.service"
import { createRecord, getDashboard, listRecords, updateRecord, type Charge, type Subscription } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import {
  chargeKindLabel,
  chargeStatusLabel,
  paymentMethodLabel,
  showDate,
  showMoney,
  subscriptionStatusLabel,
} from "@/utils/labels"
import { formatDate, trialDaysLeft, trialEnded } from "@/utils/trial"

const capacities = Array.from({ length: 20 }, (_, index) => (index + 1) * 10)

export function PlanPage() {
  const tenant = useAuthStore((state) => state.activeTenant)
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin"
  const setSession = useAuthStore((state) => state.setSession)
  const [plan, setPlan] = useState<Subscription | null>(null)
  const [charges, setCharges] = useState<Charge[]>([])
  const [capacity, setCapacity] = useState("10")
  const [method, setMethod] = useState("pix")
  const [activeEmployees, setActiveEmployees] = useState<number | null>(null)
  const [error, setError] = useState("")

  async function load() {
    const [subscriptions, billed] = await Promise.all([
      listRecords<Subscription>("/subscriptions", { page: 1, limit: 10 }),
      listRecords<Charge>("/charges", { page: 1, limit: 100 }),
    ])
    const current = subscriptions.items[0] ?? null
    setPlan(current)
    setCharges(billed.items)
    if (current) {
      setCapacity(String(current.capacity))
      setMethod(current.payment_method)
    }
  }

  useEffect(() => {
    if (!isAdmin) {
      return
    }
    let active = true
    load().catch((caught: unknown) => {
      if (active) {
        setError(caught instanceof Error ? caught.message : "Não foi possível carregar o plano.")
      }
    })
    return () => {
      active = false
    }
  }, [isAdmin, tenant?.id])

  useEffect(() => {
    let active = true
    getDashboard()
      .then((board) => {
        if (active) {
          setActiveEmployees(board.active_employees)
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setActiveEmployees(null)
          setError((current) => current || (caught instanceof Error ? caught.message : "Não foi possível carregar."))
        }
      })
    return () => {
      active = false
    }
  }, [tenant?.id])

  async function refreshSession() {
    setSession(await me())
  }

  async function contract(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      await createRecord<Subscription>("/subscriptions", { capacity: Number(capacity), payment_method: method })
      await refreshSession()
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível contratar.")
    }
  }

  async function changePlan(event: FormEvent) {
    event.preventDefault()
    if (!plan) {
      return
    }
    setError("")
    const body: Record<string, unknown> = {}
    if (Number(capacity) !== plan.capacity) {
      body.capacity = Number(capacity)
    }
    if (method !== plan.payment_method) {
      body.payment_method = method
    }
    if (Object.keys(body).length === 0) {
      setError("Informe a capacidade ou a forma de pagamento")
      return
    }
    try {
      await updateRecord<Subscription>("/subscriptions", plan.id, body)
      await refreshSession()
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível alterar o plano.")
    }
  }

  async function pay(id: number) {
    setError("")
    try {
      await updateRecord("/charges", id, { paid: true })
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível registrar o pagamento.")
    }
  }

  if (!tenant) {
    return null
  }
  const ended = trialEnded(tenant.trial_ends_at)
  const days = trialDaysLeft(tenant.trial_ends_at)

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Plano e Assinatura</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A cobrança em vigor é mensal, R$ 5 por pessoa. O pagamento é Pix, boleto, cartão de débito ou cartão de crédito. O upgrade cobra o pró-rata dos dias que faltam. O downgrade só ocorre se a nova capacidade couber nos funcionários contabilizados: a capacidade muda na hora e a cobrança já aberta fica para o mês seguinte. A cobrança vence no início do período. No dia seguinte ela está em atraso e, 7 dias depois do vencimento, o uso bloqueia. No fim do trial, o sistema pede a contratação de um plano.
        </p>
      </div>
      {!plan ? (
        <section className="space-y-2 rounded-md border border-border bg-card px-4 py-3 text-sm">
          <p>{ended ? "Trial encerrado. Contrate um plano." : "Trial"}</p>
          <p>Início: {formatDate(tenant.trial_started_at)}</p>
          <p>Término: {formatDate(tenant.trial_ends_at)}</p>
          <p>Dias restantes: {days}</p>
          <p>Capacidade: {tenant.employee_capacity}</p>
          <p>Funcionários contabilizados: {activeEmployees === null ? "indisponível" : activeEmployees}</p>
        </section>
      ) : (
        <section className="space-y-2 rounded-md border border-border bg-card px-4 py-3 text-sm">
          <p>{subscriptionStatusLabel[plan.status] || plan.status}</p>
          {plan.status === "blocked" ? <p>O uso está bloqueado por inadimplência.</p> : null}
          {plan.status === "delinquent" ? <p>Há uma cobrança em atraso.</p> : null}
          <p>Capacidade: {plan.capacity}</p>
          <p>Preço: {showMoney(plan.price_cents)} por pessoa</p>
          <p>Mensalidade: {showMoney(plan.monthly_amount_cents)}</p>
          <p>Pagamento: {paymentMethodLabel[plan.payment_method] || plan.payment_method}</p>
          <p>
            Período: {showDate(plan.period_start)} a {showDate(plan.period_end)}
          </p>
          <p>Funcionários contabilizados: {activeEmployees === null ? "indisponível" : activeEmployees}</p>
        </section>
      )}
      {isAdmin ? (
        <form className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={plan ? changePlan : contract}>
          <h2 className="text-sm font-medium">{plan ? "Alterar plano" : "Contratar plano"}</h2>
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacidade</Label>
            <select id="capacity" className={fieldClass} value={capacity} onChange={(event) => setCapacity(event.target.value)}>
              {capacities.map((value) => (
                <option key={value} value={value}>
                  {value} pessoas · {showMoney(value * 500)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="method">Pagamento</Label>
            <select id="method" className={fieldClass} value={method} onChange={(event) => setMethod(event.target.value)}>
              {Object.entries(paymentMethodLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm text-muted-foreground">A capacidade é um múltiplo de 10, de 10 a 200. Não há gateway neste corte: o pagamento é o registro da cobrança gerada pelo sistema.</p>
          <Button type="submit">{plan ? "Alterar" : "Contratar"}</Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">Contratar, alterar e pagar o plano fica com o administrador.</p>
      )}
      {isAdmin ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Cobranças</h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {charges.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  {chargeKindLabel[item.kind] || item.kind} · {showMoney(item.amount_cents)} · {paymentMethodLabel[item.payment_method] || item.payment_method}
                  <span className="mt-1 block text-muted-foreground">
                    Vence em {showDate(item.due_on)} · {chargeStatusLabel[item.status] || item.status} · {showDate(item.period_start)} a {showDate(item.period_end)}
                  </span>
                </span>
                {item.status === "paid" ? (
                  <span className="text-muted-foreground">Pago</span>
                ) : (
                  <Button type="button" size="sm" onClick={() => void pay(item.id)}>
                    Registrar pagamento
                  </Button>
                )}
              </li>
            ))}
            {charges.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhuma cobrança.</li> : null}
          </ul>
        </section>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
