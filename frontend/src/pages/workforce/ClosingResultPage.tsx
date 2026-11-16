import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { useParams } from "react-router-dom"
import { ArrowLeft, CircleCheck, Minus, Plus, Printer, type LucideIcon } from "lucide-react"

import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { DurationField } from "@/components/ui/duration-field"
import { Label } from "@/components/ui/label"
import { SiteSelect } from "@/components/ui/site-select"
import { Spinner } from "@/components/ui/spinner"
import { moduleCardClass, moduleFieldClass, moduleLabelClass, modulePrimaryClass, moduleQuietClass } from "@/components/workforce/module-visual"
import { getRecord, launchClosingBank, type Closing, type ClosingBank, type ClosingPerson } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { toastError } from "@/store/toast.store"
import { cn } from "@/utils/cn"
import { conceptIcon } from "@/utils/concept-icons"
import { formatCpf } from "@/utils/digits"
import { closingStatusLabel, durationMinutes, hourBankKindLabel, hourBankLaunchLabel, showDate, showMinutes, showSignedMinutes } from "@/utils/labels"
import { apiErrorMessage } from "@/utils/api-error"
import { closingSheetsPdf, type ClosingSheet } from "@/utils/report-pdf"

const columns: { key: keyof ClosingPerson; label: string; signed?: boolean; days?: boolean }[] = [
  { key: "expected_minutes", label: "Previstas" },
  { key: "worked_minutes", label: "Trabalhadas" },
  { key: "overtime_minutes", label: "Extras" },
  { key: "night_additional_minutes", label: "Noturno" },
  { key: "shortage_minutes", label: "Faltantes" },
  { key: "delay_minutes", label: "Atrasos" },
  { key: "early_leave_minutes", label: "Saídas antecipadas" },
  { key: "absence_days", label: "Faltas", days: true },
  { key: "bank_minutes", label: "Banco no período", signed: true },
  { key: "balance_minutes", label: "Saldo do banco", signed: true },
]

function registration(value: string | null) {
  return value?.trim() ? value : "Não informado"
}

function EmptyMark() {
  return <span className="font-medium text-[#94A3B8]">Não informado</span>
}

function closingStatusClass(status: string) {
  if (status === "closed") return "bg-[rgba(30,138,58,0.14)] text-[#146C2E]"
  if (status === "open") return "bg-[#FFF1E0] text-[#C2410C]"
  return "bg-[#F1F5F9] text-[#475569]"
}

function DetailTile({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[66px] min-w-0 items-center gap-3 rounded-xl border border-[#E8EEEA] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#EAF7EF] text-[#1E8A3A]">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs leading-4 text-[#64748B]">{label}</p>
        <div className="mt-0.5 min-w-0 text-[15px] font-semibold leading-5 text-[#111827] [overflow-wrap:anywhere]">{children}</div>
      </div>
    </div>
  )
}

function cell(person: ClosingPerson, column: (typeof columns)[number]) {
  if ((column.key === "bank_minutes" || column.key === "balance_minutes") && !person.hour_bank) {
    return <EmptyMark />
  }
  const value = person[column.key]
  if (column.days) return typeof value === "number" ? String(value) : <EmptyMark />
  if (typeof value !== "number") return <EmptyMark />
  return column.signed ? showSignedMinutes(value) : showMinutes(value)
}

function peopleCount(total: number) {
  return total === 1 ? "1 pessoa neste período." : `${total} pessoas neste período.`
}

type BankDraft = {
  employeeId: number
  name: string
  kind: "credit" | "debit"
  minutes: number
}

function BankLaunchDialog({
  draft,
  pending,
  onClose,
  onConfirm,
}: {
  draft: BankDraft
  pending: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef(onClose)
  const pendingRef = useRef(pending)
  closeRef.current = onClose
  pendingRef.current = pending

  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        if (!pendingRef.current) closeRef.current()
        return
      }
      if (event.key !== "Tab" || !panelRef.current) return
      const nodes = panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled])")
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(15,23,42,0.45)] p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="bank-rule-title"
        aria-describedby="bank-rule-text"
        className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.18)] sm:p-7"
      >
        <h2 id="bank-rule-title" className="text-xl font-semibold tracking-tight text-[#0A0A0A]">
          Tem certeza que deseja confirmar?
        </h2>
        <p id="bank-rule-text" className="mt-2 text-sm leading-6 text-[#71717A]">
          Este lançamento será gravado no banco deste fechamento.
        </p>
        <p className="mt-4 rounded-xl bg-[#E7E8EA] px-4 py-3 text-sm font-semibold text-[#0A0A0A]">
          {draft.name} · {hourBankLaunchLabel[draft.kind]} · {showMinutes(draft.minutes)}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} onClick={onClose} disabled={pending}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar
          </Button>
          <Button ref={confirmRef} type="button" className={modulePrimaryClass} pending={pending} onClick={() => onConfirm()}>
            <CircleCheck className="h-4 w-4" aria-hidden />
            Confirmar
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function clockCell(value: number) {
  if (value === 0) return ""
  return showMinutes(value)
}

