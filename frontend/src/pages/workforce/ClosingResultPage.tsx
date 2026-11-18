import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { useParams } from "react-router-dom"
import { ArrowLeft, CircleCheck, Minus, Pencil, Plus, Printer, Scale, Trash2, X, type LucideIcon } from "lucide-react"

import { ActionTip } from "@/components/ui/action-tip"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { DurationField } from "@/components/ui/duration-field"
import { Label } from "@/components/ui/label"
import { SiteSelect } from "@/components/ui/site-select"
import { Spinner } from "@/components/ui/spinner"
import { ListPager } from "@/components/workforce/list-controls"
import { moduleCardClass, moduleDangerClass, moduleDangerIconClass, moduleFieldClass, moduleIconClass, moduleLabelClass, modulePrimaryClass, moduleQuietClass, moduleTextClass } from "@/components/workforce/module-visual"
import { clearClosingBank, getRecord, launchClosingBank, settleClosingBanks, type Closing, type ClosingBank, type ClosingBankEntry, type ClosingPerson } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { toastError } from "@/store/toast.store"
import { cn } from "@/utils/cn"
import { conceptIcon } from "@/utils/concept-icons"
import { formatCpf } from "@/utils/digits"
import { closingStatusLabel, durationMinutes, hourBankKindLabel, showBalanceTarget, showDate, showMinutes, showSignedMinutes, signedDurationMinutes } from "@/utils/labels"
import { apiErrorMessage } from "@/utils/api-error"
import { closingSheetsPdf, type ClosingSheet } from "@/utils/report-pdf"

