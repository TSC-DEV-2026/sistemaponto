import { Calendar, Eye, FileText, MessageSquare, Pencil, Plus, Trash2, User, X, Save, type LucideIcon } from "lucide-react"
import { FormEvent, useEffect, useState, type ReactNode } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { ActionTip } from "@/components/ui/action-tip"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { DatePickerField } from "@/components/ui/date-picker-field"
import { Label } from "@/components/ui/label"
import { ListPlaceholder } from "@/components/ui/list-placeholder"
import { SiteSelect } from "@/components/ui/site-select"
import { Spinner } from "@/components/ui/spinner"
import { EmployeeCombobox } from "@/components/workforce/employee-combobox"
import { ListPager, usePagedList } from "@/components/workforce/list-controls"
import { moduleCardClass, moduleDangerClass, moduleDangerIconClass, moduleIconClass, moduleLabelClass, modulePrimaryClass, moduleQuietClass, moduleTextClass } from "@/components/workforce/module-visual"
import { DocumentLink, emptyTimeOff, TimeOffFields, timeOffBody, type TimeOffDraft } from "@/components/workforce/TimeOffFields"
import { useDayLocks } from "@/components/workforce/use-day-lock"
import { DomainTabs } from "@/pages/workforce/EntityScreens"
import { createRecord, getRecord, listRecords, removeRecord, updateRecord, uploadCertificatePhoto, type Employee, type NamedRecord, type Occurrence } from "@/services/workforce.service"
import { canOperate } from "@/navigation"
import { useAuthStore } from "@/store/auth.store"
import { toastError } from "@/store/toast.store"
import { cn } from "@/utils/cn"
import { conceptIcon } from "@/utils/concept-icons"
import { absenceKinds, certificateText, isCertificateKind, isLeaveKind, isVacationKind, occurrenceKindLabel, occurrenceKindOf, occurrenceNewLabel, occurrenceTabLabel, periodText, punchOrigin, reasonKindForOccurrence, requestStatusClass } from "@/utils/labels"

const occurrenceKinds = absenceKinds.map((id) => [id, occurrenceTabLabel[id]] as const)

const occurrenceIcon = {
  absences: conceptIcon.fault,
  certificates: conceptIcon.certificate,
  vacations: conceptIcon.vacation,
  allowances: conceptIcon.allowance,
  leaves: conceptIcon.leave,
} as const

function tabPath(kind: string) {
  const tab = kind || occurrenceKinds[0][0]
  return `/occurrences?tab=${tab}`
}

function canLaunchKind(role: string | null | undefined, _kind: string) {
  return canOperate(role)
}

