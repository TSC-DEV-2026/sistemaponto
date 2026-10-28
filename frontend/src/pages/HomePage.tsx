import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { BarChart3, Calendar, ChevronRight, Clock, FileText, Users, type LucideIcon } from "lucide-react"

import { getDashboard, listRecords, type Dashboard, type Subscription } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/utils/cn"
import { showMoney, subscriptionStatusLabel } from "@/utils/labels"
import { formatDate, trialDaysLeft, trialEnded } from "@/utils/trial"

const cardShadow = "shadow-[0_4px_12px_rgba(15,23,42,0.035),0_10px_28px_rgba(15,23,42,0.045)]"

const greenLift = {
  hoverShadow: "0 12px 24px rgba(30, 138, 58, 0.12), 0 20px 40px rgba(30, 138, 58, 0.07)",
  hoverBorder: "rgba(30, 138, 58, 0.22)",
  arrowHover: "#E5F6EC",
}

type Tone = {
  card: string
  iconWrap: string
  icon: string
  action: string
  hoverShadow: string
  hoverBorder: string
  arrowHover: string
}

const tones = {
  green: {
    card: "bg-white",
    iconWrap: "bg-[#E7F6EE]",
    icon: "text-[#1E8A3A]",
    action: "bg-[#F2FBF6] text-[#1E8A3A]",
    ...greenLift,
  },
  blue: {
    card: "bg-white",
    iconWrap: "bg-[#E8F1FC]",
    icon: "text-[#3B82C4]",
    action: "bg-[#F1F6FC] text-[#3B82C4]",
    hoverShadow: "0 12px 24px rgba(37, 99, 235, 0.12), 0 20px 40px rgba(37, 99, 235, 0.07)",
    hoverBorder: "rgba(37, 99, 235, 0.22)",
    arrowHover: "#E4EEF8",
  },
  gold: {
    card: "bg-[#FFFCF6]",
    iconWrap: "bg-[#F8EFCF]",
    icon: "text-[#C4962A]",
    action: "bg-[#FBF6E6] text-[#C4962A]",
    hoverShadow: "0 12px 24px rgba(202, 138, 4, 0.12), 0 20px 40px rgba(202, 138, 4, 0.07)",
    hoverBorder: "rgba(202, 138, 4, 0.22)",
    arrowHover: "#F4EBD0",
  },
  lilac: {
    card: "bg-[#FBF9FE]",
    iconWrap: "bg-[#F0EAFB]",
    icon: "text-[#7C6BB0]",
    action: "bg-[#F4F0FA] text-[#7C6BB0]",
    hoverShadow: "0 12px 24px rgba(124, 88, 196, 0.12), 0 20px 40px rgba(124, 88, 196, 0.07)",
    hoverBorder: "rgba(124, 88, 196, 0.22)",
    arrowHover: "#EAE4F6",
  },
  plan: {
    card: "bg-[#F6FBF8]",
    iconWrap: "bg-[#E7F6EE]",
    icon: "text-[#1E8A3A]",
    action: "bg-[#F2FBF6] text-[#1E8A3A]",
    ...greenLift,
  },
} satisfies Record<string, Tone>

function LoadingLine() {
  return (
    <p className="mt-1" aria-hidden={false}>
      <span className="sr-only">Carregando</span>
      <span className="block h-4 w-48 max-w-full animate-pulse rounded bg-[#E6EAEF]" />
    </p>
  )
}

function MetricLine({ state, error, children }: { state: string; error: string; children: ReactNode }) {
  if (state === "error") {
    return <p className="mt-1 text-sm leading-relaxed text-destructive">{error}</p>
  }
  if (state !== "ready") {
    return <LoadingLine />
  }
  return <p className="mt-1 text-sm leading-relaxed text-brand-muted">{children}</p>
}

function BoardCard({
  tone,
  icon: Icon,
  title,
  href,
  children,
}: {
  tone: Tone
  icon: LucideIcon
  title: string
  href: string
  children: ReactNode
}) {
  return (
    <Link
      to={href}
      className={cn(
        "dashboard-card flex cursor-pointer items-center gap-4 rounded-[14px] border border-[#E7EBF0] px-5 py-5",
        cardShadow,
        tone.card,
      )}
      style={
        {
          "--card-hover-shadow": tone.hoverShadow,
          "--card-hover-border": tone.hoverBorder,
          "--card-arrow-hover": tone.arrowHover,
        } as CSSProperties
      }
    >
      <div className={cn("flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl", tone.iconWrap)}>
        <Icon className={cn("h-[22px] w-[22px]", tone.icon)} strokeWidth={1.75} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-brand-ink">{title}</h2>
        {children}
      </div>
      <span className={cn("card-arrow-wrap flex h-9 w-9 shrink-0 items-center justify-center rounded-full", tone.action)} aria-hidden>
        <ChevronRight className="card-arrow h-4 w-4" strokeWidth={1.75} />
      </span>
    </Link>
  )
}

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

  const people = board ? `Funcionários ativos ${board.active_employees}. ` : ""
  const planText = plan
    ? `${subscriptionStatusLabel[plan.status] || plan.status}. Capacidade ${plan.capacity}. Mensalidade ${showMoney(plan.monthly_amount_cents)}. ${showMoney(plan.price_cents)} por pessoa. ${people}Termina em ${formatDate(plan.period_end)}.`
    : tenant
      ? `${ended ? "Trial encerrado. Contrate um plano." : `Trial. ${days} dia(s) restante(s).`} Capacidade ${tenant.employee_capacity}. ${people}Termina em ${formatDate(tenant.trial_ends_at)}.`
      : ""

  return (
    <div className="-mx-4 -my-6 bg-brand-paper px-6 py-7 md:-mx-8 md:px-8 md:py-8">
      <div className="mx-auto max-w-[1240px]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <BoardCard tone={tones.green} icon={Users} title="Hoje" href="/people">
            <MetricLine state={boardState} error={boardError}>
              {board ? `${board.active_employees} funcionários ativos.` : null}
            </MetricLine>
          </BoardCard>
          <BoardCard tone={tones.blue} icon={Clock} title="Ponto" href="/schedules">
            <MetricLine state={boardState} error={boardError}>
              {board ? `${board.punches_today} marcações hoje. A apuração do período fica em Jornada e Ponto.` : null}
            </MetricLine>
          </BoardCard>
          <BoardCard
            tone={tones.gold}
            icon={FileText}
            title="Solicitações"
            href="/requests"
          >
            <MetricLine state={boardState} error={boardError}>
              {board
                ? `${pending} pendentes. ${board.pending_adjustments} ajustes, ${board.pending_allowances} abonos, ${board.pending_certificates} atestados, ${board.pending_leaves} afastamentos, ${board.pending_vacations} férias.`
                : null}
            </MetricLine>
          </BoardCard>
          <BoardCard
            tone={tones.lilac}
            icon={Calendar}
            title="Fechamento"
            href="/closings"
          >
            <MetricLine state={boardState} error={boardError}>
              {board ? `${board.open_closings} período(s) em conferência.` : null}
            </MetricLine>
          </BoardCard>
          <div className="md:col-span-2">
            <BoardCard tone={tones.plan} icon={BarChart3} title="Plano" href="/plan">
              {planText ? <p className="mt-1 text-sm leading-relaxed text-brand-muted">{planText}</p> : <LoadingLine />}
              {boardState === "error" ? <p className="mt-1 text-sm leading-relaxed text-destructive">{boardError}</p> : null}
            </BoardCard>
          </div>
        </div>
      </div>
    </div>
  )
}