function clockTotal(value: number) {
  return showMinutes(value)
}

function dayLabel(value: string) {
  const [, month, day] = value.slice(0, 10).split("-")
  return day && month ? `${day}/${month}` : value
}

function sheetsOf(closing: Closing): ClosingSheet[] {
  const period = `${showDate(closing.starts_on)} a ${showDate(closing.ends_on)}`
  return (closing.people || []).map((person) => {
    const bank = (closing.banks || []).find((item) => item.employee_id === person.employee_id)
    const notes = [
      `Previstas ${showMinutes(person.expected_minutes)}. Trabalhadas ${showMinutes(person.worked_minutes)}. Extras ${showMinutes(person.overtime_minutes)}.`,
      `Faltantes ${showMinutes(person.shortage_minutes)}. Faltas ${person.absence_days}. Atrasos ${showMinutes(person.delay_minutes)}. Saídas antecipadas ${showMinutes(person.early_leave_minutes)}.`,
      `Adicional noturno ${showMinutes(person.night_additional_minutes)}.`,
    ]
    if (person.hour_bank) {
      notes.push(`Banco no período ${showSignedMinutes(person.bank_minutes)}. Saldo do banco ${showSignedMinutes(person.balance_minutes ?? 0)}.`)
      for (const entry of bank?.entries || []) {
        notes.push(`${hourBankKindLabel[entry.kind] || entry.kind} de ${showMinutes(entry.minutes)} neste fechamento.`)
      }
    }
    return {
      company: person.unit_name?.trim() || "Não informada",
      name: person.full_name,
      cpf: formatCpf(person.cpf || "") || "Não informado",
      registration: registration(person.registration_number),
      period,
      hourBank: person.hour_bank,
      days: (person.days || []).map((day) => ({
        date: dayLabel(day.work_date),
        punches: day.punches,
        off: day.expected_minutes === 0 && !day.absence && day.punches.length === 0,
        worked: clockCell(day.worked_minutes),
        overtime: clockCell(day.overtime_minutes),
        shortage: day.absence ? "Falta" : clockCell(day.shortage_minutes),
        bank: person.hour_bank ? clockCell(day.bank_minutes) : "",
      })),
      totals: {
        worked: clockTotal(person.worked_minutes),
        overtime: clockTotal(person.overtime_minutes),
        shortage: clockTotal(person.shortage_minutes),
        bank: person.hour_bank ? clockTotal(person.bank_minutes) : "",
      },
      notes,
    }
  })
}

