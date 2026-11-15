import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Printer } from "lucide-react"

import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteSelect } from "@/components/ui/site-select"
import { Spinner } from "@/components/ui/spinner"
import { moduleCardClass, moduleFieldClass, moduleLabelClass, modulePrimaryClass, moduleQuietClass } from "@/components/workforce/module-visual"
import { getRecord, launchClosingBank, type Closing, type ClosingBank, type ClosingPerson } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/utils/cn"
import { formatCpf } from "@/utils/digits"
import { closingStatusLabel, durationMinutes, hourBankKindLabel, maskDuration, showDate, showMinutes, showSignedMinutes } from "@/utils/labels"
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
  return value?.trim() ? value : "Não informada"
}

function cell(person: ClosingPerson, column: (typeof columns)[number]) {
  if ((column.key === "bank_minutes" || column.key === "balance_minutes") && !person.hour_bank) {
    return "—"
  }
  const value = person[column.key]
  if (column.days) return String(value)
  if (typeof value !== "number") return "—"
  return column.signed ? showSignedMinutes(value) : showMinutes(value)
}

function clockCell(value: number) {
  if (value === 0) return ""
  const sign = value < 0 ? "-" : ""
  const absolute = Math.abs(value)
  const hours = Math.floor(absolute / 60)
  const minutes = absolute % 60
  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function clockTotal(value: number) {
  const sign = value < 0 ? "-" : ""
  const absolute = Math.abs(value)
  const hours = Math.floor(absolute / 60)
  const minutes = absolute % 60
  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
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
}: {
  banks: ClosingBank[]
  personId: string
  minutes: string
  pending: boolean
  onPerson: (value: string) => void
  onMinutes: (value: string) => void
  onLaunch: (employeeId: number, kind: "credit" | "debit" | "settlement") => void
}) {
  const active = banks.find((item) => String(item.employee_id) === personId) || banks[0]
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <div className="min-w-0 space-y-2">
          <Label className={moduleLabelClass} htmlFor="closing-bank-hours">Horas</Label>
          <Input id="closing-bank-hours" className={moduleFieldClass} inputMode="numeric" placeholder="00:00" value={minutes} onChange={(event) => onMinutes(maskDuration(event.target.value))} />
        </div>
      </div>
      <p className="text-sm text-[#52525B]">
        Matrícula {registration(active.registration_number)}. Saldo {showSignedMinutes(active.balance_minutes)}.
      </p>
      {active.entries.length > 0 ? (
        <ul className="space-y-1 text-sm text-[#52525B]">
          {active.entries.map((entry) => (
            <li key={entry.id}>{hourBankKindLabel[entry.kind] || entry.kind} · {showMinutes(entry.minutes)}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[#64748B]">Nenhum lançamento deste fechamento para esta pessoa.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} disabled={pending} onClick={() => onLaunch(active.employee_id, "credit")}>Crédito</Button>
        <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} disabled={pending} onClick={() => onLaunch(active.employee_id, "debit")}>Débito</Button>
        <Button type="button" className={modulePrimaryClass} disabled={pending} onClick={() => onLaunch(active.employee_id, "settlement")}>Quitar o saldo</Button>
      </div>
    </div>
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
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!canManage || !Number.isInteger(closingId)) return
    let active = true
    getRecord<Closing>("/closings", closingId)
      .then((row) => {
        if (active) setClosing(row)
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Não foi possível abrir o fechamento.")
      })
    return () => {
      active = false
    }
  }, [canManage, closingId])

  async function launch(employeeId: number, kind: "credit" | "debit" | "settlement") {
    setError("")
    const amount = durationMinutes(minutes)
    if (kind !== "settlement" && amount === null) {
      setError("Informe as horas no formato 00:00.")
      return
    }
    setPending(true)
    try {
      const next = await launchClosingBank(closingId, {
        employee_id: employeeId,
        kind,
        ...(amount === null ? {} : { minutes: amount }),
      })
      setClosing(next)
      setMinutes("")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível lançar no banco.")
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
        <BackLink to="/schedules?aba=fechamento" appearance="detail" />
        <p className="text-sm text-[#52525B]">Só o gestor ou o administrador consulta o fechamento.</p>
      </div>
    )
  }

  const period = closing ? `${showDate(closing.starts_on)} a ${showDate(closing.ends_on)}` : ""
  const closed = closing?.status === "closed"

  return (
    <div className="w-full min-w-0 space-y-5">
      <BackLink to="/schedules?aba=fechamento" appearance="detail" />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!closing ? (
        <section className={cn(moduleCardClass, "flex justify-center py-12")}>
          <Spinner />
        </section>
      ) : (
        <>
          <section className={moduleCardClass}>
            <h2 className="text-lg font-semibold text-brand-ink">{period}</h2>
            <p className="mt-1 text-sm text-brand-quiet">
              {closingStatusLabel[closing.status] || closing.status}. Enquanto estiver fechado, os dias das pessoas deste fechamento não aceitam marcação, ajuste, ocorrência, vigência nem banco fora desta tela. Cancelar o fechamento devolve a edição.
            </p>
          </section>
          {closed ? (
            <section className={moduleCardClass}>
              <h2 className="text-lg font-semibold text-brand-ink">Banco de horas</h2>
              <p className="mt-1 text-sm text-brand-quiet">Escolha a pessoa e quite o saldo ou lance crédito e débito neste fechamento.</p>
              {(closing.banks || []).length === 0 ? <p className="mt-4 text-sm text-[#64748B]">Ninguém deste fechamento usa banco de horas.</p> : null}
              {(closing.banks || []).length > 0 ? (
                <BankLaunch
                  banks={closing.banks || []}
                  personId={bankId}
                  minutes={minutes}
                  pending={pending}
                  onPerson={setBankId}
                  onMinutes={setMinutes}
                  onLaunch={launch}
                />
              ) : null}
            </section>
          ) : (
            <section className={moduleCardClass}>
              <p className="text-sm text-[#52525B]">O resultado fica disponível enquanto o período está fechado.</p>
              <Link className="mt-3 inline-flex text-sm font-medium text-[#1E8A3A]" to="/schedules?aba=fechamento">Voltar aos fechamentos</Link>
            </section>
          )}
          {closed ? (
            <section className={moduleCardClass}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-brand-ink">Resultado</h2>
                  <p className="mt-1 text-sm text-brand-quiet">{(closing.people || []).length} pessoas neste período. A impressão gera a folha de cada uma, em retrato, para assinatura.</p>
                </div>
                <Button type="button" variant="outline" className={cn(moduleQuietClass, "h-11 px-4")} onClick={printResult}>
                  <Printer className="h-4 w-4" aria-hidden />
                  Imprimir folhas
                </Button>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#E4E4E7] text-[#64748B]">
                      <th className="px-3 py-2 font-medium">Nome</th>
                      <th className="px-3 py-2 font-medium">Matrícula</th>
                      {columns.map((column) => (
                        <th key={column.key} className="px-3 py-2 font-medium">{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(closing.people || []).map((person) => (
                      <tr key={person.employee_id} className="border-b border-[#F4F4F5] text-[#0A0A0A]">
                        <td className="px-3 py-2 font-medium">{person.full_name}</td>
                        <td className="px-3 py-2">{registration(person.registration_number)}</td>
                        {columns.map((column) => (
                          <td key={column.key} className="px-3 py-2 tabular-nums">{cell(person, column)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
