import { FormEvent, useEffect, useState } from "react"

import { ActionForm } from "@/components/ui/action-form"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { fieldClass } from "@/components/workforce/CatalogPanel"
import { FilterSelect, ListPager, usePagedList } from "@/components/workforce/list-controls"
import { DomainTabs } from "@/pages/workforce/EntityScreens"
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

const rules =
  "A cobrança em vigor é mensal, R$ 5 por pessoa. O pagamento é Pix, boleto, cartão de débito ou cartão de crédito. O upgrade cobra o pró-rata dos dias que faltam. O downgrade só ocorre se a nova capacidade couber nos funcionários contabilizados: a capacidade muda na hora e a cobrança já aberta fica para o mês seguinte. A cobrança vence no início do período. No dia seguinte ela está em atraso e, 7 dias depois do vencimento, o uso bloqueia. No fim do trial, o sistema pede a contratação de um plano."

export function PlanPage() {
  return (
    <DomainTabs
      title="Plano e Assinatura"
      lead="O plano em vigor e as cobranças ficam na primeira opção. Contratar e alterar ficam na segunda."
      tabs={[
        { id: "assinaturas", label: "Assinaturas e Cobranças", panel: <BillingPanel /> },
        { id: "contratacao", label: "Contratação", panel: <ContractPanel /> },
      ]}
    />
  )
}

function BillingPanel() {
  const tenant = useAuthStore((state) => state.activeTenant)
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin"
  const setSession = useAuthStore((state) => state.setSession)
  const [plan, setPlan] = useState<Subscription | null>(null)
  const [chargeStatus, setChargeStatus] = useState("")
  const [chargeKind, setChargeKind] = useState("")
  const [planStatus, setPlanStatus] = useState("")
  const [activeEmployees, setActiveEmployees] = useState<number | null>(null)
  const [error, setError] = useState("")
  const billed = usePagedList<Charge>(
    "/charges",
    {
      ...(chargeStatus ? { status: chargeStatus } : {}),
      ...(chargeKind ? { kind: chargeKind } : {}),
    },
    isAdmin,
  )
  const plans = usePagedList<Subscription>("/subscriptions", planStatus ? { status: planStatus } : {}, isAdmin)

  async function load() {
    const subscriptions = await listRecords<Subscription>("/subscriptions", { page: 1, limit: 1 })
    setPlan(subscriptions.items[0] ?? null)
    billed.reload()
    plans.reload()
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
      .catch(() => {
        if (active) {
          setActiveEmployees(null)
        }
      })
    return () => {
      active = false
    }
  }, [tenant?.id])

  async function pay(id: number) {
    setError("")
    try {
      await updateRecord("/charges", id, { paid: true })
      setSession(await me())
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível registrar o pagamento.")
    }
  }

  if (!tenant) {
    return null
  }

  return (
    <div className="space-y-4">
      <PlanSummary tenant={tenant} plan={plan} activeEmployees={activeEmployees} />
      {isAdmin ? (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-medium">Assinaturas</h2>
            <FilterSelect id="plan-status" label="Situação" value={planStatus} options={Object.entries(subscriptionStatusLabel).map(([value, label]) => ({ value, label }))} onChange={setPlanStatus} />
            {plans.error ? <p className="text-sm text-destructive">{plans.error}</p> : null}
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {plans.items.map((item) => (
                <li key={item.id} className="px-4 py-3 text-sm">
                  {subscriptionStatusLabel[item.status] || item.status} · {item.capacity} pessoas · {showMoney(item.monthly_amount_cents)} · {showDate(item.period_start)} a {showDate(item.period_end)}
                </li>
              ))}
              {plans.items.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhuma assinatura.</li> : null}
            </ul>
            <ListPager page={plans.page} pageSize={plans.pageSize} total={plans.total} onPage={plans.setPage} onPageSize={plans.setPageSize} />
          </section>
          <section className="space-y-3">
            <h2 className="text-sm font-medium">Cobranças</h2>
            <div className="flex flex-wrap gap-3">
              <FilterSelect id="charge-status" label="Situação" value={chargeStatus} options={Object.entries(chargeStatusLabel).map(([value, label]) => ({ value, label }))} onChange={setChargeStatus} />
              <FilterSelect id="charge-kind" label="Tipo" value={chargeKind} options={Object.entries(chargeKindLabel).map(([value, label]) => ({ value, label }))} onChange={setChargeKind} />
            </div>
            {billed.error ? <p className="text-sm text-destructive">{billed.error}</p> : null}
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {billed.items.map((item) => (
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
              {billed.items.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhuma cobrança.</li> : null}
            </ul>
            <ListPager page={billed.page} pageSize={billed.pageSize} total={billed.total} onPage={billed.setPage} onPageSize={billed.setPageSize} />
          </section>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Contratar, alterar e pagar o plano fica com o administrador.</p>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

function ContractPanel() {
  const tenant = useAuthStore((state) => state.activeTenant)
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin"
  const setSession = useAuthStore((state) => state.setSession)
  const [plan, setPlan] = useState<Subscription | null>(null)
  const [capacity, setCapacity] = useState("10")
  const [method, setMethod] = useState("pix")
  const [error, setError] = useState("")

  async function load() {
    const subscriptions = await listRecords<Subscription>("/subscriptions", { page: 1, limit: 1 })
    const current = subscriptions.items[0] ?? null
    setPlan(current)
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

  async function contract(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      await createRecord<Subscription>("/subscriptions", { capacity: Number(capacity), payment_method: method })
      setSession(await me())
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
      setSession(await me())
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível alterar o plano.")
    }
  }

  if (!isAdmin) {
    return <p className="text-sm text-muted-foreground">Contratar, alterar e pagar o plano fica com o administrador.</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{rules}</p>
      <ActionForm className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={plan ? changePlan : contract}>
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
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit">{plan ? "Alterar" : "Contratar"}</Button>
      </ActionForm>
    </div>
  )
}

function PlanSummary({
  tenant,
  plan,
  activeEmployees,
}: {
  tenant: { trial_started_at: string; trial_ends_at: string; employee_capacity: number }
  plan: Subscription | null
  activeEmployees: number | null
}) {
  const ended = trialEnded(tenant.trial_ends_at)
  const days = trialDaysLeft(tenant.trial_ends_at)
  if (!plan) {
    return (
      <section className="space-y-2 rounded-md border border-border bg-card px-4 py-3 text-sm">
        <p>{ended ? "Trial encerrado. Contrate um plano." : "Trial"}</p>
        <p>Início: {formatDate(tenant.trial_started_at)}</p>
        <p>Término: {formatDate(tenant.trial_ends_at)}</p>
        <p>Dias restantes: {days}</p>
        <p>Capacidade: {tenant.employee_capacity}</p>
        <p>Funcionários contabilizados: {activeEmployees === null ? "indisponível" : activeEmployees}</p>
      </section>
    )
  }
  return (
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
  )
}
