import { FormEvent, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CatalogPanel, fieldClass, optionsOf } from "@/components/workforce/CatalogPanel"
import { DayTimesFields, momentsOf } from "@/components/workforce/PunchDay"
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
import {
  closingEventLabel,
  closingStatusLabel,
  fiscalKindLabel,
  noticePhrase,
  occurrenceKindLabel,
  reasonKindLabel,
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

export function TimeClockPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Registro de Ponto</h1>
      <p className="text-sm text-muted-foreground">O app registra a marcação do próprio funcionário quando o cadastro está ligado ao acesso.</p>
      <section className="rounded-md border border-border bg-card px-4 py-3 text-sm">
        <h2 className="font-medium">Registro simples, QR Code e reconhecimento facial</h2>
        <p className="mt-1 text-muted-foreground">O comportamento dessas modalidades ainda não foi definido. As marcações já feitas ficam em Jornada e Ponto.</p>
      </section>
    </div>
  )
}

export function OccurrencesPage() {
  const role = useAuthStore((state) => state.user?.role)
  const isAdmin = role === "admin"
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [kind, setKind] = useState("absence")
  const [items, setItems] = useState<Occurrence[]>([])
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

  async function load(nextKind: string) {
    const reasonKind = nextKind === "vacation" || nextKind === "leave" || nextKind === "punch_entry" ? undefined : nextKind
    const [events, people, motive] = await Promise.all([
      listRecords<Occurrence>("/occurrences", { page: 1, limit: 100, kind: nextKind }),
      listRecords<Employee>("/employees", { page: 1, limit: 100 }),
      reasonKind ? listRecords<NamedRecord>("/reasons", { page: 1, limit: 100, kind: reasonKind, active: true }) : Promise.resolve({ items: [] as NamedRecord[] }),
    ])
    setItems(events.items)
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
        <form className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={onSubmit}>
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
                <Label htmlFor="start">Início</Label>
                <input id="start" className={fieldClass} type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">Fim</Label>
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
        </form>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {items.map((item) => (
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
        {items.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhum lançamento.</li> : null}
      </ul>
    </div>
  )
}

export function RequestsPage() {
  const role = useAuthStore((state) => state.user?.role)
  const personId = useAuthStore((state) => state.user?.person_id)
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const canDecide = role === "admin" || role === "manager"
  const [status, setStatus] = useState("pending")
  const [items, setItems] = useState<TimeRequest[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [reasons, setReasons] = useState<NamedRecord[]>([])
  const [error, setError] = useState("")
  const [note, setNote] = useState("")
  const [day, setDay] = useState("")
  const [times, setTimes] = useState(["", ""])
  const [requestNote, setRequestNote] = useState("")
  const [reasonId, setReasonId] = useState("")
  const [offKind, setOffKind] = useState<(typeof manualTimeOffKinds)[number]>("allowance")
  const [offDraft, setOffDraft] = useState<TimeOffDraft>(emptyTimeOff)
  const [offFileKey, setOffFileKey] = useState(0)
  const [offNote, setOffNote] = useState("")
  const [offReasonId, setOffReasonId] = useState("")
  const [offReasons, setOffReasons] = useState<NamedRecord[]>([])

  async function load(next: string) {
    const [inbox, people, motive] = await Promise.all([
      listRecords<TimeRequest>("/requests", { page: 1, limit: 100, status: next }),
      listRecords<Employee>("/employees", { page: 1, limit: 100 }),
      listRecords<NamedRecord>("/reasons", { page: 1, limit: 100, kind: "adjustment", active: true }),
    ])
    setItems(inbox.items)
    setEmployees(people.items)
    setReasons(motive.items)
  }

  useEffect(() => {
    let active = true
    load(status).catch((caught: unknown) => {
      if (active) {
        setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      }
    })
    return () => {
      active = false
    }
  }, [status, tenantId])

  useEffect(() => {
    const reasonKind = offKind === "allowance" || offKind === "certificate" ? offKind : ""
    if (!reasonKind) {
      setOffReasons([])
      setOffReasonId("")
      return
    }
    listRecords<NamedRecord>("/reasons", { page: 1, limit: 100, kind: reasonKind, active: true })
      .then((page) => setOffReasons(page.items))
      .catch(() => setOffReasons([]))
  }, [offKind, tenantId])

  async function decide(id: number, next: "approved" | "rejected") {
    setError("")
    try {
      await updateRecord("/requests", id, { status: next, decision_note: note.trim() || null })
      setNote("")
      await load(status)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível decidir.")
    }
  }

  async function requestAdjustment(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      await createRecord("/requests", {
        kind: "adjustment",
        punches: momentsOf(day, times),
        note: requestNote.trim() || null,
        reason_id: reasonId ? Number(reasonId) : null,
      })
      setTimes(["", ""])
      setRequestNote("")
      setStatus("pending")
      await load("pending")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível solicitar.")
    }
  }

  async function requestTimeOff(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      const body = timeOffBody(offDraft, offKind)
      if (offKind === "certificate" && offDraft.photo) {
        body.photo_key = (await uploadCertificatePhoto(offDraft.photo)).key
      }
      await createRecord("/requests", {
        kind: offKind,
        ...body,
        note: offNote.trim() || null,
        reason_id: offReasonId ? Number(offReasonId) : null,
      })
      setOffDraft(emptyTimeOff())
      setOffFileKey((current) => current + 1)
      setOffNote("")
      setStatus("pending")
      await load("pending")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível solicitar.")
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

  const pending = items.filter((item) => item.status === "pending")
  const counts = {
    adjustment: pending.filter((item) => item.kind === "adjustment").length,
    allowance: pending.filter((item) => item.kind === "allowance").length,
    certificate: pending.filter((item) => item.kind === "certificate").length,
    leave: pending.filter((item) => item.kind === "leave").length,
    vacation: pending.filter((item) => item.kind === "vacation").length,
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Solicitações</h1>
      <p className="text-sm text-muted-foreground">
        {status === "pending" ? `${items.length} pendentes · ${counts.adjustment} ajustes · ${counts.allowance} abonos · ${counts.certificate} atestados · ${counts.leave} afastamentos · ${counts.vacation} férias. ` : ""}
        O ajuste traz as marcações do dia. Pendente não altera o ponto. Ao aprovar, as novas valem e as antigas ficam no histórico. O gestor aprova a própria equipe e não decide a própria solicitação. O administrador aprova em qualquer equipe.
      </p>
      <form className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={requestAdjustment}>
        <h2 className="text-sm font-medium">Solicitar ajuste</h2>
        <p className="text-sm text-muted-foreground">Informe todas as marcações que devem valer naquele dia. A origem, depois da aprovação, é solicitação.</p>
        <DayTimesFields dayId="request-day" day={day} times={times} onDay={setDay} onTimes={setTimes} />
        {reasons.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="request-reason">Motivo</Label>
            <select id="request-reason" className={fieldClass} value={reasonId} onChange={(event) => setReasonId(event.target.value)} required>
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
          <Label htmlFor="request-note">Observação</Label>
          <Input id="request-note" value={requestNote} onChange={(event) => setRequestNote(event.target.value)} />
        </div>
        <Button type="submit">Enviar ajuste</Button>
      </form>
      <form className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={requestTimeOff}>
        <h2 className="text-sm font-medium">Solicitar abono, atestado, afastamento ou férias</h2>
        <p className="text-sm text-muted-foreground">Pendente não altera o ponto. Depois da aprovação, a origem é solicitação. O atestado pede CID, CRM e o nome do médico. A foto é opcional.</p>
        <div className="space-y-2">
          <Label htmlFor="off-kind">Tipo</Label>
          <select id="off-kind" className={fieldClass} value={offKind} onChange={(event) => setOffKind(event.target.value as (typeof manualTimeOffKinds)[number])}>
            {manualTimeOffKinds.map((value) => (
              <option key={value} value={value}>
                {requestKindLabel[value]}
              </option>
            ))}
          </select>
        </div>
        <TimeOffFields idPrefix="request-off" kind={offKind} draft={offDraft} fileKey={offFileKey} onChange={setOffDraft} />
        {offReasons.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="off-reason">Motivo</Label>
            <select id="off-reason" className={fieldClass} value={offReasonId} onChange={(event) => setOffReasonId(event.target.value)} required>
              <option value="">Selecione</option>
              {offReasons.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="off-note">Observação</Label>
          <Input id="off-note" value={offNote} onChange={(event) => setOffNote(event.target.value)} />
        </div>
        <Button type="submit">Enviar solicitação</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {Object.entries(requestStatusLabel).map(([value, label]) => (
          <Button key={value} type="button" size="sm" variant={status === value ? "default" : "outline"} onClick={() => setStatus(value)}>
            {label}
          </Button>
        ))}
      </div>
      {items.some((item) => mayDecide(item)) ? (
        <div className="space-y-2">
          <Label htmlFor="decision">Observação da decisão</Label>
          <Input id="decision" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {items.map((item) => (
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
                <Button type="button" size="sm" onClick={() => void decide(item.id, "approved")}>
                  Aprovar
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => void decide(item.id, "rejected")}>
                  Recusar
                </Button>
              </div>
            ) : null}
          </li>
        ))}
        {items.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhuma solicitação.</li> : null}
      </ul>
    </div>
  )
}

export function ClosingsPage() {
  const role = useAuthStore((state) => state.user?.role)
  const canManage = role === "admin" || role === "manager"
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [items, setItems] = useState<Closing[]>([])
  const [mode, setMode] = useState("month")
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [startsOn, setStartsOn] = useState("")
  const [endsOn, setEndsOn] = useState("")
  const [reasons, setReasons] = useState<Record<number, string>>({})
  const [error, setError] = useState("")

  async function load() {
    const page = await listRecords<Closing>("/closings", { page: 1, limit: 100 })
    setItems(page.items)
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

  async function closeNewPeriod(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      const body = mode === "range" ? { starts_on: startsOn, ends_on: endsOn || null, note: null } : { year: Number(year), month: Number(month), note: null }
      const created = await createRecord<Closing>("/closings", body)
      try {
        await updateRecord("/closings", created.id, { status: "closed" })
      } catch (caught) {
        await load()
        throw caught
      }
      await load()
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
      await load()
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
        <form className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={closeNewPeriod}>
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
                <Input id="month" inputMode="numeric" value={month} onChange={(event) => setMonth(event.target.value)} required />
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
        </form>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {items.map((item) => (
          <li key={item.id} className="space-y-2 px-4 py-3 text-sm">
            <p>
              {showDate(item.starts_on)} a {showDate(item.ends_on)} · {closingStatusLabel[item.status] || item.status}
            </p>
            <p className="text-muted-foreground">
              {item.events.map((event) => `${closingEventLabel[event.kind] || event.kind}${event.note ? ` (${event.note})` : ""}`).join(" → ")}
            </p>
            {canManage && item.status === "open" ? (
              <Button type="button" size="sm" onClick={() => void changePeriod(item.id, "closed")}>
                Fechar
              </Button>
            ) : null}
            {canManage && item.status !== "open" ? (
              <div className="grid gap-2">
                <Label htmlFor={`reason-${item.id}`}>Motivo</Label>
                <Input id={`reason-${item.id}`} value={reasons[item.id] || ""} onChange={(event) => setReasons((current) => ({ ...current, [item.id]: event.target.value }))} />
                <div className="flex flex-wrap gap-2">
                  {item.status === "closed" ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => void changePeriod(item.id, "cancelled")}>
                      Cancelar
                    </Button>
                  ) : null}
                  <Button type="button" size="sm" variant="outline" onClick={() => void changePeriod(item.id, "open")}>
                    Reabrir
                  </Button>
                </div>
              </div>
            ) : null}
          </li>
        ))}
        {items.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhum fechamento.</li> : null}
      </ul>
    </div>
  )
}

export function OrganizationPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Estrutura Organizacional</h1>
        <p className="mt-2 text-sm text-muted-foreground">Unidades, setores e equipes. A mudança do funcionário preserva vigência.</p>
      </div>
      <CatalogPanel title="Unidades" hint="Nenhuma unidade até o primeiro cadastro." path="/units" columns={[{ key: "name", label: "Nome" }]} fields={[{ name: "name", label: "Nome", type: "text", required: true }]} />
      <CatalogPanel
        title="Setores"
        hint="O setor pertence a uma unidade."
        path="/sectors"
        columns={[
          { key: "name", label: "Nome" },
          { key: "unit_id", label: "Unidade" },
        ]}
        fields={[
          { name: "name", label: "Nome", type: "text", required: true },
          { name: "unit_id", label: "Unidade", type: "select", required: true, loadOptions: () => optionsOf("/units") },
        ]}
      />
      <CatalogPanel
        title="Equipes"
        hint="A equipe pertence a um setor."
        path="/teams"
        columns={[
          { key: "name", label: "Nome" },
          { key: "sector_id", label: "Setor" },
        ]}
        fields={[
          { name: "name", label: "Nome", type: "text", required: true },
          { name: "sector_id", label: "Setor", type: "select", required: true, loadOptions: () => optionsOf("/sectors") },
        ]}
      />
    </div>
  )
}

export function LaborPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Regras Trabalhistas</h1>
        <p className="mt-2 text-sm text-muted-foreground">A apuração usa o feriado. Sindicato e acordo ainda não alteram tolerância, intervalo nem adicional.</p>
      </div>
      <CatalogPanel title="Sindicatos" hint="O vínculo do funcionário fica na vigência." path="/unions" columns={[{ key: "name", label: "Nome" }]} fields={[{ name: "name", label: "Nome", type: "text", required: true }]} />
      <CatalogPanel
        title="Convenções e acordos"
        hint="Período de validade do acordo. Sem regra de cálculo."
        path="/labor-agreements"
        columns={[{ key: "name", label: "Nome" }]}
        fields={[
          { name: "name", label: "Nome", type: "text", required: true },
          { name: "union_id", label: "Sindicato", type: "select", loadOptions: () => optionsOf("/unions") },
          { name: "valid_from", label: "Início", type: "date", required: true },
          { name: "valid_to", label: "Fim", type: "date" },
          { name: "note", label: "Observação", type: "textarea" },
        ]}
      />
      <CatalogPanel
        title="Feriados"
        hint="Data da empresa."
        path="/holidays"
        columns={[
          { key: "name", label: "Nome" },
          { key: "holiday_date", label: "Data" },
        ]}
        fields={[
          { name: "name", label: "Nome", type: "text", required: true },
          { name: "holiday_date", label: "Data", type: "date", required: true },
          { name: "note", label: "Observação", type: "textarea" },
        ]}
      />
      <CatalogPanel
        title="Regras de ponto"
        hint="Somente o nome e a observação. Tolerância e adicionais não são gravados aqui."
        path="/punch-rules"
        columns={[{ key: "name", label: "Nome" }]}
        fields={[
          { name: "name", label: "Nome", type: "text", required: true },
          { name: "note", label: "Observação", type: "textarea" },
        ]}
      />
    </div>
  )
}

export function ReasonsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Motivos</h1>
      <p className="text-sm text-muted-foreground">Catálogo da empresa. A observação complementar continua possível no lançamento.</p>
      <CatalogPanel
        title="Catálogo"
        hint="Ajustes, faltas, abonos e atestados."
        path="/reasons"
        columns={[
          { key: "name", label: "Nome" },
          { key: "kind", label: "Tipo" },
          { key: "active", label: "Situação" },
        ]}
        fields={[
          { name: "name", label: "Nome", type: "text", required: true },
          {
            name: "kind",
            label: "Tipo",
            type: "select",
            required: true,
            options: Object.entries(reasonKindLabel).map(([value, label]) => ({ value, label })),
          },
          { name: "active", label: "Situação", type: "checkbox" },
        ]}
      />
    </div>
  )
}