function BankLaunch({
  banks,
  personId,
  minutes,
  pending,
  onPerson,
  onMinutes,
  onLaunch,
  onAsk,
}: {
  banks: ClosingBank[]
  personId: string
  minutes: string
  pending: boolean
  onPerson: (value: string) => void
  onMinutes: (value: string) => void
  onLaunch: (employeeId: number) => void
  onAsk: (employeeId: number, kind: "credit" | "debit") => void
}) {
  const active = banks.find((item) => String(item.employee_id) === personId) || banks[0]
  return (
    <>
      <section className={moduleCardClass}>
        <h2 className="text-lg font-semibold text-brand-ink">Banco de horas</h2>
        <div className="mt-5 space-y-4">
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="closing-bank-person">Pessoa</Label>
            <SiteSelect
              id="closing-bank-person"
              value={String(active.employee_id)}
              options={banks.map((item) => ({ value: String(item.employee_id), label: item.full_name }))}
              onChange={onPerson}
              searchable
              searchPlaceholder="Pesquisar pessoa"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailTile icon={conceptIcon.quadro} label="Matrícula">
              {active.registration_number?.trim() ? active.registration_number : <EmptyMark />}
            </DetailTile>
            <DetailTile icon={conceptIcon.hourBank} label="Saldo">
              {showSignedMinutes(active.balance_minutes)}
            </DetailTile>
          </div>
        </div>
      </section>
      <section className={moduleCardClass}>
        <h2 className="text-lg font-semibold text-brand-ink">Lançamento</h2>
        <div className="mt-5 space-y-4">
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="closing-bank-hours">Horas</Label>
            <DurationField id="closing-bank-hours" className={moduleFieldClass} value={minutes} onValueChange={onMinutes} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} disabled={pending} onClick={() => onAsk(active.employee_id, "credit")}>
              <Plus className="h-4 w-4" aria-hidden />
              Somar
            </Button>
            <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} disabled={pending} onClick={() => onAsk(active.employee_id, "debit")}>
              <Minus className="h-4 w-4" aria-hidden />
              Diminuir
            </Button>
            <Button type="button" className={modulePrimaryClass} disabled={pending} onClick={() => onLaunch(active.employee_id)}>
              <CircleCheck className="h-4 w-4" aria-hidden />
              Quitar o saldo
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}

