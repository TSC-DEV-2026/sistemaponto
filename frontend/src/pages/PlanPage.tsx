import { useAuthStore } from "@/store/auth.store"
import { formatDate, trialDaysLeft, trialEnded } from "@/utils/trial"

export function PlanPage() {
  const tenant = useAuthStore((state) => state.activeTenant)
  if (!tenant) {
    return null
  }
  const ended = trialEnded(tenant.trial_ends_at)
  const days = trialDaysLeft(tenant.trial_ends_at)
  const activeEmployees = 0
  const available = Math.max(0, tenant.employee_capacity - activeEmployees)

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Plano e Assinatura</h1>
        <p className="mt-2 text-sm text-muted-foreground">{tenant.name}</p>
      </div>
      <section className="space-y-2 rounded-md border border-border bg-card px-4 py-3 text-sm">
        <p>{ended ? "Trial encerrado" : "Trial"}</p>
        <p>Início: {formatDate(tenant.trial_started_at)}</p>
        <p>Término: {formatDate(tenant.trial_ends_at)}</p>
        <p>Dias restantes: {days}</p>
        <p>Capacidade: {tenant.employee_capacity}</p>
        <p>Funcionários ativos: {activeEmployees}</p>
        <p>Disponível: {available}</p>
        <p>Funcionalidades do trial: todas liberadas.</p>
      </section>
    </div>
  )
}
