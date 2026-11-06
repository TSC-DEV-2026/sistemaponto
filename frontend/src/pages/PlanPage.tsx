import { CalendarDays, CreditCard, Receipt, Users, Wallet, type LucideIcon } from "lucide-react"
import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { SiteSelect } from "@/components/ui/site-select"
import { Spinner } from "@/components/ui/spinner"
import { ListPager, usePagedList } from "@/components/workforce/list-controls"
import { moduleCardClass, moduleLabelClass, modulePrimaryClass } from "@/components/workforce/module-visual"
import { DomainTabs } from "@/pages/workforce/EntityScreens"
import { me } from "@/services/auth.service"
import { createRecord, getDashboard, listRecords, updateRecord, type Charge, type Subscription } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/utils/cn"
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

const planStatusOptions = [
  { value: "", label: "Todos" },
  ...Object.entries(subscriptionStatusLabel).map(([value, label]) => ({ value, label })),
]

const chargeStatusOptions = [
  { value: "", label: "Todos" },
  ...Object.entries(chargeStatusLabel).map(([value, label]) => ({ value, label })),
]

const chargeKindOptions = [
  { value: "", label: "Todos" },
  ...Object.entries(chargeKindLabel).map(([value, label]) => ({ value, label })),
]

const capacityOptions = capacities.map((value) => ({
  value: String(value),
  label: `${value} pessoas · ${showMoney(value * 500)}`,
}))

const methodOptions = Object.entries(paymentMethodLabel).map(([value, label]) => ({ value, label }))

export function PlanPage() {
  const navigate = useNavigate()
  const role = useAuthStore((state) => state.user?.role)
  const isAdmin = role === "admin"

  useEffect(() => {
    if (!role || isAdmin) return
    navigate("/", { replace: true })
  }, [role, isAdmin, navigate])

  if (!isAdmin) return null

  return (
    <DomainTabs
      organization
      title="Plano e Assinatura"
      tabs={[
        { id: "assinaturas", label: "Assinaturas e Cobranças", icon: CreditCard, panel: <BillingPanel /> },
        { id: "contratacao", label: "Contratação", icon: Wallet, panel: <ContractPanel /> },
      ]}
    />
  )
}

