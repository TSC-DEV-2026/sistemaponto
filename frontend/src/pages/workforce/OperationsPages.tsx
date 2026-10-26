import { FilePlus, Printer, Search, Upload } from "lucide-react"
import { FormEvent, useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ListPlaceholder } from "@/components/ui/list-placeholder"
import { fieldClass } from "@/components/workforce/CatalogPanel"
import { FilterSelect, ListPager, usePagedList } from "@/components/workforce/list-controls"
import { CatalogList, DomainTabs } from "@/pages/workforce/EntityScreens"
import { DocumentLink, emptyTimeOff, TimeOffFields, timeOffBody, type TimeOffDraft } from "@/components/workforce/TimeOffFields"
import {
  createRecord,
  getPayroll,
  getReport,
  listRecords,
  updateRecord,
  uploadCertificatePhoto,
  type Closing,
  type Employee,
  type FiscalFile,
  type FiscalImport,
  type NamedRecord,
  type Notice,
  type NoticeEmail,
  type NoticePreference,
  type Occurrence,
  type Payroll,
  type Report,
  type ReportCatalogItem,
  type TimeRequest,
} from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { clockMethodLabel } from "@/utils/labels"
import {
  closingEventLabel,
  closingStatusLabel,
  monthOptions,
  fiscalKindLabel,
  noticePhrase,
  occurrenceKindLabel,
  certificateText,
  manualTimeOffKinds,
  periodText,
  punchDay,
  punchOrigin,
  requestKindLabel,
  requestStatusLabel,
  showDate,
  showDateTime,
  showMinutes,
  showSignedMinutes,
} from "@/utils/labels"
import { reportPdf } from "@/utils/report-pdf"

