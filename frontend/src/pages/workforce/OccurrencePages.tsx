import { ClipboardList, Plus } from "lucide-react"
import { FormEvent, useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { DatePickerField } from "@/components/ui/date-picker-field"
import { Label } from "@/components/ui/label"
import { ListPlaceholder } from "@/components/ui/list-placeholder"
import { SiteSelect } from "@/components/ui/site-select"
import { EmployeeCombobox } from "@/components/workforce/employee-combobox"
import { ListPager, usePagedList } from "@/components/workforce/list-controls"
import { moduleCardClass, moduleLabelClass, modulePrimaryClass, moduleTextClass } from "@/components/workforce/module-visual"
import { DocumentLink, emptyTimeOff, TimeOffFields, timeOffBody, type TimeOffDraft } from "@/components/workforce/TimeOffFields"
import { DomainTabs } from "@/pages/workforce/EntityScreens"
import { createRecord, listRecords, uploadCertificatePhoto, type Employee, type NamedRecord, type Occurrence } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/utils/cn"
import { certificateText, manualTimeOffKinds, occurrenceKindLabel, occurrenceNewLabel, periodText, punchOrigin, requestStatusClass } from "@/utils/labels"

const occurrenceKinds = Object.entries(occurrenceKindLabel)

function tabPath(kind: string) {
  const first = occurrenceKinds[0]?.[0]
  return !kind || kind === first ? "/occurrences" : `/occurrences?aba=${kind}`
}

function canLaunchKind(role: string | null | undefined, kind: string) {
  const manual = manualTimeOffKinds.includes(kind as (typeof manualTimeOffKinds)[number])
  return role === "admin" || (role === "manager" && manual)
}

function OccurrenceKindList({ kind, employees }: { kind: string; employees: Employee[] }) {
  const canLaunch = canLaunchKind(useAuthStore((state) => state.user?.role), kind)
  const [listEmployee, setListEmployee] = useState("")
  const [reasons, setReasons] = useState<NamedRecord[]>([])
  const asksReason = kind !== "vacation" && kind !== "leave" && kind !== "punch_entry"
  const events = usePagedList<Occurrence>("/occurrences", { kind, ...(listEmployee ? { employee_id: Number(listEmployee) } : {}) })
  const label = occurrenceKindLabel[kind] || kind
  const actionLabel = occurrenceNewLabel[kind] || "Novo lançamento"
  const visible = events.items

  useEffect(() => {
    if (!asksReason) {
      setReasons([])
      return
    }
    let active = true
    listRecords<NamedRecord>("/reasons", { page: 1, limit: 100, kind })
      .then((page) => {
        if (active) setReasons(page.items)
      })
      .catch(() => {
        if (active) setReasons([])
      })
    return () => {
      active = false
    }
  }, [asksReason, kind])

  function nameOf(id: number) {
    return employees.find((item) => item.id === id)?.full_name || String(id)
  }

  function reasonOf(id: number | null) {
    if (!id) return label
    return reasons.find((item) => item.id === id)?.name || label
  }

  return (
    <section className="rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-brand-ink">{label}</h2>
        <p className="mt-1 text-sm text-brand-quiet">Consulte os lançamentos registrados.</p>
      </div>
      <div className="mt-[18px] min-w-0 space-y-2">
        <Label className={moduleLabelClass} htmlFor={`occurrence-employee-${kind}`}>
          Funcionário
        </Label>
        <EmployeeCombobox
          id={`occurrence-employee-${kind}`}
          value={listEmployee}
          employees={employees}
          emptyLabel="Todos"
          extendSearch={employees.length >= 100}
          onChange={setListEmployee}
        />
      </div>
      {events.error ? <p className="mt-4 text-sm text-destructive">{events.error}</p> : null}
      {visible.length === 0 && !events.error ? (
        events.loading ? (
          <ul className="mt-8">
            <ListPlaceholder loading empty={`Nenhum registro de ${label.toLocaleLowerCase("pt-BR")}.`} />
          </ul>
        ) : (
          <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-white px-6 py-10 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(30,138,58,0.08)] text-[#1E8A3A]">
              <ClipboardList className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-[#0A0A0A]">{`Nenhum registro de ${label.toLocaleLowerCase("pt-BR")}.`}</p>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#52525B]">
              {canLaunch ? `Use ${actionLabel} para lançar, ou escolha um funcionário no filtro.` : "Nada encontrado para este tipo e este filtro."}
            </p>
          </div>
        )
      ) : null}
      {visible.length > 0 ? (
        <div className="mt-5 min-w-0 overflow-x-auto rounded-xl border border-[#E2E8F0]">
          <table className="w-full min-w-[820px] table-fixed text-left text-sm">
            <thead className="bg-[#F7F7F8] text-xs text-[#71717A]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Funcionário</th>
                <th className="px-4 py-2.5 font-medium">Período</th>
                <th className="px-4 py-2.5 font-medium">Motivo</th>
                <th className="px-4 py-2.5 font-medium">Observação</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const certificate = certificateText(item)
                const note = [item.note, certificate].filter(Boolean).join(" · ")
                const person = nameOf(item.employee_id)
                const motive = reasonOf(item.reason_id)
                const approved = item.source === "approved_request"
                return (
                  <tr key={item.id} className="border-t border-[#F0F0F2]">
                    <td className="overflow-hidden px-4 py-2.5 align-middle font-medium text-[#0A0A0A]">
                      <span className="block truncate" title={person}>
                        {person}
                      </span>
                    </td>
                    <td className="overflow-hidden px-4 py-2.5 align-middle text-[#52525B]">
                      <span className="block truncate">{periodText(item)}</span>
                    </td>
                    <td className="overflow-hidden px-4 py-2.5 align-middle text-[#52525B]">
                      <span className="block truncate" title={motive}>
                        {motive}
                      </span>
                    </td>
                    <td className="overflow-hidden px-4 py-2.5 align-middle text-[#52525B]">
                      <span className="block truncate" title={note || undefined}>
                        {note || "—"}
                      </span>
                      {item.warning ? <span className="mt-0.5 block truncate text-xs text-[#C2410C]" title={item.warning}>{item.warning}</span> : null}
                      {item.photo_url ? (
                        <span className="mt-0.5 block">
                          <DocumentLink href={item.photo_url} className="text-xs font-semibold text-[#1E8A3A] underline-offset-2 hover:underline" />
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 align-middle">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", approved ? requestStatusClass("approved") : "bg-[#F4F4F5] text-[#52525B]")}>
                        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", approved ? "bg-[#1E8A3A]" : "bg-[#A1A1AA]")} aria-hidden />
                        {approved ? "Solicitação aprovada" : punchOrigin(item.source)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      {events.total > 0 ? (
        <div className="mt-4 border-t border-[#F0F0F2] pt-4">
          <ListPager page={events.page} pageSize={events.pageSize} total={events.total} onPage={events.setPage} onPageSize={events.setPageSize} tone="module" />
        </div>
      ) : null}
    </section>
  )
}

export function OccurrencesPage() {
  const role = useAuthStore((state) => state.user?.role)
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [params] = useSearchParams()
  const requested = params.get("aba")
  const kind = occurrenceKinds.some(([id]) => id === requested) ? requested || occurrenceKinds[0][0] : occurrenceKinds[0][0]
  const canLaunch = canLaunchKind(role, kind)
  const actionLabel = occurrenceNewLabel[kind] || "Novo lançamento"
  const [employees, setEmployees] = useState<Employee[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    listRecords<Employee>("/employees", { page: 1, limit: 100 })
      .then((page) => {
        if (active) setEmployees(page.items)
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      })
    return () => {
      active = false
    }
  }, [tenantId])

  return (
    <div className="w-full min-w-0 space-y-5">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <DomainTabs
        module
        title="Ajustes e Ocorrências"
        action={
          canLaunch ? (
            <Button asChild className={cn(modulePrimaryClass, "shrink-0")}>
              <Link to={`/occurrences/new?tipo=${kind}`}>
                <Plus className="h-4 w-4" />
                {actionLabel}
              </Link>
            </Button>
          ) : null
        }
        tabs={occurrenceKinds.map(([id, label]) => ({
          id,
          label,
          panel: <OccurrenceKindList kind={id} employees={employees} />,
        }))}
      />
    </div>
  )
}

export function OccurrenceEntryPage() {
  const role = useAuthStore((state) => state.user?.role)
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const kind = search.get("tipo") || ""
  const known = Object.prototype.hasOwnProperty.call(occurrenceKindLabel, kind)
  const manual = manualTimeOffKinds.includes(kind as (typeof manualTimeOffKinds)[number])
  const canLaunch = canLaunchKind(role, kind)
  const asksReason = known && kind !== "vacation" && kind !== "leave" && kind !== "punch_entry"
  const [employees, setEmployees] = useState<Employee[]>([])
  const [reasons, setReasons] = useState<NamedRecord[]>([])
  const [reasonsReady, setReasonsReady] = useState(false)
  const [employeeId, setEmployeeId] = useState("")
  const [startsOn, setStartsOn] = useState("")
  const [endsOn, setEndsOn] = useState("")
  const [reasonId, setReasonId] = useState("")
  const [note, setNote] = useState("")
  const [draft, setDraft] = useState<TimeOffDraft>(emptyTimeOff)
  const [fileKey, setFileKey] = useState(0)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!role) return
    if (!known || !canLaunch) navigate(known ? tabPath(kind) : "/occurrences", { replace: true })
  }, [role, known, canLaunch, kind, navigate])

  useEffect(() => {
    setEmployeeId("")
    setStartsOn("")
    setEndsOn("")
    setReasonId("")
    setNote("")
    setDraft(emptyTimeOff())
    setFileKey((current) => current + 1)
    setError("")
  }, [kind])

  useEffect(() => {
    if (!known) return
    let active = true
    setReasons([])
    setReasonsReady(false)
    const reasonKind = kind === "vacation" || kind === "leave" || kind === "punch_entry" ? undefined : kind
    Promise.all([
      listRecords<Employee>("/employees", { page: 1, limit: 100 }),
      reasonKind ? listRecords<NamedRecord>("/reasons", { page: 1, limit: 100, kind: reasonKind, active: true }) : Promise.resolve({ items: [] as NamedRecord[] }),
    ])
      .then(([people, motive]) => {
        if (!active) return
        setEmployees(people.items)
        setReasons(motive.items)
        setReasonsReady(true)
      })
      .catch((caught: unknown) => {
        if (!active) return
        setReasonsReady(true)
        setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      })
    return () => {
      active = false
    }
  }, [kind, tenantId, known])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      const span: Record<string, unknown> = manual ? timeOffBody(draft, kind) : { starts_on: startsOn, ends_on: endsOn || null }
      if (manual && kind === "certificate" && draft.photo) {
        span.photo_key = (await uploadCertificatePhoto(draft.photo)).key
      }
      await createRecord("/occurrences", {
        employee_id: Number(employeeId),
        kind,
        ...span,
        reason_id: reasonId ? Number(reasonId) : null,
        note: note.trim() || null,
      })
      navigate(tabPath(kind))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.")
    }
  }

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.14em] text-brand-cta">AJUSTES E OCORRÊNCIAS</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-ink">{occurrenceNewLabel[kind] || "Novo lançamento"}</h2>
          <p className="mt-1 text-sm text-brand-quiet">
            {manual ? "Origem manual. O funcionário pede este tipo em Solicitações." : "Informe o funcionário e o período."}
          </p>
        </div>
        <BackLink to={tabPath(kind)} appearance="detail" />
      </div>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <ActionForm className={cn(moduleCardClass, "mt-4 space-y-5")} onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label className={moduleLabelClass} htmlFor="occurrence-employee">
            Funcionário
          </Label>
          <EmployeeCombobox id="occurrence-employee" value={employeeId} employees={employees} emptyLabel="Selecione" required extendSearch={employees.length >= 100} onChange={setEmployeeId} />
        </div>
        {manual ? (
          <TimeOffFields idPrefix="occurrence" kind={kind} draft={draft} fileKey={fileKey} onChange={setDraft} appearance="module" />
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
            <DatePickerField id="occurrence-start" label="De" value={startsOn} onChange={setStartsOn} required />
            <DatePickerField id="occurrence-end" label="Até" value={endsOn} onChange={setEndsOn} />
          </div>
        )}
        {asksReason ? (
          <div className="space-y-2">
            <Label className={moduleLabelClass} htmlFor="occurrence-reason">
              Motivo
            </Label>
            <SiteSelect
              id="occurrence-reason"
              value={reasonId}
              required={!reasonsReady || reasons.length > 0}
              placeholder="Selecione"
              options={reasons.map((item) => ({ value: String(item.id), label: item.name }))}
              onChange={setReasonId}
            />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label className={moduleLabelClass} htmlFor="occurrence-note">
            Observação
          </Label>
          <textarea id="occurrence-note" className={moduleTextClass} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <Button type="submit" className={modulePrimaryClass}>
          Salvar
        </Button>
      </ActionForm>
    </div>
  )
}