function BillingPanel() {
  const tenant = useAuthStore((state) => state.activeTenant)
  const setSession = useAuthStore((state) => state.setSession)
  const [plan, setPlan] = useState<Subscription | null>(null)
  const [planLoaded, setPlanLoaded] = useState(false)
  const [chargeStatus, setChargeStatus] = useState("")
  const [chargeKind, setChargeKind] = useState("")
  const [planStatus, setPlanStatus] = useState("")
  const [activeEmployees, setActiveEmployees] = useState<number | null>(null)
  const [employeesLoaded, setEmployeesLoaded] = useState(false)
  const [opened, setOpened] = useState(false)
  const [payingId, setPayingId] = useState<number | null>(null)
  const [error, setError] = useState("")
  const billed = usePagedList<Charge>("/charges", {
    ...(chargeStatus ? { status: chargeStatus } : {}),
    ...(chargeKind ? { kind: chargeKind } : {}),
  })
  const plans = usePagedList<Subscription>("/subscriptions", planStatus ? { status: planStatus } : {})

  async function refreshPlan() {
    const subscriptions = await listRecords<Subscription>("/subscriptions", { page: 1, limit: 1 })
    setPlan(subscriptions.items[0] ?? null)
  }

  useEffect(() => {
    let active = true
    setOpened(false)
    setPlanLoaded(false)
    refreshPlan()
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Não foi possível carregar o plano.")
      })
      .finally(() => {
        if (active) setPlanLoaded(true)
      })
    return () => {
      active = false
    }
  }, [tenant?.id])

  useEffect(() => {
    let active = true
    setEmployeesLoaded(false)
    getDashboard()
      .then((board) => {
        if (active) setActiveEmployees(board.active_employees)
      })
      .catch(() => {
        if (active) setActiveEmployees(null)
      })
      .finally(() => {
        if (active) setEmployeesLoaded(true)
      })
    return () => {
      active = false
    }
  }, [tenant?.id])

  async function pay(id: number) {
    if (payingId !== null) return
    setPayingId(id)
    setError("")
    try {
      await updateRecord("/charges", id, { paid: true })
      setSession(await me())
      await refreshPlan()
      billed.reload()
      plans.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível registrar o pagamento.")
    } finally {
      setPayingId(null)
    }
  }

  const ready = planLoaded && employeesLoaded && !plans.loading && !billed.loading
  useEffect(() => {
    if (ready) setOpened(true)
  }, [ready])

  if (!tenant) return null

  if (!opened) {
    return (
      <section className={moduleCardClass}>
        <h2 className="text-lg font-semibold text-[#0A0A0A]">Plano em vigor</h2>
        <div className="flex justify-center py-10" role="status">
          <Spinner label="Carregando o plano" className="h-8 w-8 text-[#1E8A3A]" />
        </div>
      </section>
    )
  }

  const people = activeEmployees === null ? "Não informado" : String(activeEmployees)

  return (
    <div className="space-y-4">
      <section className={moduleCardClass}>
        <CardHeading icon={CreditCard} title="Plano em vigor" subtitle={summarySubtitle(tenant, plan)} />
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {summaryFacts(tenant, plan, people).map((fact) => (
            <Fact key={fact.label} icon={fact.icon} label={fact.label} value={fact.value} wide={fact.wide} />
          ))}
        </div>
      </section>

      <section className={cn(moduleCardClass, "space-y-4")}>
        <h2 className="text-lg font-semibold text-[#0A0A0A]">Assinaturas</h2>
        <div className="space-y-2">
          <Label className={moduleLabelClass} htmlFor="plan-status">Situação</Label>
          <SiteSelect id="plan-status" value={planStatus} className="h-12" options={planStatusOptions} onChange={setPlanStatus} />
        </div>
        {plans.error ? <p className="text-sm text-destructive" role="alert">{plans.error}</p> : null}
        <RecordList
          loading={plans.loading}
          emptyTitle="Nenhuma assinatura"
          icon={CreditCard}
          items={plans.items.map((item) => ({
            id: item.id,
            title: subscriptionStatusLabel[item.status] || item.status,
            detail: `${item.capacity} pessoas · ${showMoney(item.monthly_amount_cents)} · ${showDate(item.period_start)} a ${showDate(item.period_end)}`,
          }))}
        />
        {!plans.loading && plans.total > 0 ? (
          <ListPager page={plans.page} pageSize={plans.pageSize} total={plans.total} onPage={plans.setPage} onPageSize={plans.setPageSize} />
        ) : null}
      </section>

      <section className={cn(moduleCardClass, "space-y-4")}>
        <h2 className="text-lg font-semibold text-[#0A0A0A]">Cobranças</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className={moduleLabelClass} htmlFor="charge-status">Situação</Label>
            <SiteSelect id="charge-status" value={chargeStatus} className="h-12" options={chargeStatusOptions} onChange={setChargeStatus} />
          </div>
          <div className="space-y-2">
            <Label className={moduleLabelClass} htmlFor="charge-kind">Tipo</Label>
            <SiteSelect id="charge-kind" value={chargeKind} className="h-12" options={chargeKindOptions} onChange={setChargeKind} />
          </div>
        </div>
        {billed.error ? <p className="text-sm text-destructive" role="alert">{billed.error}</p> : null}
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        <RecordList
          loading={billed.loading}
          emptyTitle="Nenhuma cobrança"
          icon={Receipt}
          items={billed.items.map((item) => ({
            id: item.id,
            title: `${chargeKindLabel[item.kind] || item.kind} · ${showMoney(item.amount_cents)}`,
            detail: `${paymentMethodLabel[item.payment_method] || item.payment_method} · Vence em ${showDate(item.due_on)} · ${chargeStatusLabel[item.status] || item.status} · ${showDate(item.period_start)} a ${showDate(item.period_end)}`,
            action: item.status === "paid" ? (
              <span className="inline-flex h-11 items-center rounded-[10px] bg-[rgba(30,138,58,0.1)] px-3 text-sm font-semibold text-[#086B35]">Pago</span>
            ) : (
              <Button type="button" className={cn(modulePrimaryClass, "h-11 shrink-0")} pending={payingId === item.id} onClick={() => void pay(item.id)}>
                Registrar pagamento
              </Button>
            ),
          }))}
        />
        {!billed.loading && billed.total > 0 ? (
          <ListPager page={billed.page} pageSize={billed.pageSize} total={billed.total} onPage={billed.setPage} onPageSize={billed.setPageSize} />
        ) : null}
      </section>
    </div>
  )
}