function OccurrenceKindList({ kind, employees }: { kind: string; employees: Employee[] }) {
  const role = useAuthStore((state) => state.user?.role)
  const canLaunch = canLaunchKind(role, kind)
  const canEdit = canOperate(role)
  const [listEmployee, setListEmployee] = useState("")
  const [reasons, setReasons] = useState<NamedRecord[]>([])
  const asksReason = !isVacationKind(kind) && !isLeaveKind(kind) && kind !== "punch_entry"
  const events = usePagedList<Occurrence>("/occurrences", { kind, ...(listEmployee ? { employee_id: Number(listEmployee) } : {}) })
  const [pending, setPending] = useState<number | null>(null)
  const label = occurrenceTabLabel[kind] || kind
  const actionLabel = occurrenceNewLabel[kind] || "Novo lançamento"
  const visible = events.items

  useEffect(() => {
    if (!asksReason) {
      setReasons([])
      return
    }
    let active = true
    listRecords<NamedRecord>("/reasons", { page: 1, limit: 100, kind: reasonKindForOccurrence(kind) })
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

  async function remove(id: number) {
    try {
      await removeRecord("/occurrences", id)
      setPending(null)
      events.reload()
    } catch {
      // O interceptor já avisou o erro.
    }
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
      {visible.length === 0 && !events.error ? (
        events.loading ? (
          <ul className="mt-8">
            <ListPlaceholder loading empty={`Nenhum registro de ${label.toLocaleLowerCase("pt-BR")}.`} />
          </ul>
        ) : (
          <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-white px-6 py-10 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(30,138,58,0.08)] text-[#1E8A3A]">
              <conceptIcon.occurrence className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-[#0A0A0A]">{`Nenhum registro de ${label.toLocaleLowerCase("pt-BR")}.`}</p>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#52525B]">
              {canLaunch ? `Use ${actionLabel} para lançar, ou escolha um funcionário no filtro.` : "Nada encontrado para este tipo e este filtro."}
            </p>
          </div>
        )
      ) : null}
      {visible.length > 0 ? (
        <div className="mt-5 min-w-0 overflow-hidden rounded-xl border border-[#E2E8F0]">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="bg-[#F7F7F8] text-xs text-[#71717A]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Funcionário</th>
                <th className="px-4 py-2.5 font-medium">Período</th>
                <th className="px-4 py-2.5 font-medium">Motivo</th>
                <th className="px-4 py-2.5 font-medium">Observação</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="w-[9.5rem] whitespace-nowrap px-2 py-2.5 text-center font-medium">Ações</th>
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
                        {note || "Nenhuma observação informada."}
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
                    <td className="w-[9.5rem] px-2 py-2.5 text-center align-middle">
                      {pending === item.id ? (
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <Button type="button" className={moduleDangerClass} onClick={() => remove(item.id)}>
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </Button>
                          <Button type="button" variant="outline" className={moduleQuietClass} onClick={() => setPending(null)}>
                            <X className="h-4 w-4" />
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="inline-flex justify-center gap-1.5">
                          <ActionTip label="Visualizar">
                            <Button asChild variant="outline" className={moduleIconClass}>
                              <Link to={`/occurrences/${item.id}`} aria-label={`Ver ${person}`}>
                                <Eye className="h-4 w-4" strokeWidth={1.75} />
                              </Link>
                            </Button>
                          </ActionTip>
                          {canEdit ? (
                            <ActionTip label="Editar">
                              <Button asChild variant="outline" className={moduleIconClass}>
                                <Link to={`/occurrences/${item.id}/edit`} aria-label={`Editar ${person}`}>
                                  <Pencil className="h-4 w-4" strokeWidth={1.75} />
                                </Link>
                              </Button>
                            </ActionTip>
                          ) : null}
                          {canLaunch ? (
                            <ActionTip label="Excluir">
                              <Button type="button" variant="outline" className={moduleDangerIconClass} aria-label={`Excluir ${person}`} onClick={() => setPending(item.id)}>
                                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                              </Button>
                            </ActionTip>
                          ) : null}
                        </div>
                      )}
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
  const requested = params.get("tab") || params.get("aba")
  const kind = occurrenceKinds.some(([id]) => id === requested) ? requested || occurrenceKinds[0][0] : occurrenceKinds[0][0]
  const canLaunch = canLaunchKind(role, kind)
  const actionLabel = occurrenceNewLabel[kind] || "Novo lançamento"
  const [employees, setEmployees] = useState<Employee[]>([])

  useEffect(() => {
    let active = true
    listRecords<Employee>("/employees", { page: 1, limit: 100 })
      .then((page) => {
        if (active) setEmployees(page.items)
      })
      .catch((caught: unknown) => {
        if (active) toastError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      })
    return () => {
      active = false
    }
  }, [tenantId])

  return (
    <div className="w-full min-w-0 space-y-5">
      <DomainTabs
        module
        title="Ocorrências"
        action={
          canLaunch ? (
            <Button asChild className={cn(modulePrimaryClass, "shrink-0")}>
              <Link to={`/occurrences/new?kind=${kind}`}>
                <Plus className="h-4 w-4" />
                {actionLabel}
              </Link>
            </Button>
          ) : null
        }
        tabs={occurrenceKinds.map(([id, label]) => ({
          id,
          label,
          icon: occurrenceIcon[id],
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
  const [search, setSearch] = useSearchParams()
  const requested = search.get("kind") || search.get("tipo") || ""
  const kind = occurrenceKindOf(requested)

  useEffect(() => {
    if (search.get("kind") === kind && !search.get("tipo")) return
    const next = new URLSearchParams(search)
    next.set("kind", kind)
    next.delete("tipo")
    setSearch(next, { replace: true })
  }, [kind, search, setSearch])
  const known = absenceKinds.includes(occurrenceKindOf(kind) as (typeof absenceKinds)[number])
  const manual = known
  const canLaunch = canLaunchKind(role, kind)
  const asksReason = Boolean(reasonKindForOccurrence(kind))
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
  const locks = useDayLocks(employeeId ? Number(employeeId) : null)
  const spanStart = manual ? draft.startsOn : startsOn
  const spanEnd = manual ? (draft.mode === "hours" ? draft.startsOn : draft.endsOn || spanStart) : endsOn || spanStart
  const blocked = locks.lockRange(spanStart, spanEnd)

  useEffect(() => {
    if (!role) return
    if (!known || !canLaunch) navigate(tabPath(known ? kind : ""), { replace: true })
  }, [role, known, canLaunch, kind, navigate])

  useEffect(() => {
    setEmployeeId("")
    setStartsOn("")
    setEndsOn("")
    setReasonId("")
    setNote("")
    setDraft(emptyTimeOff())
    setFileKey((current) => current + 1)
  }, [kind])

  useEffect(() => {
    if (!known) return
    let active = true
    setReasons([])
    setReasonsReady(false)
    const reasonKind = reasonKindForOccurrence(kind)
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
        toastError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      })
    return () => {
      active = false
    }
  }, [kind, tenantId, known])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (blocked) {
      toastError(blocked)
      return
    }
    let span: Record<string, unknown>
    try {
      span = manual ? timeOffBody(draft, kind) : { starts_on: startsOn, ends_on: endsOn || null }
    } catch (caught) {
      toastError(caught instanceof Error ? caught.message : "Não foi possível salvar.")
      return
    }
    try {
      if (manual && isCertificateKind(kind) && draft.photo) {
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
    } catch {
      // O interceptor já avisou o erro.
    }
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <BackLink to={tabPath(kind)} appearance="detail" />
      <ActionForm className={cn(moduleCardClass, "space-y-5")} onSubmit={onSubmit}>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-[#111827]">{occurrenceNewLabel[kind] || "Novo lançamento"}</h2>
          <p className="mt-1 text-sm text-[#64748B]">{occurrenceKindOf(kind) === "absences" ? "Informe o funcionário e o dia." : manual ? "Origem manual. O funcionário pede este tipo em Solicitações." : "Informe o funcionário e o período."}</p>
        </div>
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
              searchable
              searchPath="/reasons"
              searchParams={{ kind, active: true }}
              searchPlaceholder="Pesquisar motivo"
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
        {blocked ? <p className="text-sm text-[#64748B]">{blocked}</p> : null}
        <Button type="submit" className={modulePrimaryClass} disabled={Boolean(blocked)}>
          <Save className="h-4 w-4" />
          Salvar
        </Button>
      </ActionForm>
    </div>
  )
}

function missing() {
  return <span className="font-medium text-[#94A3B8]">Não informado</span>
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

export function OccurrenceRecordPage({ mode }: { mode: "view" | "edit" }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const role = useAuthStore((state) => state.user?.role)
  const canEdit = canOperate(role)
  const [item, setItem] = useState<Occurrence | null>(null)
  const [employeeName, setEmployeeName] = useState("")
  const [reasonName, setReasonName] = useState("")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(true)
  const locks = useDayLocks(item?.employee_id ?? null)
  const numeric = Number(id)
  const blocked = item ? locks.lockRange(item.starts_on, item.ends_on || item.starts_on) : ""

  useEffect(() => {
    if (mode === "edit" && role && !canEdit && id) navigate(`/occurrences/${id}`, { replace: true })
  }, [mode, role, canEdit, id, navigate])

  useEffect(() => {
    if (!id || Number.isNaN(numeric)) {
      setLoading(false)
      toastError("Não foi possível abrir o lançamento.")
      return
    }
    let active = true
    setLoading(true)
    getRecord<Occurrence>("/occurrences", numeric)
      .then(async (row) => {
        if (!active) return
        const reasonKind = reasonKindForOccurrence(row.kind)
        const [person, motives] = await Promise.all([
          getRecord<Employee>("/employees", row.employee_id).catch(() => null),
          reasonKind ? listRecords<NamedRecord>("/reasons", { page: 1, limit: 100, kind: reasonKind }).catch(() => ({ items: [] as NamedRecord[] })) : Promise.resolve({ items: [] as NamedRecord[] }),
        ])
        if (!active) return
        setItem(row)
        setEmployeeName(person?.full_name || "")
        setReasonName(motives.items.find((reason) => reason.id === row.reason_id)?.name || "")
        setNote(row.note || "")
        setLoading(false)
      })
      .catch((caught: unknown) => {
        if (!active) return
        setLoading(false)
        toastError(caught instanceof Error ? caught.message : "Não foi possível abrir o lançamento.")
      })
    return () => {
      active = false
    }
  }, [id, numeric])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!item) return
    if (blocked) {
      toastError(blocked)
      return
    }
    try {
      await updateRecord("/occurrences", item.id, { note: note.trim() || null })
      navigate(`/occurrences/${item.id}`)
    } catch {
      // O interceptor já avisou o erro.
    }
  }

  const kind = item ? occurrenceKindOf(item.kind) : ""
  const back = tabPath(kind)

  return (
    <div className="w-full min-w-0 space-y-5">
      <BackLink to={back} appearance="detail" />
      {loading ? (
        <section className={cn(moduleCardClass, "flex min-h-[240px] items-center justify-center")} role="status" aria-live="polite">
          <Spinner />
        </section>
      ) : null}
      {!loading && item && mode === "view" ? (
        <section className={moduleCardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-[#111827]">{occurrenceKindLabel[kind] || occurrenceTabLabel[kind] || "Ocorrência"}</h2>
            {canEdit ? (
              <Button asChild variant="outline" className={cn(moduleQuietClass, "h-11 px-4")}>
                <Link to={`/occurrences/${item.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Link>
              </Button>
            ) : null}
          </div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <DetailTile icon={User} label="Funcionário">{employeeName ? employeeName : missing()}</DetailTile>
            <DetailTile icon={Calendar} label="Período">{periodText(item) === "Sem período informado" ? <span className="font-medium text-[#94A3B8]">Sem período informado</span> : periodText(item)}</DetailTile>
            <DetailTile icon={FileText} label="Motivo">{item.reason_id ? reasonName || missing() : missing()}</DetailTile>
            <DetailTile icon={conceptIcon.situation} label="Origem">{item.source === "approved_request" ? "Solicitação aprovada" : punchOrigin(item.source)}</DetailTile>
            <DetailTile icon={MessageSquare} label="Observação">{item.note?.trim() ? item.note : <span className="font-medium text-[#94A3B8]">Nenhuma observação informada.</span>}</DetailTile>
            {isCertificateKind(kind) ? (
              <>
                <DetailTile icon={FileText} label="CID">{item.cid?.trim() ? item.cid : missing()}</DetailTile>
                <DetailTile icon={FileText} label="CRM">{item.crm?.trim() ? item.crm : missing()}</DetailTile>
                <DetailTile icon={User} label="Nome do médico">{item.doctor_name?.trim() ? item.doctor_name : missing()}</DetailTile>
                <DetailTile icon={FileText} label="Foto do atestado">{item.photo_url ? <DocumentLink href={item.photo_url} className="font-semibold text-[#1E8A3A] underline-offset-2 hover:underline" /> : missing()}</DetailTile>
              </>
            ) : null}
          </dl>
          {item.warning ? <p className="mt-4 text-sm text-[#C2410C]">{item.warning}</p> : null}
        </section>
      ) : null}
      {!loading && item && mode === "edit" ? (
        <ActionForm className={cn(moduleCardClass, "space-y-5")} onSubmit={onSubmit}>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#111827]">Editar observação</h2>
            <p className="mt-1 text-sm text-[#64748B]">{[employeeName, periodText(item)].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="space-y-2">
            <Label className={moduleLabelClass} htmlFor="occurrence-edit-note">Observação</Label>
            <textarea id="occurrence-edit-note" className={moduleTextClass} value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
          {blocked ? <p className="text-sm text-[#64748B]">{blocked}</p> : null}
          <div className="flex justify-end">
            <Button type="submit" className={modulePrimaryClass} disabled={Boolean(blocked)}>
              <Save className="h-4 w-4" />
              Salvar
            </Button>
          </div>
        </ActionForm>
      ) : null}
    </div>
  )
}