export function NotificationsPage() {
  const role = useAuthStore((state) => state.user?.role)
  const canSend = role === "admin" || role === "manager"
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [items, setItems] = useState<Notice[]>([])
  const [preferences, setPreferences] = useState<NoticePreference[]>([])
  const [emails, setEmails] = useState<NoticeEmail[]>([])
  const [sent, setSent] = useState<number | null>(null)
  const [error, setError] = useState("")

  async function load() {
    const [notices, prefs, mailed] = await Promise.all([
      listRecords<Notice>("/notifications", { page: 1, limit: 100 }),
      listRecords<NoticePreference>("/notification-preferences", { page: 1, limit: 100 }),
      listRecords<NoticeEmail>("/notice-emails", { page: 1, limit: 100 }),
    ])
    setItems(notices.items)
    setPreferences(prefs.items)
    setEmails(mailed.items)
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
      await load()
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
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível enviar.")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Notificações</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O texto no sistema é o mesmo do e-mail. Cada aviso pode ser desligado. Sem preferência gravada, ele fica ligado. O envio é diário. Fechamento próximo e trial terminando começam 3 dias antes. A frequência customizável fica para depois.
        </p>
      </div>
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Avisos</h2>
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {Object.entries(noticePhrase).map(([kind, phrase]) => (
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
            <Button type="button" onClick={() => void sendDaily()}>
              Enviar os avisos do dia
            </Button>
            {sent !== null ? <p className="text-sm text-muted-foreground">{sent} avisos enviados.</p> : null}
          </div>
        ) : null}
      </section>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <section className="space-y-3">
        <h2 className="text-sm font-medium">No sistema</h2>
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
              <span>
                {item.body}
                <span className="mt-1 block text-muted-foreground">{showDateTime(item.created_at)}</span>
              </span>
              {item.read_at ? (
                <span className="text-muted-foreground">Lida</span>
              ) : (
                <Button type="button" size="sm" variant="outline" onClick={() => void mark(item.id)}>
                  Marcar lida
                </Button>
              )}
            </li>
          ))}
          {items.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhuma notificação.</li> : null}
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-medium">No e-mail</h2>
        <p className="text-sm text-muted-foreground">O e-mail fica gravado com o mesmo texto.</p>
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {emails.map((item) => (
            <li key={item.id} className="px-4 py-3 text-sm">
              {item.body}
              <span className="mt-1 block text-muted-foreground">
                {item.address || "Sem endereço"} · {showDateTime(item.created_at)}
              </span>
            </li>
          ))}
          {emails.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhum e-mail gravado.</li> : null}
        </ul>
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

  const pages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Relatórios</h1>
      <p className="text-sm text-muted-foreground">
        Um relatório por grupo: Ponto, Jornada, Banco de Horas, Ocorrências e Gestão. A consulta é analítica e histórica, de até 366 dias. Dia futuro não entra no ponto nem no movimento do banco. O dashboard continua operacional. O gestor vê a própria equipe. O fechamento, sem filtro de funcionário, continua da empresa.
      </p>
      {canRead ? (
        <form className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={consult}>
          <div className="space-y-2">
            <Label htmlFor="report-kind">Relatório</Label>
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
          <Button type="submit">Consultar</Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">O funcionário não consulta relatório gerencial.</p>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {result ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">
            {result.name} · {showDate(result.starts_on)} a {showDate(result.ends_on)} · {result.total} linhas
          </h2>
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
            {result.items.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhuma linha neste período.</li> : null}
          </ul>
          {result.total > result.limit ? (
            <div className="flex items-center gap-3">
              <Button type="button" size="sm" variant="outline" disabled={result.page <= 1} onClick={() => void openPage(result.page - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {result.page} de {pages}
              </span>
              <Button type="button" size="sm" variant="outline" disabled={result.page >= pages} onClick={() => void openPage(result.page + 1)}>
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

export function PayrollPage() {
  const role = useAuthStore((state) => state.user?.role)
  const canManage = role === "admin" || role === "manager"
  const isAdmin = role === "admin"
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [result, setResult] = useState<Payroll | null>(null)
  const [kind, setKind] = useState("afd")
  const [mode, setMode] = useState("month")
  const [fileYear, setFileYear] = useState(String(new Date().getFullYear()))
  const [fileMonth, setFileMonth] = useState(String(new Date().getMonth() + 1))
  const [startsOn, setStartsOn] = useState("")
  const [endsOn, setEndsOn] = useState("")
  const [files, setFiles] = useState<FiscalFile[]>([])
  const [importText, setImportText] = useState("")
  const [imported, setImported] = useState<FiscalImport | null>(null)
  const [error, setError] = useState("")

  async function loadFiles() {
    const page = await listRecords<FiscalFile>("/fiscal-files", { page: 1, limit: 100 })
    setFiles(page.items)
  }

  useEffect(() => {
    if (!canManage) {
      return
    }
    let active = true
    loadFiles().catch((caught: unknown) => {
      if (active) {
        setError(caught instanceof Error ? caught.message : "Não foi possível listar os arquivos.")
      }
    })
    return () => {
      active = false
    }
  }, [canManage, tenantId])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      setResult(await getPayroll(Number(year), Number(month)))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível consultar.")
    }
  }

  async function generateFile(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      const body = mode === "range" ? { kind, starts_on: startsOn, ends_on: endsOn || null } : { kind, year: Number(fileYear), month: Number(fileMonth) }
      await createRecord<FiscalFile>("/fiscal-files", body)
      await loadFiles()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível gerar o arquivo.")
    }
  }

  async function importAfd(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      const outcome = await createRecord<FiscalImport>("/fiscal-files/imports", { content: importText })
      setImported(outcome)
      setImportText("")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível importar.")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Fiscal / Folha</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O AFD sai de qualquer período. O AEJ sai só de um período fechado, com o mesmo início e o mesmo fim. A folha traz horas trabalhadas, hora extra, adicional noturno, falta de tempo e saldo do banco. Se o período for cancelado ou reaberto, o arquivo deixa de valer e precisa ser gerado de novo.
        </p>
      </div>
      {canManage ? (
        <section className="space-y-4">
          <h2 className="text-sm font-medium">Gerar arquivo</h2>
          <form className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={generateFile}>
            <div className="space-y-2">
              <Label htmlFor="file-kind">Tipo</Label>
              <select id="file-kind" className={fieldClass} value={kind} onChange={(event) => setKind(event.target.value)}>
                {Object.entries(fiscalKindLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
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
                  <Input id="file-month" inputMode="numeric" value={fileMonth} onChange={(event) => setFileMonth(event.target.value)} required />
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
            <Button type="submit">Gerar</Button>
          </form>
          <form className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={importAfd}>
            <h2 className="text-sm font-medium">Importar AFD</h2>
            <p className="text-sm text-muted-foreground">A marcação entra com origem AFD. Se já existir no mesmo instante, só ela é ignorada e as demais seguem.</p>
            <div className="space-y-2">
              <Label htmlFor="afd-text">Conteúdo</Label>
              <textarea id="afd-text" className="min-h-28 w-full rounded-md border border-border bg-card px-3 py-2 text-sm" value={importText} onChange={(event) => setImportText(event.target.value)} required />
            </div>
            <Button type="submit">Importar</Button>
          </form>
          {imported ? (
            <p className="text-sm text-muted-foreground">
              {imported.created} criadas, {imported.ignored} já existiam e foram ignoradas, {imported.blocked} não entraram.
            </p>
          ) : null}
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {files.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  {fiscalKindLabel[item.kind] || item.kind} · {showDate(item.starts_on)} a {showDate(item.ends_on)} · {item.valid ? "Vale" : "Não vale. Gere de novo."}
                </span>
                <Button type="button" size="sm" variant="outline" onClick={() => downloadFiscalFile(item)}>
                  Baixar
                </Button>
              </li>
            ))}
            {files.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhum arquivo gerado.</li> : null}
          </ul>
        </section>
      ) : null}
      {isAdmin ? (
        <section className="space-y-4">
          <h2 className="text-sm font-medium">Totais da folha</h2>
          <form className="flex flex-wrap items-end gap-3" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="month">Mês</Label>
              <Input id="month" value={month} onChange={(event) => setMonth(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Ano</Label>
              <Input id="year" value={year} onChange={(event) => setYear(event.target.value)} required />
            </div>
            <Button type="submit">Consultar totais</Button>
          </form>
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
        </section>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