function ContractPanel() {
  const tenant = useAuthStore((state) => state.activeTenant)
  const setSession = useAuthStore((state) => state.setSession)
  const [plan, setPlan] = useState<Subscription | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [capacity, setCapacity] = useState("10")
  const [method, setMethod] = useState("pix")
  const [error, setError] = useState("")
  const edited = useRef(false)

  async function load() {
    const subscriptions = await listRecords<Subscription>("/subscriptions", { page: 1, limit: 1 })
    const current = subscriptions.items[0] ?? null
    setPlan(current)
    if (current && !edited.current) {
      setCapacity(String(current.capacity))
      setMethod(current.payment_method)
    }
  }

  useEffect(() => {
    let active = true
    setLoaded(false)
    load()
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Não foi possível carregar o plano.")
      })
      .finally(() => {
        if (active) setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [tenant?.id])

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
    if (!plan) return
    setError("")
    const body: Record<string, unknown> = {}
    if (Number(capacity) !== plan.capacity) body.capacity = Number(capacity)
    if (method !== plan.payment_method) body.payment_method = method
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

  return (
    <section className={cn(moduleCardClass, "space-y-5")}>
      <CardHeading icon={Wallet} title={plan ? "Alterar plano" : "Contratar plano"} subtitle={plan ? "Capacidade e forma de pagamento do plano em vigor." : "Escolha a capacidade e a forma de pagamento."} />
      <ActionForm className="space-y-5" onSubmit={plan ? changePlan : contract}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className={moduleLabelClass} htmlFor="capacity">Capacidade</Label>
            <SiteSelect id="capacity" value={capacity} className="h-12" options={capacityOptions} onChange={(value) => { edited.current = true; setCapacity(value) }} />
          </div>
          <div className="space-y-2">
            <Label className={moduleLabelClass} htmlFor="method">Pagamento</Label>
            <SiteSelect id="method" value={method} className="h-12" options={methodOptions} onChange={(value) => { edited.current = true; setMethod(value) }} />
          </div>
        </div>
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        <div className="flex justify-end">
          <Button type="submit" className={modulePrimaryClass} disabled={!loaded}>
            <CreditCard className="h-4 w-4" />
            {plan ? "Alterar" : "Contratar"}
          </Button>
        </div>
      </ActionForm>
    </section>
  )
}

function CardHeading({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-[#0A0A0A]">{title}</h2>
        {subtitle ? <p className="text-sm text-[#64748B]">{subtitle}</p> : null}
      </div>
    </div>
  )
}

function Fact({ icon: Icon, label, value, wide = false }: { icon: LucideIcon; label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div className={cn("flex min-h-[66px] items-center gap-3 rounded-xl border border-[#E8EEEA] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]", wide && "sm:col-span-2")}>
      <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[#E8F7ED] text-[#1E8A3A]" aria-hidden>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-xs leading-4 text-[#64748B]">{label}</p>
        <p className="mt-0.5 text-[15px] font-semibold leading-5 text-[#111827]">{value}</p>
      </div>
    </div>
  )
}

function RecordList({
  loading,
  emptyTitle,
  icon: Icon,
  items,
}: {
  loading: boolean
  emptyTitle: string
  icon: LucideIcon
  items: { id: number; title: string; detail: string; action?: ReactNode }[]
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-10" role="status">
        <Spinner label={`Carregando ${emptyTitle.toLocaleLowerCase("pt-BR")}`} className="h-8 w-8 text-[#1E8A3A]" />
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <div className="px-2 py-10 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(30,138,58,0.08)] text-[#1E8A3A]">
          <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </span>
        <p className="mt-4 text-[15px] font-semibold text-[#0A0A0A]">{emptyTitle}</p>
        <p className="mt-1 text-sm text-[#71717A]">A consulta não encontrou registros.</p>
      </div>
    )
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex min-h-16 flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-[0_4px_12px_rgba(15,23,42,0.035)] sm:flex-row sm:items-center">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-emerald-50 text-brand-cta" aria-hidden>
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-brand-ink">{item.title}</span>
            <span className="mt-[3px] block text-sm text-brand-quiet">{item.detail}</span>
          </span>
          {item.action}
        </li>
      ))}
    </ul>
  )
}

function summarySubtitle(
  tenant: { trial_ends_at: string },
  plan: Subscription | null,
) {
  if (!plan) return trialEnded(tenant.trial_ends_at) ? "Trial encerrado" : "Trial"
  if (plan.status === "blocked") return "O uso está bloqueado por inadimplência."
  if (plan.status === "delinquent") return "Há uma cobrança em atraso."
  return subscriptionStatusLabel[plan.status] || plan.status
}

function summaryFacts(
  tenant: { trial_started_at: string; trial_ends_at: string; employee_capacity: number },
  plan: Subscription | null,
  people: ReactNode,
) {
  if (!plan) {
    return [
      { icon: CreditCard, label: "Situação", value: trialEnded(tenant.trial_ends_at) ? "Trial encerrado" : "Trial" },
      { icon: CalendarDays, label: "Início", value: formatDate(tenant.trial_started_at) },
      { icon: CalendarDays, label: "Término", value: formatDate(tenant.trial_ends_at) },
      { icon: CalendarDays, label: "Dias restantes", value: String(trialDaysLeft(tenant.trial_ends_at)) },
      { icon: Users, label: "Capacidade", value: String(tenant.employee_capacity) },
      { icon: Users, label: "Funcionários contabilizados", value: people },
    ]
  }
  return [
    { icon: CreditCard, label: "Situação", value: subscriptionStatusLabel[plan.status] || plan.status },
    { icon: Users, label: "Capacidade", value: String(plan.capacity) },
    { icon: Wallet, label: "Preço", value: `${showMoney(plan.price_cents)} por pessoa` },
    { icon: Wallet, label: "Mensalidade", value: showMoney(plan.monthly_amount_cents) },
    { icon: CreditCard, label: "Pagamento", value: paymentMethodLabel[plan.payment_method] || plan.payment_method || "Não informado" },
    { icon: Users, label: "Funcionários contabilizados", value: people },
    { icon: CalendarDays, label: "Período", value: `${showDate(plan.period_start)} a ${showDate(plan.period_end)}`, wide: true },
  ]
}