function MonthField({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return (
    <select id={id} className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)} required>
      {monthOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export function TimeClockPage() {
  const personId = useAuthStore((state) => state.user?.person_id)
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const mine = employees.find((item) => item.person_id === personId) ?? null
  const method = mine?.clock_method || "simple"

  useEffect(() => {
    let active = true
    listRecords<Employee>("/employees", { page: 1, limit: 100 })
      .then((page) => {
        if (active) {
          setEmployees(page.items)
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
        }
      })
    return () => {
      active = false
    }
  }, [tenantId])

  async function punchSimple(employeeId: number) {
    setError("")
    setMessage("")
    try {
      await createRecord("/punches", { employee_id: employeeId, occurred_at: new Date().toISOString(), note: null })
      setMessage("Marcação registrada.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível registrar.")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Registro de Ponto</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O próprio funcionário registra pelo tipo da ficha. O simples é o botão nesta tela. QR Code e reconhecimento facial são feitos no aplicativo.
        </p>
      </div>
      {mine ? (
        <section className="space-y-3 rounded-md border border-border bg-card p-3">
          <h2 className="text-sm font-medium">{clockMethodLabel[method] || method}</h2>
          <p className="text-sm text-muted-foreground">{mine.full_name}</p>
          {method === "simple" ? (
            <Button type="button" onClick={() => punchSimple(mine.id)}>
              Registrar
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Este tipo de registro é feito no aplicativo, com a câmera.</p>
          )}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">O cadastro precisa estar ligado ao acesso para o funcionário marcar o próprio ponto.</p>
      )}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

export function OccurrencesPage() {
  const role = useAuthStore((state) => state.user?.role)
  const isAdmin = role === "admin"
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [kind, setKind] = useState("absence")
  const [listEmployee, setListEmployee] = useState("")
  const [employees, setEmployees] = useState<Employee[]>([])
  const [reasons, setReasons] = useState<NamedRecord[]>([])
  const [employeeId, setEmployeeId] = useState("")
  const [startsOn, setStartsOn] = useState("")
  const [endsOn, setEndsOn] = useState("")
  const [reasonId, setReasonId] = useState("")
  const [note, setNote] = useState("")
  const [draft, setDraft] = useState<TimeOffDraft>(emptyTimeOff)
  const [fileKey, setFileKey] = useState(0)
  const [error, setError] = useState("")
  const manual = manualTimeOffKinds.includes(kind as (typeof manualTimeOffKinds)[number])
  const canLaunch = isAdmin || (role === "manager" && manual)
  const events = usePagedList<Occurrence>("/occurrences", { kind, ...(listEmployee ? { employee_id: Number(listEmployee) } : {}) })

  async function load(nextKind: string) {
    const reasonKind = nextKind === "vacation" || nextKind === "leave" || nextKind === "punch_entry" ? undefined : nextKind
    const [people, motive] = await Promise.all([
      listRecords<Employee>("/employees", { page: 1, limit: 100 }),
      reasonKind ? listRecords<NamedRecord>("/reasons", { page: 1, limit: 100, kind: reasonKind, active: true }) : Promise.resolve({ items: [] as NamedRecord[] }),
    ])
    setEmployees(people.items)
    setReasons(motive.items)
  }

  useEffect(() => {
    let active = true
    load(kind).catch((caught: unknown) => {
      if (active) {
        setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      }
    })
    return () => {
      active = false
    }
  }, [kind, tenantId])

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
      setNote("")
      setDraft(emptyTimeOff())
      setFileKey((current) => current + 1)
      events.reload()
      await load(kind)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Ajustes e Ocorrências</h1>
      <p className="text-sm text-muted-foreground">O gestor e o administrador lançam abono, atestado, afastamento e férias aqui. A origem desse lançamento é manual. O funcionário pede os quatro em Solicitações.</p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(occurrenceKindLabel).map(([value, label]) => (
          <Button key={value} type="button" size="sm" variant={kind === value ? "default" : "outline"} onClick={() => setKind(value)}>
            {label}
          </Button>
        ))}
      </div>
      {canLaunch ? (
        <ActionForm className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={onSubmit}>
          {manual ? <p className="text-sm text-muted-foreground">Origem: manual. Um atestado com marcação no período entra e o ponto avisa o conflito.</p> : null}
          <div className="space-y-2">
            <Label htmlFor="employee">Funcionário</Label>
            <select id="employee" className={fieldClass} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} required>
              <option value="">Selecione</option>
              {employees.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name}
                </option>
              ))}
            </select>
          </div>
          {manual ? (
            <TimeOffFields idPrefix="occurrence" kind={kind} draft={draft} fileKey={fileKey} onChange={setDraft} />
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="start">De</Label>
                <input id="start" className={fieldClass} type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">Até</Label>
                <input id="end" className={fieldClass} type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} />
              </div>
            </>
          )}
          {reasons.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo</Label>
              <select id="reason" className={fieldClass} value={reasonId} onChange={(event) => setReasonId(event.target.value)} required>
                <option value="">Selecione</option>
                {reasons.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="note">Observação</Label>
            <Input id="note" value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
          <Button type="submit">Registrar</Button>
        </ActionForm>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <FilterSelect
        id="occurrence-employee"
        label="Funcionário"
        value={listEmployee}
        options={employees.map((item) => ({ value: String(item.id), label: item.full_name }))}
        onChange={setListEmployee}
      />
      {events.error ? <p className="text-sm text-destructive">{events.error}</p> : null}
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {events.items.map((item) => (
          <li key={item.id} className="px-4 py-3 text-sm">
            {employees.find((person) => person.id === item.employee_id)?.full_name || item.employee_id} · {periodText(item)} · {punchOrigin(item.source)}
            {certificateText(item) ? ` · ${certificateText(item)}` : ""}
            {item.note ? ` · ${item.note}` : ""}
            {item.warning ? ` · ${item.warning}` : ""}
            {item.photo_url ? (
              <>
                {" · "}
                <DocumentLink href={item.photo_url} />
              </>
            ) : null}
          </li>
        ))}
        {events.items.length === 0 ? <ListPlaceholder loading={events.loading} empty="Nenhum lançamento." /> : null}
      </ul>
      <ListPager page={events.page} pageSize={events.pageSize} total={events.total} onPage={events.setPage} onPageSize={events.setPageSize} />
    </div>
  )
}

export function RequestsPage() {
  const role = useAuthStore((state) => state.user?.role)
  const personId = useAuthStore((state) => state.user?.person_id)
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const canDecide = role === "admin" || role === "manager"
  const [status, setStatus] = useState("pending")
  const [listEmployee, setListEmployee] = useState("")
  const [listKind, setListKind] = useState("")
  const [employees, setEmployees] = useState<Employee[]>([])
  const [canRequest, setCanRequest] = useState(false)
  const [error, setError] = useState("")
  const [note, setNote] = useState("")
  const inbox = usePagedList<TimeRequest>("/requests", {
    status,
    ...(listEmployee ? { employee_id: Number(listEmployee) } : {}),
    ...(listKind ? { kind: listKind } : {}),
  })

  async function load() {
    const [people, own] = await Promise.all([
      listRecords<Employee>("/employees", { page: 1, limit: 100 }),
      personId ? listRecords<Employee>("/employees", { page: 1, limit: 1, person_id: personId }) : Promise.resolve(null),
    ])
    setEmployees(people.items)
    const employee = own?.items[0]
    setCanRequest(employee != null && employee.situation !== "dismissed")
  }

  useEffect(() => {
    let active = true
    load().catch((caught: unknown) => {
      if (active) {
        setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      }
    })
    return () => {
      active = false
    }
  }, [tenantId, personId])

  async function decide(id: number, next: "approved" | "rejected") {
    setError("")
    try {
      await updateRecord("/requests", id, { status: next, decision_note: note.trim() || null })
      setNote("")
      inbox.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível decidir.")
    }
  }

  function ownRequest(item: TimeRequest) {
    const employee = employees.find((person) => person.id === item.employee_id)
    return employee?.person_id != null && employee.person_id === personId
  }

  function mayDecide(item: TimeRequest) {
    if (!canDecide || item.status !== "pending") {
      return false
    }
    if (role === "manager" && ownRequest(item)) {
      return false
    }
    return true
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Solicitações</h1>
      <p className="text-sm text-muted-foreground">
        {status === "pending" ? `${inbox.total} pendentes. ` : ""}
        O ajuste traz as marcações do dia. Pendente não altera o ponto. Ao aprovar, as novas valem e as antigas ficam no histórico. O gestor aprova a própria equipe e não decide a própria solicitação. O administrador aprova em qualquer equipe.
      </p>
      {canRequest ? (
        <Button asChild>
          <Link to="/requests/new">Nova solicitação</Link>
        </Button>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {Object.entries(requestStatusLabel).map(([value, label]) => (
          <Button key={value} type="button" size="sm" variant={status === value ? "default" : "outline"} onClick={() => setStatus(value)}>
            {label}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <FilterSelect
          id="request-employee"
          label="Funcionário"
          value={listEmployee}
          options={employees.map((item) => ({ value: String(item.id), label: item.full_name }))}
          onChange={setListEmployee}
        />
        <FilterSelect id="request-kind" label="Tipo" value={listKind} options={Object.entries(requestKindLabel).map(([value, label]) => ({ value, label }))} onChange={setListKind} />
      </div>
      {inbox.items.some((item) => mayDecide(item)) ? (
        <div className="space-y-2">
          <Label htmlFor="decision">Observação da decisão</Label>
          <Input id="decision" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {inbox.error ? <p className="text-sm text-destructive">{inbox.error}</p> : null}
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {inbox.items.map((item) => (
          <li key={item.id} className="space-y-2 px-4 py-3 text-sm">
            <p>
              {employees.find((person) => person.id === item.employee_id)?.full_name || item.employee_id} · {requestKindLabel[item.kind] || item.kind} · {requestStatusLabel[item.status] || item.status}
            </p>
            <p className="text-muted-foreground">
              {item.kind === "adjustment"
                ? `Marcações pedidas: ${(item.punches ?? []).length > 0 ? item.punches.map((value) => showDateTime(value)).join(", ") : "—"}`
                : periodText(item)}
              {certificateText(item) ? ` · ${certificateText(item)}` : ""}
              {item.note ? ` · ${item.note}` : ""}
              {item.photo_url ? " · " : ""}
              <DocumentLink href={item.photo_url} />
            </p>
            {item.status === "pending" ? <p className="text-muted-foreground">{item.kind === "adjustment" ? "Pendente. Não altera as marcações que valem." : "Pendente. Não altera o ponto."}</p> : null}
            {item.status === "approved" ? <p className="text-muted-foreground">Origem: solicitação.</p> : null}
            {role === "manager" && item.status === "pending" && ownRequest(item) ? <p className="text-muted-foreground">Você não decide a própria solicitação.</p> : null}
            <p className="text-muted-foreground">{item.events.map((event) => requestStatusLabel[event.status] || event.status).join(" → ")}</p>
            {mayDecide(item) ? (
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={() => decide(item.id, "approved")}>
                  Aprovar
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => decide(item.id, "rejected")}>
                  Recusar
                </Button>
              </div>
            ) : null}
          </li>
        ))}
        {inbox.items.length === 0 ? <ListPlaceholder loading={inbox.loading} empty="Nenhuma solicitação." /> : null}
      </ul>
      <ListPager page={inbox.page} pageSize={inbox.pageSize} total={inbox.total} onPage={inbox.setPage} onPageSize={inbox.setPageSize} />
    </div>
  )
}

export function ClosingsPage() {
  const role = useAuthStore((state) => state.user?.role)
  const canManage = role === "admin" || role === "manager"
  const [mode, setMode] = useState("month")
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [startsOn, setStartsOn] = useState("")
  const [endsOn, setEndsOn] = useState("")
  const [filterYear, setFilterYear] = useState("")
  const [filterMonth, setFilterMonth] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [reasons, setReasons] = useState<Record<number, string>>({})
  const [reopenId, setReopenId] = useState<number | null>(null)
  const [error, setError] = useState("")
  const periods = usePagedList<Closing>("/closings", {
    ...(/^\d+$/.test(filterYear) ? { year: Number(filterYear) } : {}),
    ...(/^\d+$/.test(filterMonth) ? { month: Number(filterMonth) } : {}),
    ...(filterStatus ? { status: filterStatus } : {}),
  })

  async function closeNewPeriod(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      const body = mode === "range" ? { starts_on: startsOn, ends_on: endsOn || null, note: null } : { year: Number(year), month: Number(month), note: null }
      const created = await createRecord<Closing>("/closings", body)
      try {
        await updateRecord("/closings", created.id, { status: "closed" })
      } catch (caught) {
        periods.reload()
        throw caught
      }
      periods.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível fechar.")
    }
  }

  async function changePeriod(id: number, status: "closed" | "cancelled" | "open") {
    setError("")
    const note = (reasons[id] || "").trim()
    if (status !== "closed" && !note) {
      setError("Informe o motivo.")
      return
    }
    try {
      await updateRecord("/closings", id, { status, note: note || null })
      setReasons((current) => ({ ...current, [id]: "" }))
      setReopenId(null)
      periods.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível atualizar o período.")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Fechamento do Ponto</h1>
      <p className="text-sm text-muted-foreground">
        O gestor ou o administrador fecha o mês, ou um intervalo, num passo. Não fecha se houver solicitação pendente, ponto incompleto ou conflito entre abono ou atestado e marcação. O aviso de intervalo menor não impede. Depois de fechado, marcação, ajuste, ocorrência, vigência e banco ficam bloqueados até reabrir. Cancelar e reabrir exigem motivo.
      </p>
      {canManage ? (
        <ActionForm className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={closeNewPeriod}>
          <div className="space-y-2">
            <Label htmlFor="closing-mode">Período</Label>
            <select id="closing-mode" className={fieldClass} value={mode} onChange={(event) => setMode(event.target.value)}>
              <option value="month">Mês civil</option>
              <option value="range">Intervalo de datas</option>
            </select>
          </div>
          {mode === "month" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="month">Mês</Label>
                <MonthField id="month" value={month} onChange={setMonth} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Ano</Label>
                <Input id="year" inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value)} required />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="closing-start">De</Label>
                <input id="closing-start" className={fieldClass} type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closing-end">Até</Label>
                <input id="closing-end" className={fieldClass} type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} />
              </div>
            </div>
          )}
          <Button type="submit">Fechar período</Button>
        </ActionForm>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="closing-filter-year">Ano</Label>
          <Input id="closing-filter-year" inputMode="numeric" value={filterYear} onChange={(event) => setFilterYear(event.target.value)} />
        </div>
        <FilterSelect id="closing-filter-month" label="Mês" value={filterMonth} options={monthOptions} onChange={setFilterMonth} />
        <FilterSelect id="closing-filter-status" label="Situação" value={filterStatus} options={Object.entries(closingStatusLabel).map(([value, label]) => ({ value, label }))} onChange={setFilterStatus} />
      </div>
      {periods.error ? <p className="text-sm text-destructive">{periods.error}</p> : null}
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {periods.items.map((item) => (
          <li key={item.id} className="space-y-2 px-4 py-3 text-sm">
            <p>
              {showDate(item.starts_on)} a {showDate(item.ends_on)} · {closingStatusLabel[item.status] || item.status}
            </p>
            <p className="text-muted-foreground">
              {item.events.map((event) => `${closingEventLabel[event.kind] || event.kind}${event.note ? ` (${event.note})` : ""}`).join(" → ")}
            </p>
            {canManage && item.status === "open" ? (
              <Button type="button" size="sm" onClick={() => changePeriod(item.id, "closed")}>
                Fechar
              </Button>
            ) : null}
            {canManage && item.status !== "open" ? (
              <div className="grid gap-2">
                {reopenId === item.id ? (
                  <p>O período volta a aberto. Marcação, ajuste, ocorrência, vigência e banco podem ser lançados de novo. O arquivo fiscal deste período deixa de valer.</p>
                ) : null}
                <Label htmlFor={`reason-${item.id}`}>Motivo</Label>
                <Input id={`reason-${item.id}`} value={reasons[item.id] || ""} onChange={(event) => setReasons((current) => ({ ...current, [item.id]: event.target.value }))} />
                <div className="flex flex-wrap gap-2">
                  {reopenId === item.id ? (
                    <>
                      <Button type="button" size="sm" onClick={() => changePeriod(item.id, "open")}>
                        Confirmar
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setReopenId(null)}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      {item.status === "closed" ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => changePeriod(item.id, "cancelled")}>
                          Cancelar
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setError("")
                          setReopenId(item.id)
                        }}
                      >
                        Reabrir
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </li>
        ))}
        {periods.items.length === 0 ? <ListPlaceholder loading={periods.loading} empty="Nenhum fechamento." /> : null}
      </ul>
      <ListPager page={periods.page} pageSize={periods.pageSize} total={periods.total} onPage={periods.setPage} onPageSize={periods.setPageSize} />
    </div>
  )
}

export function OrganizationPage() {
  return (
    <DomainTabs
      title="Estrutura Organizacional"
      lead="Unidades, setores e equipes. A mudança do funcionário preserva vigência."
      tabs={[
        { id: "unidades", label: "Unidades", panel: <CatalogList catalog="units" /> },
        { id: "setores", label: "Setores", panel: <CatalogList catalog="sectors" /> },
        { id: "equipes", label: "Equipes", panel: <CatalogList catalog="teams" /> },
      ]}
    />
  )
}

export function LaborPage() {
  return (
    <DomainTabs
      title="Regras Trabalhistas"
      lead="A apuração usa o feriado. Sindicato e acordo ainda não alteram tolerância, intervalo nem adicional."
      tabs={[
        { id: "sindicatos", label: "Sindicatos", panel: <CatalogList catalog="unions" /> },
        { id: "convencoes", label: "Convenções e acordos", panel: <CatalogList catalog="agreements" /> },
        { id: "feriados", label: "Feriados", panel: <CatalogList catalog="holidays" /> },
        { id: "regras", label: "Regras de ponto", panel: <CatalogList catalog="punch-rules" /> },
      ]}
    />
  )
}

export function ReasonsPage() {
  return (
    <DomainTabs
      title="Motivos"
      lead="Catálogo da empresa. A observação complementar continua possível no lançamento."
      tabs={[
        { id: "ajustes", label: "Ajustes", panel: <CatalogList catalog="reason-adjustment" /> },
        { id: "faltas", label: "Faltas", panel: <CatalogList catalog="reason-absence" /> },
        { id: "abonos", label: "Abonos", panel: <CatalogList catalog="reason-allowance" /> },
        { id: "atestados", label: "Atestados", panel: <CatalogList catalog="reason-certificate" /> },
      ]}
    />
  )
}

export function NotificationsPage() {
  const role = useAuthStore((state) => state.user?.role)
  const canSend = role === "admin" || role === "manager"
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [preferences, setPreferences] = useState<NoticePreference[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [preferenceKind, setPreferenceKind] = useState("")
  const [noticeEmployee, setNoticeEmployee] = useState("")
  const [emailKind, setEmailKind] = useState("")
  const [sent, setSent] = useState<number | null>(null)
  const [error, setError] = useState("")
  const noticeKinds = Object.entries(noticePhrase).map(([value, label]) => ({ value, label }))
  const notices = usePagedList<Notice>("/notifications", noticeEmployee ? { employee_id: Number(noticeEmployee) } : {})
  const emails = usePagedList<NoticeEmail>("/notice-emails", emailKind ? { kind: emailKind } : {})

  async function load() {
    const [prefs, people] = await Promise.all([
      listRecords<NoticePreference>("/notification-preferences", { page: 1, limit: 100 }),
      listRecords<Employee>("/employees", { page: 1, limit: 100 }),
    ])
    setPreferences(prefs.items)
    setEmployees(people.items)
  }

  useEffect(() => {
    let active = true
    load().catch((caught: unknown) => {
      if (active) {
        setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      }
    })
    return () => {
      active = false
    }
  }, [tenantId])

  function enabled(kind: string) {
    const row = preferences.find((item) => item.kind === kind)
    return row ? row.enabled : true
  }

  async function mark(id: number) {
    setError("")
    try {
      await updateRecord("/notifications", id, { read: true })
      notices.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível marcar.")
    }
  }

  async function setEnabled(kind: string, next: boolean) {
    setError("")
    try {
      const row = preferences.find((item) => item.kind === kind)
      if (row) {
        await updateRecord("/notification-preferences", row.id, { enabled: next })
      } else if (!next) {
        await createRecord("/notification-preferences", { kind, enabled: false })
      }
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar o aviso.")
    }
  }

  async function sendDaily() {
    setError("")
    try {
      const result = await createRecord<{ created: number }>("/notification-runs", {})
      setSent(result.created)
      notices.reload()
      emails.reload()
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível enviar.")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-4">
        <BackLink to="/settings" />
        <div>
          <h1 className="text-xl font-semibold">Notificações</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O texto no sistema é o mesmo do e-mail. Cada aviso pode ser desligado. Sem preferência gravada, ele fica ligado. O envio é diário. Fechamento próximo e trial terminando começam 3 dias antes. A frequência customizável fica para depois.
          </p>
        </div>
      </div>
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Avisos</h2>
        <FilterSelect id="preference-kind" label="Tipo" value={preferenceKind} options={noticeKinds} onChange={setPreferenceKind} />
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {Object.entries(noticePhrase)
            .filter(([kind]) => !preferenceKind || kind === preferenceKind)
            .map(([kind, phrase]) => (
            <li key={kind} className="px-4 py-3 text-sm">
              <label className="flex items-start gap-2" htmlFor={`notice-${kind}`}>
                <input id={`notice-${kind}`} type="checkbox" className="mt-1" checked={enabled(kind)} onChange={(event) => void setEnabled(kind, event.target.checked)} />
                <span>{phrase}</span>
              </label>
            </li>
          ))}
        </ul>
        {canSend ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => sendDaily()}>
              Enviar os avisos do dia
            </Button>
            {sent !== null ? <p className="text-sm text-muted-foreground">{sent} avisos enviados.</p> : null}
          </div>
        ) : null}
      </section>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <section className="space-y-3">
        <h2 className="text-sm font-medium">No sistema</h2>
        <FilterSelect
          id="notice-employee"
          label="Funcionário"
          value={noticeEmployee}
          options={employees.map((item) => ({ value: String(item.id), label: item.full_name }))}
          onChange={setNoticeEmployee}
        />
        {notices.error ? <p className="text-sm text-destructive">{notices.error}</p> : null}
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {notices.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
              <span>
                {item.body}
                <span className="mt-1 block text-muted-foreground">{showDateTime(item.created_at)}</span>
              </span>
              {item.read_at ? (
                <span className="text-muted-foreground">Lida</span>
              ) : (
                <Button type="button" size="sm" variant="outline" onClick={() => mark(item.id)}>
                  Marcar lida
                </Button>
              )}
            </li>
          ))}
          {notices.items.length === 0 ? <ListPlaceholder loading={notices.loading} empty="Nenhuma notificação." /> : null}
        </ul>
        <ListPager page={notices.page} pageSize={notices.pageSize} total={notices.total} onPage={notices.setPage} onPageSize={notices.setPageSize} />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-medium">No e-mail</h2>
        <p className="text-sm text-muted-foreground">O e-mail fica gravado com o mesmo texto.</p>
        <FilterSelect id="email-kind" label="Tipo" value={emailKind} options={noticeKinds} onChange={setEmailKind} />
        {emails.error ? <p className="text-sm text-destructive">{emails.error}</p> : null}
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {emails.items.map((item) => (
            <li key={item.id} className="px-4 py-3 text-sm">
              {item.body}
              <span className="mt-1 block text-muted-foreground">
                {item.address || "Sem endereço"} · {showDateTime(item.created_at)}
              </span>
            </li>
          ))}
          {emails.items.length === 0 ? <ListPlaceholder loading={emails.loading} empty="Nenhum e-mail gravado." /> : null}
        </ul>
        <ListPager page={emails.page} pageSize={emails.pageSize} total={emails.total} onPage={emails.setPage} onPageSize={emails.setPageSize} />
      </section>
    </div>
  )
}

function monthStart() {
  return `${punchDay(new Date().toISOString()).slice(0, 8)}01`
}

export function ReportsPage() {
  const role = useAuthStore((state) => state.user?.role)
  const canRead = role === "admin" || role === "manager"
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [catalog, setCatalog] = useState<ReportCatalogItem[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [kind, setKind] = useState("punch")
  const [startsOn, setStartsOn] = useState(monthStart)
  const [endsOn, setEndsOn] = useState(() => punchDay(new Date().toISOString()))
  const [employeeId, setEmployeeId] = useState("")
  const [result, setResult] = useState<Report | null>(null)
  const [query, setQuery] = useState({ kind: "", startsOn: "", endsOn: "", employeeId: "" })
  const [error, setError] = useState("")

  useEffect(() => {
    if (!canRead) {
      return
    }
    let active = true
    Promise.all([
      listRecords<ReportCatalogItem>("/report-catalog", { page: 1, limit: 20 }),
      listRecords<Employee>("/employees", { page: 1, limit: 100 }),
    ])
      .then(([reports, people]) => {
        if (!active) {
          return
        }
        setCatalog(reports.items)
        setEmployees(people.items)
        if (reports.items[0]) {
          setKind(reports.items[0].kind)
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Não foi possível listar os relatórios.")
        }
      })
    return () => {
      active = false
    }
  }, [canRead, tenantId])

  async function openPage(page: number, next = query) {
    setError("")
    try {
      setQuery(next)
      setResult(await getReport(next.kind, next.startsOn, next.endsOn, page, next.employeeId ? Number(next.employeeId) : undefined))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível consultar.")
    }
  }

  async function consult(event: FormEvent) {
    event.preventDefault()
    await openPage(1, { kind, startsOn, endsOn, employeeId })
  }

  async function printReport() {
    setError("")
    const employee = query.employeeId ? Number(query.employeeId) : undefined
    try {
      const first = await getReport(query.kind, query.startsOn, query.endsOn, 1, employee, 100)
      const items = [...first.items]
      const pageCount = Math.max(1, Math.ceil(first.total / first.limit))
      for (let page = 2; page <= pageCount; page += 1) {
        const next = await getReport(query.kind, query.startsOn, query.endsOn, page, employee, 100)
        items.push(...next.items)
      }
      const bytes = reportPdf({
        name: first.name,
        from: showDate(first.starts_on),
        until: showDate(first.ends_on),
        total: first.total,
        items: items.map((item) => ({
          occurredOn: showDate(item.occurred_on),
          title: item.title,
          fullName: item.full_name || "",
          detail: item.detail,
        })),
      })
      const blob = new Blob([bytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${first.kind}-${first.starts_on}-${first.ends_on}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível imprimir.")
    }
  }

  const pages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Relatórios</h1>
      <p className="text-sm text-muted-foreground">
        Um relatório por grupo: Ponto, Jornada, Banco de Horas, Ocorrências e Gestão. A consulta é analítica e histórica, de até 366 dias. Dia futuro não entra no ponto nem no movimento do banco. O dashboard continua operacional. O gestor vê a própria equipe. O fechamento, sem filtro de funcionário, continua da empresa.
      </p>
      {canRead ? (
        <ActionForm className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={consult}>
          <div className="space-y-2">
            <Label htmlFor="report-kind">Tipo de relatório</Label>
            <select id="report-kind" className={fieldClass} value={kind} onChange={(event) => setKind(event.target.value)}>
              {catalog.map((item) => (
                <option key={item.kind} value={item.kind}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="report-start">De</Label>
              <input id="report-start" className={fieldClass} type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-end">Até</Label>
              <input id="report-end" className={fieldClass} type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-employee">Funcionário</Label>
            <select id="report-employee" className={fieldClass} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
              <option value="">Todos</option>
              {employees.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">
            <Search className="h-4 w-4" />
            Consultar
          </Button>
        </ActionForm>
      ) : (
        <p className="text-sm text-muted-foreground">O funcionário não consulta relatório gerencial.</p>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {result ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">
                {result.name} · {showDate(result.starts_on)} a {showDate(result.ends_on)}
              </h2>
              <p className="text-sm text-muted-foreground">
                {result.total === 0 ? "Nenhum registro neste período." : `${result.total} registros encontrados`}
              </p>
            </div>
            <Button type="button" variant="outline" onClick={printReport}>
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
          {result.items.length > 0 ? (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {result.items.map((item, index) => (
                <li key={`${item.occurred_on}-${item.employee_id ?? "empresa"}-${item.title}-${index}`} className="px-4 py-3 text-sm">
                  <p className="font-medium">
                    {showDate(item.occurred_on)} · {item.title}
                    {item.full_name ? ` · ${item.full_name}` : ""}
                  </p>
                  <p className="mt-1 text-muted-foreground">{item.detail}</p>
                </li>
              ))}
            </ul>
          ) : null}
          {result.total > result.limit ? (
            <div className="flex items-center gap-3">
              <Button type="button" size="sm" variant="outline" disabled={result.page <= 1} onClick={() => openPage(result.page - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {result.page} de {pages}
              </span>
              <Button type="button" size="sm" variant="outline" disabled={result.page >= pages} onClick={() => openPage(result.page + 1)}>
                Próxima
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

function downloadFiscalFile(file: FiscalFile) {
  const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${file.kind}-${file.starts_on}-${file.ends_on}.txt`
  link.click()
  URL.revokeObjectURL(url)
}

const fiscalFileKinds = [
  ["afd", "AFD"],
  ["aej", "AEJ"],
] as const

function readTextFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "")
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."))
    reader.readAsText(file)
  })
}

export function PayrollPage() {
  return (
    <DomainTabs
      title="Fiscal / Folha"
      lead="Arquivos fiscais e os totais do mês. Se o período for cancelado ou reaberto, o arquivo deixa de valer e precisa ser gerado de novo."
      tabs={[
        { id: "afd", label: "AFD", panel: <AfdPanel /> },
        { id: "folha", label: "Totais da folha", panel: <PayrollTotalsPanel /> },
      ]}
    />
  )
}

function AfdPanel() {
  const role = useAuthStore((state) => state.user?.role)
  const canManage = role === "admin" || role === "manager"
  const [kind, setKind] = useState("afd")
  const [mode, setMode] = useState("month")
  const [fileYear, setFileYear] = useState(String(new Date().getFullYear()))
  const [fileMonth, setFileMonth] = useState(String(new Date().getMonth() + 1))
  const [startsOn, setStartsOn] = useState("")
  const [endsOn, setEndsOn] = useState("")
  const [filterKind, setFilterKind] = useState("")
  const [filterValid, setFilterValid] = useState("")
  const [afdFile, setAfdFile] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState(0)
  const [imported, setImported] = useState<FiscalImport | null>(null)
  const [error, setError] = useState("")
  const files = usePagedList<FiscalFile>(
    "/fiscal-files",
    {
      ...(filterKind ? { kind: filterKind } : {}),
      ...(filterValid ? { valid: filterValid === "true" } : {}),
    },
    canManage,
  )

  async function generateFile(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      const body = mode === "range" ? { kind, starts_on: startsOn, ends_on: endsOn || null } : { kind, year: Number(fileYear), month: Number(fileMonth) }
      await createRecord<FiscalFile>("/fiscal-files", body)
      files.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível gerar o arquivo.")
    }
  }

  async function importAfd(event: FormEvent) {
    event.preventDefault()
    setError("")
    if (!afdFile || !afdFile.name.toLowerCase().endsWith(".txt")) {
      setError("Selecione um arquivo .txt.")
      return
    }
    try {
      const content = (await readTextFile(afdFile)).trim()
      if (!content) {
        setError("O arquivo está vazio.")
        return
      }
      const outcome = await createRecord<FiscalImport>("/fiscal-files/imports", { content })
      setImported(outcome)
      setAfdFile(null)
      setFileKey((current) => current + 1)
      files.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível importar.")
    }
  }

  if (!canManage) {
    return <p className="text-sm text-muted-foreground">Gerar, importar e baixar o arquivo fica com o administrador e o gestor.</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">O AFD sai de qualquer período. O AEJ sai só de um período fechado, com o mesmo início e o mesmo fim.</p>
      <ActionForm className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={generateFile}>
        <div className="space-y-2">
          <Label htmlFor="file-kind">Tipo de arquivo</Label>
          <select id="file-kind" className={fieldClass} value={kind} onChange={(event) => setKind(event.target.value)}>
            {fiscalFileKinds.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {kind === "afd" ? <p className="text-sm text-muted-foreground">Arquivo com as marcações. Sai de qualquer período.</p> : null}
          {kind === "aej" ? <p className="text-sm text-muted-foreground">Arquivo da jornada. Sai só de um período fechado.</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="file-mode">Período</Label>
          <select id="file-mode" className={fieldClass} value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="month">Mês civil</option>
            <option value="range">Intervalo de datas</option>
          </select>
        </div>
        {mode === "month" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="file-month">Mês</Label>
              <MonthField id="file-month" value={fileMonth} onChange={setFileMonth} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file-year">Ano</Label>
              <Input id="file-year" inputMode="numeric" value={fileYear} onChange={(event) => setFileYear(event.target.value)} required />
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="file-start">De</Label>
              <input id="file-start" className={fieldClass} type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file-end">Até</Label>
              <input id="file-end" className={fieldClass} type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} />
            </div>
          </div>
        )}
        <Button type="submit">
          <FilePlus className="h-4 w-4" />
          {kind === "aej" ? "Gerar AEJ" : "Gerar AFD"}
        </Button>
      </ActionForm>
      <ActionForm className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={importAfd}>
        <h2 className="text-sm font-medium">Importar AFD</h2>
        <p className="text-sm text-muted-foreground">A marcação entra com origem AFD. Se já existir no mesmo instante, só ela é ignorada e as demais seguem.</p>
        <div className="space-y-2">
          <Label htmlFor="afd-file">Arquivo .txt</Label>
          <input
            key={fileKey}
            id="afd-file"
            className={fieldClass}
            type="file"
            accept=".txt,text/plain"
            required
            onChange={(event) => setAfdFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <Button type="submit">
          <Upload className="h-4 w-4" />
          Importar
        </Button>
      </ActionForm>
      {imported ? (
        <p className="text-sm text-muted-foreground">
          {imported.created} criadas, {imported.ignored} já existiam e foram ignoradas, {imported.blocked} não entraram.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <FilterSelect id="fiscal-kind" label="Tipo" value={filterKind} options={Object.entries(fiscalKindLabel).map(([value, label]) => ({ value, label }))} onChange={setFilterKind} />
        <FilterSelect
          id="fiscal-valid"
          label="Validade"
          value={filterValid}
          options={[
            { value: "true", label: "Vale" },
            { value: "false", label: "Não vale" },
          ]}
          onChange={setFilterValid}
        />
      </div>
      {files.error ? <p className="text-sm text-destructive">{files.error}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {files.items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>
              {fiscalKindLabel[item.kind] || item.kind} · {showDate(item.starts_on)} a {showDate(item.ends_on)} · {item.valid ? "Vale" : "Não vale. Gere de novo."}
            </span>
            <Button type="button" size="sm" variant="outline" onClick={() => downloadFiscalFile(item)}>
              Baixar
            </Button>
          </li>
        ))}
        {files.items.length === 0 ? <ListPlaceholder loading={files.loading} empty="Nenhum arquivo gerado." /> : null}
      </ul>
      <ListPager page={files.page} pageSize={files.pageSize} total={files.total} onPage={files.setPage} onPageSize={files.setPageSize} />
    </div>
  )
}

function PayrollTotalsPanel() {
  const role = useAuthStore((state) => state.user?.role)
  const canManage = role === "admin" || role === "manager"
  const isAdmin = role === "admin"
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [result, setResult] = useState<Payroll | null>(null)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!isAdmin) {
      await generatePayroll()
      return
    }
    setError("")
    setNotice("")
    try {
      setResult(await getPayroll(Number(year), Number(month)))
    } catch (caught) {
      setResult(null)
      setError(caught instanceof Error ? caught.message : "Não foi possível consultar.")
    }
  }

  async function generatePayroll() {
    setError("")
    setNotice("")
    try {
      await createRecord<FiscalFile>("/fiscal-files", { kind: "payroll", year: Number(year), month: Number(month) })
      setNotice("Arquivo gerado. Ele aparece na opção AFD.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível gerar o arquivo.")
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">A folha traz horas trabalhadas, hora extra, adicional noturno, falta de tempo e saldo do banco.</p>
      {canManage ? (
        <ActionForm className="flex flex-wrap items-end gap-3" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="month">Mês</Label>
            <MonthField id="month" value={month} onChange={setMonth} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Ano</Label>
            <Input id="year" value={year} onChange={(event) => setYear(event.target.value)} required />
          </div>
          {isAdmin ? (
            <Button type="submit">
              <Search className="h-4 w-4" />
              Consultar totais
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => void generatePayroll()}>
            <FilePlus className="h-4 w-4" />
            Gerar arquivo
          </Button>
        </ActionForm>
      ) : (
        <p className="text-sm text-muted-foreground">Consultar os totais fica com o administrador.</p>
      )}
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {result ? (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {result.items.map((item) => (
            <li key={item.employee_id} className="space-y-1 px-4 py-3 text-sm">
              <p className="font-medium">{item.full_name}</p>
              <p className="text-muted-foreground">
                Trabalhado {showMinutes(item.worked_minutes)} · Hora extra {showMinutes(item.overtime_minutes)} · Adicional noturno {showMinutes(item.night_additional_minutes)} · Falta de tempo {showMinutes(item.shortage_minutes)} · Banco {showSignedMinutes(item.balance_minutes)}
              </p>
            </li>
          ))}
          {result.items.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhum funcionário.</li> : null}
        </ul>
      ) : null}
    </div>
  )
}