const columns: { key: keyof ClosingPerson; label: string; signed?: boolean; days?: boolean }[] = [
  { key: "contracted_minutes", label: "H. contratadas" },
  { key: "worked_minutes", label: "H. trabalhadas" },
  { key: "overtime_minutes", label: "H. extras" },
  { key: "shortage_minutes", label: "H. faltantes" },
  { key: "delay_minutes", label: "H. em atraso" },
  { key: "absence_days", label: "Faltas", days: true },
  { key: "night_minutes", label: "H. noturnas" },
  { key: "night_additional_minutes", label: "Adicional (H. noturnas)" },
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

const launchKind: Record<string, LucideIcon> = {
  credit: Plus,
  debit: Minus,
  balance: Scale,
  settlement: CircleCheck,
}

function currentEntry(entries: ClosingBankEntry[]) {
  return entries.slice().sort((left, right) => right.id - left.id)[0]
}

function launchAmount(entry: ClosingBankEntry) {
  if (entry.kind === "settlement") return "00:00"
  if (entry.kind === "balance") return showBalanceTarget(entry.effect === "debit" ? -entry.minutes : entry.minutes)
  return showMinutes(entry.minutes)
}

function balanceTone(value: number | null | undefined) {
  if (typeof value !== "number" || value === 0) return "text-[#64748B]"
  return value < 0 ? "text-[#C62828]" : "text-[#146C2E]"
}

function launchInput(entry: ClosingBankEntry) {
  if (entry.kind === "settlement" || entry.minutes === 0) return "00:00"
  if (entry.kind === "balance" && entry.effect === "debit") return showMinutes(-entry.minutes)
  return showMinutes(entry.minutes)
}

type BankDraft = {
  employeeId: number
  name: string
  kind: "credit" | "debit" | "balance" | "settlement"
  minutes: number
  note: string
  everyone?: boolean
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
  onConfirm: (note: string) => Promise<void>
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const closeRef = useRef(onClose)
  const pendingRef = useRef(pending)
  const [note, setNote] = useState(draft.note)
  closeRef.current = onClose
  pendingRef.current = pending

  useEffect(() => {
    noteRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        if (!pendingRef.current) closeRef.current()
        return
      }
      if (event.key !== "Tab" || !panelRef.current) return
      const nodes = panelRef.current.querySelectorAll<HTMLElement>("textarea:not([disabled]), button:not([disabled])")
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
          {draft.everyone ? "O saldo de cada pessoa que usa banco de horas neste fechamento será quitado. O lançamento já feito neste fechamento é substituído." : draft.kind === "balance" ? "O saldo deste fechamento ficará neste valor." : draft.kind === "settlement" ? "O saldo deste fechamento será quitado." : "Este lançamento será gravado no banco deste fechamento."}
        </p>
        <p className="mt-4 rounded-xl bg-[#E7E8EA] px-4 py-3 text-sm font-semibold text-[#0A0A0A]">
          {draft.everyone ? "Todos que usam banco de horas · Quitação" : `${draft.name} · ${hourBankKindLabel[draft.kind]} · ${draft.kind === "balance" ? showBalanceTarget(draft.minutes) : draft.kind === "settlement" ? "00:00" : showMinutes(draft.minutes)}`}
        </p>
        <div className="mt-4 space-y-2">
          <Label className={moduleLabelClass} htmlFor="closing-bank-reason">Observação</Label>
          <textarea ref={noteRef} id="closing-bank-reason" className={cn(moduleTextClass, "min-h-[92px]")} maxLength={2000} value={note} disabled={pending} onChange={(event) => setNote(event.target.value)} />
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} onClick={onClose} disabled={pending}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar
          </Button>
          <Button type="button" className={modulePrimaryClass} pending={pending} onClick={() => {
            const text = note.trim()
            if (!text) {
              toastError("Informe a observação do lançamento.")
              return
            }
            void onConfirm(text)
          }}>
            <CircleCheck className="h-4 w-4" aria-hidden />
            Confirmar
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function BankRemoveDialog({
  summary,
  pending,
  onClose,
  onConfirm,
}: {
  summary: string
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
        aria-labelledby="bank-remove-title"
        aria-describedby="bank-remove-text"
        className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.18)] sm:p-7"
      >
        <h2 id="bank-remove-title" className="text-xl font-semibold tracking-tight text-[#0A0A0A]">
          Tem certeza que deseja excluir?
        </h2>
        <p id="bank-remove-text" className="mt-2 text-sm leading-6 text-[#71717A]">
          Este lançamento sai do fechamento e o saldo volta ao valor anterior.
        </p>
        <p className="mt-4 rounded-xl bg-[#E7E8EA] px-4 py-3 text-sm font-semibold text-[#0A0A0A]">{summary}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} onClick={onClose} disabled={pending}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar
          </Button>
          <Button ref={confirmRef} type="button" className={cn(moduleDangerClass, "h-11 px-4")} pending={pending} onClick={() => onConfirm()}>
            <Trash2 className="h-4 w-4" aria-hidden />
            Excluir
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
      `H. contratadas ${showMinutes(person.contracted_minutes)}. H. trabalhadas ${showMinutes(person.worked_minutes)}. H. extras ${showMinutes(person.overtime_minutes)}.`,
      `H. faltantes ${showMinutes(person.shortage_minutes)}. Faltas ${person.absence_days}. H. em atraso ${showMinutes(person.delay_minutes)}.`,
      `H. noturnas ${showMinutes(person.night_minutes)}. Adicional (H. noturnas) ${showMinutes(person.night_additional_minutes)}.`,
    ]
    if (person.hour_bank) {
      notes.push(`Banco no período ${showSignedMinutes(person.bank_minutes)}. Saldo do banco ${showSignedMinutes(person.balance_minutes ?? 0)}.`)
      for (const entry of bank?.entries || []) {
        const amount = entry.kind === "balance" ? showBalanceTarget(entry.effect === "debit" ? -entry.minutes : entry.minutes) : showMinutes(entry.minutes)
        const reason = entry.note?.trim()
        notes.push(`${hourBankKindLabel[entry.kind] || entry.kind} de ${amount} neste fechamento.${reason ? ` Observação: ${reason}.` : ""}`)
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
        off: day.contracted_minutes === 0 && !day.absence && day.punches.length === 0,
        absence: day.absence,
        worked: clockCell(day.worked_minutes),
        overtime: clockCell(day.overtime_minutes),
        night: clockCell(day.night_minutes),
        shortage: day.absence ? showMinutes(day.contracted_minutes) : clockCell(day.shortage_minutes),
        bank: person.hour_bank ? clockCell(day.bank_minutes) : "",
      })),
      totals: {
        worked: clockTotal(person.worked_minutes),
        overtime: clockTotal(person.overtime_minutes),
        night: clockTotal(person.night_minutes),
        shortage: clockTotal(person.shortage_minutes),
        bank: person.hour_bank ? clockTotal(person.bank_minutes) : "",
      },
      notes,
    }
  })
}

