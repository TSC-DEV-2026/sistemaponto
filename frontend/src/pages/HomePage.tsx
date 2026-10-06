import { Link } from "react-router-dom"

import { useAuthStore } from "@/store/auth.store"
import { formatDate, trialDaysLeft, trialEnded } from "@/utils/trial"

export function HomePage() {
  const user = useAuthStore((state) => state.user)
  const tenant = useAuthStore((state) => state.activeTenant)
  const ended = tenant ? trialEnded(tenant.trial_ends_at) : false
  const days = tenant ? trialDaysLeft(tenant.trial_ends_at) : 0

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {tenant?.name}. {user?.full_name}.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <section className="rounded-md border border-border bg-card px-4 py-3">
          <h2 className="text-sm font-medium">Hoje</h2>
          <p className="mt-2 text-sm text-muted-foreground">Nenhum funcionário em jornada.</p>
        </section>
        <section className="rounded-md border border-border bg-card px-4 py-3">
          <h2 className="text-sm font-medium">Ponto</h2>
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma marcação no dia.</p>
        </section>
        <section className="rounded-md border border-border bg-card px-4 py-3">
          <h2 className="text-sm font-medium">Solicitações</h2>
          <p className="mt-2 text-sm">Nenhuma solicitação pendente.</p>
          <Link to="/requests" className="mt-3 inline-flex text-sm font-medium">
            Revisar
          </Link>
        </section>
        <section className="rounded-md border border-border bg-card px-4 py-3">
          <h2 className="text-sm font-medium">Fechamento</h2>
          <p className="mt-2 text-sm text-muted-foreground">Nenhum período em conferência.</p>
          <Link to="/closings" className="mt-3 inline-flex text-sm font-medium">
            Abrir fechamentos
          </Link>
        </section>
        <section className="rounded-md border border-border bg-card px-4 py-3 md:col-span-2">
          <h2 className="text-sm font-medium">Plano</h2>
          {tenant ? (
            <p className="mt-2 text-sm">
              {ended ? "Trial encerrado" : `Trial. ${days} dia(s) restante(s)`}. Capacidade {tenant.employee_capacity}.
              Funcionários ativos 0. Termina em {formatDate(tenant.trial_ends_at)}.
            </p>
          ) : null}
          <Link to="/plan" className="mt-3 inline-flex text-sm font-medium">
            Ver plano
          </Link>
        </section>
      </div>
    </div>
  )
}
