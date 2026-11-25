import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, type LucideIcon } from "lucide-react"

import { OwnClockSummary } from "@/components/workforce/OwnClockSummary"
import { getDashboard, listRecords, type Dashboard, type Employee, type Subscription } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { toastError } from "@/store/toast.store"
import { cn } from "@/utils/cn"
import { conceptIcon } from "@/utils/concept-icons"
import { showMoney, subscriptionStatusLabel } from "@/utils/labels"
import { formatDate, trialDaysLeft, trialEnded } from "@/utils/trial"

const cardShadow = "shadow-[0_4px_12px_rgb(var(--ui-shadow)/0.035),0_10px_28px_rgb(var(--ui-shadow)/0.045)]"

const greenLift = {
  hoverShadow: "0 12px 24px rgb(var(--brand-cta)/0.12), 0 20px 40px rgb(var(--brand-cta)/0.07)",
  hoverBorder: "rgb(var(--brand-cta)/0.22)",
  arrowHover: "rgb(var(--brand-wash))",
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
    iconWrap: "bg-brand-wash",
    icon: "text-brand-cta",
    action: "bg-brand-soft text-brand-cta",
    ...greenLift,
  },
  blue: {
    card: "bg-white",
    iconWrap: "bg-tone-blue-soft",
    icon: "text-tone-blue",
    action: "bg-tone-blue-wash text-tone-blue",
    hoverShadow: "0 12px 24px rgb(var(--info-ink)/0.12), 0 20px 40px rgb(var(--info-ink)/0.07)",
    hoverBorder: "rgb(var(--info-ink)/0.22)",
    arrowHover: "rgb(var(--tone-blue-arrow))",
  },
  gold: {
    card: "bg-tone-gold-card",
    iconWrap: "bg-tone-gold-soft",
    icon: "text-tone-gold",
    action: "bg-tone-gold-wash text-tone-gold",
    hoverShadow: "0 12px 24px rgb(var(--tone-gold-glow)/0.12), 0 20px 40px rgb(var(--tone-gold-glow)/0.07)",
    hoverBorder: "rgb(var(--tone-gold-glow)/0.22)",
    arrowHover: "rgb(var(--tone-gold-arrow))",
  },
  lilac: {
    card: "bg-tone-lilac-card",
    iconWrap: "bg-tone-lilac-soft",
    icon: "text-tone-lilac",
    action: "bg-tone-lilac-wash text-tone-lilac",
    hoverShadow: "0 12px 24px rgb(var(--tone-lilac-glow)/0.12), 0 20px 40px rgb(var(--tone-lilac-glow)/0.07)",
    hoverBorder: "rgb(var(--tone-lilac-glow)/0.22)",
    arrowHover: "rgb(var(--tone-lilac-arrow))",
  },
  plan: {
    card: "bg-brand-soft",
    iconWrap: "bg-brand-wash",
    icon: "text-brand-cta",
    action: "bg-brand-soft text-brand-cta",
    ...greenLift,
  },
} satisfies Record<string, Tone>

function LoadingLine() {
  return (
    <p className="mt-1" aria-hidden={false}>
      <span className="sr-only">Carregando</span>
      <span className="block h-4 w-48 max-w-full animate-pulse rounded bg-ui-pulse" />
    </p>
  )
}

