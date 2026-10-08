import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { getDashboard, listRecords, type Dashboard, type Subscription } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { showMoney, subscriptionStatusLabel } from "@/utils/labels"
import { formatDate, trialDaysLeft, trialEnded } from "@/utils/trial"

export function HomePage() {
  const user = useAuthStore((state) => state.user)
  const tenant = useAuthStore((state) => state.activeTenant)
  const isAdmin = user?.role === "admin"
  const ended = tenant ? trialEnded(tenant.trial_ends_at) : false
  const days = tenant ? trialDaysLeft(tenant.trial_ends_at) : 0
  const [board, setBoard] = useState<Dashboard | null>(null)
  const [boardState, setBoardState] = useState("loading")
  const [boardError, setBoardError] = useState("")
  const [plan, setPlan] = useState<Subscription | null>(null)

  useEffect(() => {
    let active = true
    setBoardState("loading")
    setBoardError("")
    getDashboard()
      .then((data) => {
        if (active) {
          setBoard(data)
          setBoardState("ready")
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setBoard(null)
          setBoardState("error")
          setBoardError(caught instanceof Error ? caught.message : "Não foi possível carregar.")
        }
      })
    return () => {
      active = false
    }
  }, [tenant?.id])

  useEffect(() => {
    if (!isAdmin) {
      setPlan(null)
      return
    }
    let active = true
    listRecords<Subscription>("/subscriptions", { page: 1, limit: 1 })
      .then((page) => {
        if (active) {
          setPlan(page.items[0] ?? null)
        }
      })
      .catch(() => {
        if (active) {
          setPlan(null)
        }
      })
    return () => {
      active = false
    }
  }, [isAdmin, tenant?.id])

  const pending = board
    ? board.pending_adjustments + board.pending_allowances + board.pending_certificates + board.pending_leaves + board.pending_vacations
    : 0

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
          <p className="mt-2 text-sm text-muted-foreground">{board ? `${board.active_employees} funcionários ativos.` : boardState === "error" ? boardError : "Carregando."}</p>
        </section>
        <section className="rounded-md border border-border bg-card px-4 py-3">
          <h2 className="text-sm font-medium">Ponto</h2>
          <p className="mt-2 text-sm text-muted-foreground">{board ? `${board.punches_today} marcações hoje.` : boardState === "error" ? boardError : "Carregando."} A apuração do período fica em Jornada e Ponto.</p>
        </section>
        <section className="rounded-md border border-border bg-card px-4 py-3">
          <h2 className="text-sm font-medium">Solicitações</h2>
          <p className="mt-2 text-sm">
            {board
              ? `${pending} pendentes. ${board.pending_adjustments} ajustes, ${board.pending_allowances} abonos, ${board.pending_certificates} atestados, ${board.pending_leaves} afastamentos, ${board.pending_vacations} férias.`
              : boardState === "error"
                ? boardError
                : "Carregando."}
          </p>
          <Link to="/requests" className="mt-3 inline-flex text-sm font-medium">
            Revisar
          </Link>
        </section>
        <section className="rounded-md border border-border bg-card px-4 py-3">
          <h2 className="text-sm font-medium">Fechamento</h2>
          <p className="mt-2 text-sm text-muted-foreground">{board ? `${board.open_closings} período(s) em conferência.` : boardState === "error" ? boardError : "Carregando."}</p>
          <Link to="/closings" className="mt-3 inline-flex text-sm font-medium">
            Abrir fechamentos
          </Link>
        </section>
        <section className="rounded-md border border-border bg-card px-4 py-3 md:col-span-2">
          <h2 className="text-sm font-medium">Plano</h2>
          {plan ? (
            <p className="mt-2 text-sm">
              {subscriptionStatusLabel[plan.status] || plan.status}. Capacidade {plan.capacity}. Mensalidade {showMoney(plan.monthly_amount_cents)}. {showMoney(plan.price_cents)} por pessoa.
            </p>
          ) : tenant ? (
            <p className="mt-2 text-sm">
              {ended ? "Trial encerrado. Contrate um plano." : `Trial. ${days} dia(s) restante(s)`}. Capacidade {tenant.employee_capacity}.
              Funcionários ativos {board?.active_employees ?? 0}. Termina em {formatDate(tenant.trial_ends_at)}.
            </p>
          ) : null}
          {boardError ? <p className="mt-2 text-sm text-destructive">{boardError}</p> : null}
          <Link to="/plan" className="mt-3 inline-flex text-sm font-medium">
            Ver plano
          </Link>
        </section>
      </div>
    </div>
  )
}