export function ClosingResultPage() {
  const { id } = useParams()
  const role = useAuthStore((state) => state.user?.role)
  const canManage = role === "admin" || role === "manager"
  const closingId = Number(id)
  const [closing, setClosing] = useState<Closing | null>(null)
  const [bankId, setBankId] = useState("")
  const [minutes, setMinutes] = useState("")
  const [draft, setDraft] = useState<BankDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!canManage || !Number.isInteger(closingId)) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    getRecord<Closing>("/closings", closingId)
      .then((row) => {
        if (active) setClosing(row)
      })
      .catch((caught: unknown) => {
        if (active) toastError(apiErrorMessage(caught))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [canManage, closingId])

  function askLaunch(employeeId: number, kind: "credit" | "debit") {
    const amount = durationMinutes(minutes)
    if (amount === null) {
      toastError("Informe as horas no formato 00:00.")
      return
    }
    const person = (closing?.banks || []).find((item) => item.employee_id === employeeId)
    setDraft({
      employeeId,
      name: person?.full_name?.trim() || "Não informado",
      kind,
      minutes: amount,
    })
  }

  async function confirmDraft() {
    if (!draft) return
    setPending(true)
    try {
      const next = await launchClosingBank(closingId, {
        employee_id: draft.employeeId,
        kind: draft.kind,
        minutes: draft.minutes,
      })
      setClosing(next)
      setMinutes("")
      setDraft(null)
    } catch {
      return
    } finally {
      setPending(false)
    }
  }

  async function launch(employeeId: number) {
    setPending(true)
    try {
      const next = await launchClosingBank(closingId, { employee_id: employeeId, kind: "settlement" })
      setClosing(next)
      setMinutes("")
    } catch {
      return
    } finally {
      setPending(false)
    }
  }

  function printResult() {
    if (!closing) return
    const bytes = closingSheetsPdf(sheetsOf(closing))
    const blob = new Blob([bytes], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `fechamento-${closing.starts_on}-${closing.ends_on}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!canManage) {
    return (
      <div className="w-full min-w-0 space-y-5">
        <BackLink to="/timekeeping?tab=closings" appearance="detail" />
        <p className="text-sm text-[#52525B]">Só o gestor ou o administrador consulta o fechamento.</p>
      </div>
    )
  }

  const period = closing ? `${showDate(closing.starts_on)} a ${showDate(closing.ends_on)}` : ""
  const closed = closing?.status === "closed"

  return (
    <div className="w-full min-w-0 space-y-5">
      <BackLink to="/timekeeping?tab=closings" appearance="detail" />
      {loading ? (
        <section className={cn(moduleCardClass, "flex justify-center py-12")}>
          <Spinner />
        </section>
      ) : closing ? (
        <>
          <section className={moduleCardClass}>
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#EAF7EF] text-[#1E8A3A]" aria-hidden>
                <conceptIcon.closing className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
              <h2 className="min-w-0 flex-1 text-2xl font-bold tracking-tight text-[#111827]">{period}</h2>
              <span className={cn("inline-flex h-7 items-center rounded-full px-3 text-[13px] font-semibold leading-none", closingStatusClass(closing.status))}>
                {closingStatusLabel[closing.status] || "Não informado"}
              </span>
            </div>
          </section>
          {closed && (closing.banks || []).length === 0 ? (
            <section className={moduleCardClass}>
              <h2 className="text-lg font-semibold text-brand-ink">Banco de horas</h2>
              <p className="mt-4 text-sm font-medium text-[#94A3B8]">Ninguém deste fechamento usa banco de horas.</p>
            </section>
          ) : null}
          {closed && (closing.banks || []).length > 0 ? (
            <>
              <BankLaunch
                banks={closing.banks || []}
                personId={bankId}
                minutes={minutes}
                pending={pending}
                onPerson={setBankId}
                onMinutes={setMinutes}
                onLaunch={launch}
                onAsk={askLaunch}
              />
              {draft ? (
                <BankLaunchDialog
                  draft={draft}
                  pending={pending}
                  onClose={() => {
                    if (pending) return
                    setDraft(null)
                  }}
                  onConfirm={confirmDraft}
                />
              ) : null}
            </>
          ) : null}
          {closed ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-brand-ink">Resultado</h2>
                  <p className="mt-1 text-sm text-[#64748B]">{peopleCount((closing.people || []).length)}</p>
                </div>
                <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} onClick={printResult}>
                  <Printer className="h-4 w-4" aria-hidden />
                  Imprimir folhas
                </Button>
              </div>
              <div className="overflow-hidden rounded-[14px] border border-[#E2E8F0] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                {(closing.people || []).length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <span className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B]">
                      <conceptIcon.result className="h-8 w-8" strokeWidth={1.75} aria-hidden />
                    </span>
                    <p className="mt-4 text-[17px] font-semibold text-[#0A0A0A]">Nenhuma pessoa neste período</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#F1F5F9] text-sm font-semibold text-[#64748B]">
                          <th className="px-4 py-3 font-semibold">Nome</th>
                          <th className="px-4 py-3 font-semibold">Matrícula</th>
                          {columns.map((column) => (
                            <th key={column.key} className="whitespace-nowrap px-4 py-3 font-semibold">{column.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(closing.people || []).map((person) => (
                          <tr key={person.employee_id} className="border-b border-[#F1F5F9] text-[#0A0A0A] transition-colors duration-200 last:border-b-0 hover:bg-[#F7FBF8] motion-reduce:transition-none">
                            <td className="px-4 py-3 align-middle">
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#EAF7EF] text-[#1E8A3A]" aria-hidden>
                                  <conceptIcon.employee className="h-[18px] w-[18px]" strokeWidth={1.75} />
                                </span>
                                <span className="block truncate font-semibold leading-5">{person.full_name?.trim() ? person.full_name : <EmptyMark />}</span>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 align-middle">{person.registration_number?.trim() ? person.registration_number : <EmptyMark />}</td>
                            {columns.map((column) => (
                              <td key={column.key} className="whitespace-nowrap px-4 py-3 align-middle tabular-nums">{cell(person, column)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