function MetricLine({ state, children }: { state: string; children: ReactNode }) {
  if (state === "error") {
    return null
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
        "dashboard-card flex cursor-pointer items-center gap-4 rounded-[14px] border border-ui-line-hair px-5 py-5",
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

function OwnAccountFoot({ showBank, quietWhenUnlinked = false }: { showBank: boolean; quietWhenUnlinked?: boolean }) {
  const personId = useAuthStore((state) => state.user?.person_id)
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    const load = personId
      ? listRecords<Employee>("/employees", { page: 1, limit: 1, person_id: personId })
      : Promise.resolve(null)
    load
      .then((page) => {
        if (active) setEmployee(page?.items[0] ?? null)
      })
      .catch(() => {
        if (active) setEmployee(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [personId, tenantId])

  if (loading) return quietWhenUnlinked ? null : <p className="text-sm text-brand-quiet">Carregando as suas informações.</p>
  if (!employee) return quietWhenUnlinked ? null : <p className="text-sm text-brand-quiet">O cadastro precisa estar ligado ao acesso para mostrar o seu ponto.</p>
  return <OwnClockSummary employeeId={employee.id} hourBank={employee.hour_bank} showBank={showBank} />
}

function MemberHome() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BoardCard tone={tones.gold} icon={conceptIcon.request} title="Solicitações" href="/requests">
          <p className="mt-1 text-sm text-brand-quiet">As suas solicitações.</p>
        </BoardCard>
      </div>
      <OwnAccountFoot showBank />
    </div>
  )
}

export function HomePage() {
  const user = useAuthStore((state) => state.user)
  const tenant = useAuthStore((state) => state.activeTenant)
  const isAdmin = user?.role === "admin"
  const member = user?.role === "member"
  const ended = tenant ? trialEnded(tenant.trial_ends_at) : false
  const days = tenant ? trialDaysLeft(tenant.trial_ends_at) : 0
  const [board, setBoard] = useState<Dashboard | null>(null)
  const [boardState, setBoardState] = useState("loading")
  const [plan, setPlan] = useState<Subscription | null>(null)

  useEffect(() => {
    if (member) return
    let active = true
    setBoardState("loading")
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
          toastError(caught instanceof Error ? caught.message : "Não foi possível carregar.")
        }
      })
    return () => {
      active = false
    }
  }, [member, tenant?.id])

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

  if (member) {
    return (
      <div className="-mx-4 -my-6 bg-brand-paper px-6 py-7 md:-mx-8 md:px-8 md:py-8">
        <div className="mx-auto max-w-[1240px]">
          <MemberHome />
        </div>
      </div>
    )
  }

  return (
    <div className="-mx-4 -my-6 bg-brand-paper px-6 py-7 md:-mx-8 md:px-8 md:py-8">
      <div className="mx-auto max-w-[1240px]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <BoardCard tone={tones.green} icon={conceptIcon.employee} title="Hoje" href="/staff?tab=employees">
            <MetricLine state={boardState}>
              {board ? `${board.active_employees} funcionários ativos.` : null}
            </MetricLine>
          </BoardCard>
          <BoardCard tone={tones.blue} icon={conceptIcon.point} title="Ponto" href="/timekeeping?tab=calculations">
            <MetricLine state={boardState}>
              {board ? `${board.punches_today} marcações hoje. A apuração do período fica em Ponto.` : null}
            </MetricLine>
          </BoardCard>
          <BoardCard
            tone={tones.gold}
            icon={conceptIcon.request}
            title="Solicitações"
            href="/requests"
          >
            <MetricLine state={boardState}>
              {board
                ? `${pending} pendentes. ${board.pending_adjustments} ajustes, ${board.pending_allowances} abonos, ${board.pending_certificates} atestados, ${board.pending_leaves} afastamentos, ${board.pending_vacations} férias.`
                : null}
            </MetricLine>
          </BoardCard>
          <BoardCard
            tone={tones.lilac}
            icon={conceptIcon.closing}
            title="Fechamento"
            href="/timekeeping?tab=closings"
          >
            <MetricLine state={boardState}>
              {board ? `${board.open_closings} período(s) em conferência.` : null}
            </MetricLine>
          </BoardCard>
          {isAdmin ? (
            <div className="md:col-span-2">
              <BoardCard tone={tones.plan} icon={conceptIcon.plan} title="Plano" href="/plan?tab=subscriptions">
                {planText ? <p className="mt-1 text-sm leading-relaxed text-brand-muted">{planText}</p> : <LoadingLine />}
              </BoardCard>
            </div>
          ) : null}
        </div>
        <div className="mt-4">
          <OwnAccountFoot showBank quietWhenUnlinked={isAdmin} />
        </div>
      </div>
    </div>
  )
}
