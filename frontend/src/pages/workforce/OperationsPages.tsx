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
  listRecords,
  updateRecord,
  uploadCertificatePhoto,
  type Closing,
  type Employee,
  type NamedRecord,
  type Notice,
  type Occurrence,
  type Payroll,
  type TimeRequest,
} from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import {
  closingStatusLabel,
  occurrenceKindLabel,
  reasonKindLabel,
  certificateText,
  manualTimeOffKinds,
  periodText,
  punchOrigin,
  requestKindLabel,
  requestStatusLabel,
  showDateTime,
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
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin"
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [items, setItems] = useState<Closing[]>([])
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
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

  async function openPeriod(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      await createRecord("/closings", { year: Number(year), month: Number(month), note: null })
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível abrir.")
    }
  }

  async function closePeriod(id: number) {
    setError("")
    try {
      await updateRecord("/closings", id, { status: "closed" })
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível fechar.")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Fechamento do Ponto</h1>
      <p className="text-sm text-muted-foreground">Depois de fechado, o período não recebe alteração silenciosa. Reabertura ainda não foi definida.</p>
      {isAdmin ? (
        <form className="flex flex-wrap items-end gap-3" onSubmit={openPeriod}>
          <div className="space-y-2">
            <Label htmlFor="month">Mês</Label>
            <Input id="month" value={month} onChange={(event) => setMonth(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Ano</Label>
            <Input id="year" value={year} onChange={(event) => setYear(event.target.value)} required />
          </div>
          <Button type="submit">Abrir período</Button>
        </form>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {items.map((item) => (
          <li key={item.id} className="space-y-2 px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span>
                {String(item.month).padStart(2, "0")}/{item.year} · {closingStatusLabel[item.status] || item.status}
              </span>
              {isAdmin && item.status === "open" ? (
                <Button type="button" size="sm" onClick={() => void closePeriod(item.id)}>
                  Fechar
                </Button>
              ) : null}
            </div>
            <p className="text-muted-foreground">{item.events.map((event) => (event.kind === "closed" ? "Fechado" : "Iniciado")).join(" → ")}</p>
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
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [items, setItems] = useState<Notice[]>([])
  const [error, setError] = useState("")

  async function load() {
    const page = await listRecords<Notice>("/notifications", { page: 1, limit: 100 })
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

  async function mark(id: number) {
    setError("")
    try {
      await updateRecord("/notifications", id, { read: true })
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível marcar.")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Notificações</h1>
      <p className="text-sm text-muted-foreground">Eventos deste sistema. Canal, frequência e modelo de mensagem ainda não foram definidos.</p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
            <span>
              <span className="font-medium">{item.title}</span>
              <span className="mt-1 block text-muted-foreground">
                {item.body} · {showDateTime(item.created_at)}
              </span>
            </span>
            {item.read_at ? <span className="text-muted-foreground">Lida</span> : (
              <Button type="button" size="sm" variant="outline" onClick={() => void mark(item.id)}>
                Marcar lida
              </Button>
            )}
          </li>
        ))}
        {items.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhuma notificação.</li> : null}
      </ul>
    </div>
  )
}

export function ReportsPage() {
  const groups = ["Ponto", "Jornada", "Banco de horas", "Ocorrências", "Gestão"]
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Relatórios</h1>
      <p className="text-sm text-muted-foreground">Consulta analítica. O catálogo inicial de cada grupo ainda não foi escolhido.</p>
      {groups.map((group) => (
        <section key={group} className="rounded-md border border-border bg-card px-4 py-3 text-sm">
          <h2 className="font-medium">{group}</h2>
          <p className="mt-1 text-muted-foreground">Nenhum relatório deste grupo.</p>
        </section>
      ))}
    </div>
  )
}

export function PayrollPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [result, setResult] = useState<Payroll | null>(null)
  const [error, setError] = useState("")

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      setResult(await getPayroll(Number(year), Number(month)))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível consultar.")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Fiscal / Folha</h1>
      <p className="text-sm text-muted-foreground">Fora do fluxo cotidiano do funcionário. AFD e AEJ não são gerados: o leiaute ainda não foi definido. Abaixo, o total de marcações do período.</p>
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
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {result ? (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {result.items.map((item) => (
            <li key={item.employee_id} className="flex justify-between px-4 py-3 text-sm">
              <span>{item.full_name}</span>
              <span>{item.punch_count} marcações</span>
            </li>
          ))}
          {result.items.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhum funcionário.</li> : null}
        </ul>
      ) : null}
    </div>
  )
}