function ResultTable({
  people,
  total,
  page,
  pageSize,
  loading,
  printing,
  onPage,
  onPageSize,
  onPrint,
}: {
  people: ClosingPerson[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  printing: boolean
  onPage: (page: number) => void
  onPageSize: (size: number) => void
  onPrint: () => void
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-ink">Resultado</h2>
          <p className="mt-1 text-sm text-[#64748B]">{peopleCount(total)}</p>
        </div>
        <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} disabled={printing} onClick={onPrint}>
          <Printer className="h-4 w-4" aria-hidden />
          Imprimir folhas
        </Button>
      </div>
      <div className="overflow-hidden rounded-[14px] border border-[#E2E8F0] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : people.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <span className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B]">
              <conceptIcon.result className="h-8 w-8" strokeWidth={1.75} aria-hidden />
            </span>
            <p className="mt-4 text-[17px] font-semibold text-[#0A0A0A]">Nenhuma pessoa neste período</p>
          </div>
        ) : (
          <>
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
                  {people.map((person) => (
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
            <div className="border-t border-[#F1F5F9] px-4 py-4">
              <ListPager page={page} pageSize={pageSize} total={total} onPage={onPage} onPageSize={onPageSize} />
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function BankLaunch({
  banks,
  personId,
  minutes,
  pending,
  editing,
  onPerson,
  onMinutes,
  onAsk,
  onEdit,
  onCancelEdit,
  onRemove,
  onSettleAll,
}: {
  banks: ClosingBank[]
  personId: string
  minutes: string
  pending: boolean
  editing: boolean
  onPerson: (value: string) => void
  onMinutes: (value: string) => void
  onAsk: (employeeId: number, kind: "credit" | "debit" | "balance" | "settlement") => void
  onEdit: () => void
  onCancelEdit: () => void
  onRemove: () => void
  onSettleAll: () => void
}) {
  const active = banks.find((item) => String(item.employee_id) === personId) || banks[0]
  const entry = currentEntry(active.entries || [])
  const locked = Boolean(entry) && !editing
  const EntryIcon = (entry && launchKind[entry.kind]) || conceptIcon.hourBank
  return (
    <section className={moduleCardClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-brand-ink">Banco de horas</h2>
        <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} disabled={pending} onClick={onSettleAll}>
          <CircleCheck className="h-4 w-4" aria-hidden />
          Quitar o banco de todos
        </Button>
      </div>
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
        <div className="space-y-4 pt-1">
          <h3 className="text-base font-semibold text-[#111827]">Lançamento</h3>
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="closing-bank-hours">Horas</Label>
            <DurationField id="closing-bank-hours" className={moduleFieldClass} value={minutes} onValueChange={onMinutes} signed disabled={locked || pending} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} disabled={locked || pending} onClick={() => onAsk(active.employee_id, "credit")}>
              <Plus className="h-4 w-4" aria-hidden />
              Somar
            </Button>
            <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} disabled={locked || pending} onClick={() => onAsk(active.employee_id, "debit")}>
              <Minus className="h-4 w-4" aria-hidden />
              Diminuir
            </Button>
            <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} disabled={locked || pending} onClick={() => onAsk(active.employee_id, "balance")}>
              <Scale className="h-4 w-4" aria-hidden />
              Lançar saldo
            </Button>
            <Button type="button" className={modulePrimaryClass} disabled={locked || pending} onClick={() => onAsk(active.employee_id, "settlement")}>
              <CircleCheck className="h-4 w-4" aria-hidden />
              Quitar o saldo
            </Button>
          </div>
          {entry ? (
            <div className={cn("flex min-h-16 flex-wrap items-center gap-3 rounded-xl border px-4 py-3", editing ? "border-[#8ED4A8] bg-[#F7FCF9]" : "border-[#E2E8F0] bg-white")}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#EAF7EF] text-[#1E8A3A]" aria-hidden>
                <EntryIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-4 text-[#64748B]">Lançamento</p>
                <p className="mt-0.5 text-[15px] font-semibold leading-5 text-[#111827]">{hourBankKindLabel[entry.kind] || "Não informado"} · {launchAmount(entry)}</p>
                <p className="mt-0.5 text-sm font-semibold leading-5">
                  <span className={cn("tabular-nums", balanceTone(entry.balance_before_minutes))}>{typeof entry.balance_before_minutes === "number" ? showSignedMinutes(entry.balance_before_minutes) : "Não informado"}</span>
                  <span className="mx-1.5 text-lg font-bold leading-none text-[#111827]">→</span>
                  <span className={cn("tabular-nums", balanceTone(entry.balance_after_minutes))}>{typeof entry.balance_after_minutes === "number" ? showSignedMinutes(entry.balance_after_minutes) : "Não informado"}</span>
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {editing ? (
                  <ActionTip label="Cancelar">
                    <Button type="button" variant="outline" className={moduleIconClass} disabled={pending} aria-label="Cancelar edição" onClick={onCancelEdit}>
                      <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    </Button>
                  </ActionTip>
                ) : (
                  <>
                    <ActionTip label="Editar">
                      <Button type="button" variant="outline" className={moduleIconClass} disabled={pending} aria-label="Editar lançamento" onClick={onEdit}>
                        <Pencil className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                      </Button>
                    </ActionTip>
                    <ActionTip label="Excluir">
                      <Button type="button" variant="outline" className={moduleDangerIconClass} disabled={pending} aria-label="Excluir lançamento" onClick={onRemove}>
                        <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                      </Button>
                    </ActionTip>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
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
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<BankDraft | null>(null)
  const [removal, setRemoval] = useState<{ employeeId: number; summary: string } | null>(null)
  const [resultPage, setResultPage] = useState(1)
  const [resultPageSize, setResultPageSize] = useState(20)
  const [people, setPeople] = useState<ClosingPerson[]>([])
  const [peopleTotal, setPeopleTotal] = useState(0)
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [peopleStamp, setPeopleStamp] = useState(0)
  const [printing, setPrinting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!canManage || !Number.isInteger(closingId)) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    setResultPage(1)
    setEditing(false)
    setMinutes("")
    getRecord<Closing>("/closings", closingId, { part: "banks" })
      .then((row) => {
        if (!active) return
        if (row.status === "closed") setPeopleLoading(true)
        setClosing(row)
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

  useEffect(() => {
    if (!canManage || !Number.isInteger(closingId) || closing?.status !== "closed") {
      setPeople([])
      setPeopleTotal(0)
      setPeopleLoading(false)
      return
    }
    let active = true
    setPeopleLoading(true)
    getRecord<Closing>("/closings", closingId, { part: "people", page: resultPage, limit: resultPageSize })
      .then((row) => {
        if (!active) return
        setPeople(row.people || [])
        setPeopleTotal(row.people_total || 0)
      })
      .catch((caught: unknown) => {
        if (active) toastError(apiErrorMessage(caught))
      })
      .finally(() => {
        if (active) setPeopleLoading(false)
      })
    return () => {
      active = false
    }
  }, [canManage, closing?.status, closingId, peopleStamp, resultPage, resultPageSize])

  function choosePerson(value: string) {
    setBankId(value)
    setEditing(false)
    setMinutes("")
  }

  function askRemove() {
    const person = (closing?.banks || []).find((item) => String(item.employee_id) === bankId) || closing?.banks?.[0]
    const entry = person ? currentEntry(person.entries || []) : undefined
    if (!person || !entry) return
    const name = person.full_name?.trim() || "Não informado"
    setRemoval({ employeeId: person.employee_id, summary: `${name} · ${hourBankKindLabel[entry.kind] || "Não informado"} · ${launchAmount(entry)}` })
  }

  function startEdit() {
    const person = (closing?.banks || []).find((item) => String(item.employee_id) === bankId) || closing?.banks?.[0]
    const entry = person ? currentEntry(person.entries || []) : undefined
    if (!entry) return
    setMinutes(launchInput(entry))
    setEditing(true)
  }

  function askLaunch(employeeId: number, kind: "credit" | "debit" | "balance" | "settlement") {
    const person = (closing?.banks || []).find((item) => item.employee_id === employeeId)
    if (currentEntry(person?.entries || []) && !editing) return
    const name = person?.full_name?.trim() || "Não informado"
    const note = editing ? currentEntry(person?.entries || [])?.note?.trim() || "" : ""
    if (kind === "settlement") {
      setDraft({ employeeId, name, kind, minutes: 0, note })
      return
    }
    const amount = kind === "balance" ? signedDurationMinutes(minutes) : durationMinutes(minutes)
    if (amount === null) {
      toastError(kind === "balance" ? "Informe o saldo no formato 00:00. Use o sinal de menos para saldo negativo." : minutes.trim().startsWith("-") ? "Somar e diminuir não usam sinal. Para deixar o saldo neste valor, use Lançar saldo." : "Informe as horas no formato 00:00.")
      return
    }
    setDraft({ employeeId, name, kind, minutes: amount, note })
  }

  async function confirmDraft(note: string) {
    if (!draft) return
    setPending(true)
    try {
      const next = draft.everyone
        ? await settleClosingBanks(closingId, note)
        : await launchClosingBank(closingId, {
            employee_id: draft.employeeId,
            kind: draft.kind,
            note,
            ...(draft.kind === "settlement" ? {} : { minutes: draft.minutes }),
          })
      setClosing((current) => (current ? { ...current, banks: next.banks || [] } : next))
      setPeopleStamp((value) => value + 1)
      setEditing(false)
      setMinutes("")
      setDraft(null)
    } catch {
      return
    } finally {
      setPending(false)
    }
  }

  async function confirmRemoval() {
    if (!removal) return
    setPending(true)
    try {
      const next = await clearClosingBank(closingId, removal.employeeId)
      setClosing((current) => (current ? { ...current, banks: next.banks || [] } : next))
      setPeopleStamp((value) => value + 1)
      setEditing(false)
      setMinutes("")
      setRemoval(null)
    } catch {
      return
    } finally {
      setPending(false)
    }
  }

  async function printResult() {
    if (!closing || printing) return
    setPrinting(true)
    try {
      const full = await getRecord<Closing>("/closings", closingId, { part: "sheets" })
      const bytes = closingSheetsPdf(sheetsOf(full))
      const blob = new Blob([bytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `fechamento-${full.starts_on}-${full.ends_on}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (caught: unknown) {
      toastError(apiErrorMessage(caught))
    } finally {
      setPrinting(false)
    }
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
          {closed && (closing.banks || []).length > 0 ? (
            <>
              <BankLaunch
                banks={closing.banks || []}
                personId={bankId}
                minutes={minutes}
                pending={pending}
                editing={editing}
                onPerson={choosePerson}
                onMinutes={setMinutes}
                onAsk={askLaunch}
                onEdit={startEdit}
                onCancelEdit={() => {
                  setEditing(false)
                  setMinutes("")
                }}
                onRemove={askRemove}
                onSettleAll={() => setDraft({ employeeId: 0, name: "", kind: "settlement", minutes: 0, note: "", everyone: true })}
              />
              {removal ? (
                <BankRemoveDialog
                  summary={removal.summary}
                  pending={pending}
                  onClose={() => {
                    if (pending) return
                    setRemoval(null)
                  }}
                  onConfirm={confirmRemoval}
                />
              ) : null}
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
            <ResultTable
              people={people}
              total={peopleTotal}
              page={resultPage}
              pageSize={resultPageSize}
              loading={peopleLoading}
              printing={printing}
              onPage={(page) => {
                setPeopleLoading(true)
                setResultPage(page)
              }}
              onPageSize={(size) => {
                setPeopleLoading(true)
                setResultPageSize(size)
                setResultPage(1)
              }}
              onPrint={printResult}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}
