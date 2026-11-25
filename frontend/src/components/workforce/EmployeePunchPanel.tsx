import { useState, type ReactNode } from "react"

import { HourBankPanel } from "@/components/workforce/HourBankPanel"
import { JourneySchedule } from "@/components/workforce/JourneySchedule"
import { PunchLists } from "@/components/workforce/PunchDay"
import { CalculationsPanel } from "@/components/workforce/TimeResultsPanel"
import { resultNote } from "@/pages/workforce/journey"
import type { Employee, NamedRecord } from "@/services/workforce.service"
import { cn } from "@/utils/cn"
import { conceptIcon } from "@/utils/concept-icons"

const sections = [
  { value: "journey", label: "Jornada prevista", icon: conceptIcon.journey },
  { value: "marks", label: "Marcações", icon: conceptIcon.record },
  { value: "bank", label: "Banco de horas", icon: conceptIcon.hourBank },
  { value: "results", label: "Espelho de ponto", icon: conceptIcon.result },
  { value: "requests", label: "Solicitações", icon: conceptIcon.request },
] as const

type SectionId = (typeof sections)[number]["value"]

function JourneyBlock({
  schedule,
  cycleDay,
}: {
  schedule?: NamedRecord
  cycleDay?: number | null
}) {
  return (
    <section className="w-full rounded-xl border border-ui-line-soft bg-white p-5 shadow-[0_8px_24px_rgb(var(--ui-shadow)/0.04)] sm:p-6">
      <h2 className="text-lg font-semibold text-brand-ink">Jornada prevista</h2>
      <p className="mt-1 text-sm text-brand-quiet">Jornada vigente desta pessoa.</p>
      {schedule ? (
        <JourneySchedule
          name={schedule.name}
          note={schedule.note}
          kind={schedule.kind}
          days={schedule.days}
          weeklyMinutes={schedule.weekly_minutes}
          flexible={schedule.flexible}
          cycleDay={cycleDay}
        />
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-ui-line-soft px-4 py-6 text-center text-sm text-brand-quiet">Nenhuma jornada vigente.</p>
      )}
    </section>
  )
}

function PunchSideNav({
  section,
  onChange,
}: {
  section: SectionId
  onChange: (value: SectionId) => void
}) {
  return (
    <nav
      className="flex w-full shrink-0 flex-row gap-1 overflow-x-auto rounded-xl border border-ui-line-soft bg-white p-2 shadow-[0_8px_24px_rgb(var(--ui-shadow)/0.04)] md:w-[220px] md:flex-col md:overflow-visible"
      aria-label="Seções do ponto"
    >
      {sections.map((item) => {
        const Icon = item.icon
        const active = section === item.value
        return (
          <button
            key={item.value}
            type="button"
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-2.5 rounded-lg px-3.5 text-sm font-semibold transition-[background-color,color] duration-150 motion-reduce:transition-none md:w-full",
              active
                ? "bg-brand-cta/12 text-brand-cta"
                : "text-ui-slate hover:bg-ui-paper hover:text-ui-ink-strong",
            )}
            onClick={() => onChange(item.value)}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="whitespace-nowrap">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export function EmployeePunchPanel({
  employeeId,
  employee,
  schedule,
  cycleDay,
  reloadKey,
  requests,
}: {
  employeeId: number
  employee: Employee
  schedule?: NamedRecord
  cycleDay?: number | null
  reloadKey: number
  requests: ReactNode
}) {
  const [section, setSection] = useState<SectionId>("journey")

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
      <PunchSideNav section={section} onChange={setSection} />
      <div key={section} className="min-w-0 flex-1 motion-safe:animate-[ficha-fade_200ms_ease-out]">
        {section === "journey" ? <JourneyBlock schedule={schedule} cycleDay={cycleDay} /> : null}
        {section === "marks" ? <PunchLists employeeId={employeeId} employees={[employee]} reloadKey={reloadKey} appearance="module" /> : null}
        {section === "bank" ? <HourBankPanel employeeId={employeeId} canLaunch={false} usesBank={employee.hour_bank} appearance="module" /> : null}
        {section === "results" ? <CalculationsPanel employeeId={employeeId} appearance="module" note={resultNote(schedule?.kind)} /> : null}
        {section === "requests" ? requests : null}
      </div>
    </div>
  )
}
