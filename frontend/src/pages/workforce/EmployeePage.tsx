import { FormEvent, useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fieldClass } from "@/components/workforce/CatalogPanel"
import { PunchCorrectionForm, PunchLists } from "@/components/workforce/PunchDay"
import {
  createRecord,
  getRecord,
  listRecords,
  updateRecord,
  type Audit,
  type Employee,
  type NamedRecord,
  type Occurrence,
  type Punch,
  type TimeRequest,
  type Vigency,
} from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { onlyDigits } from "@/utils/digits"
import {
  occurrenceKindLabel,
  punchOrigin,
  requestKindLabel,
  requestStatusLabel,
  showDate,
  showDateTime,
  situationLabel,
  vigencyKindLabel,
} from "@/utils/labels"

const tabs = [
  ["data", "Dados"],
  ["work", "Trabalho"],
  ["punch", "Ponto"],
  ["events", "Ocorrências"],
  ["history", "Histórico"],
] as const

const links = [
  ["job", "Cargo", "/jobs"],
  ["journey", "Jornada", "/journeys"],
  ["cost_center", "Centro de custo", "/cost-centers"],
  ["unit", "Unidade", "/units"],
  ["sector", "Setor", "/sectors"],
  ["team", "Equipe", "/teams"],
  ["union", "Sindicato", "/unions"],
  ["manager", "Gestor", "/employees"],
] as const

export function EmployeePage() {
  const params = useParams()
  const id = Number(params.id)
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin"
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("data")
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [vigencies, setVigencies] = useState<Vigency[]>([])
  const [punches, setPunches] = useState<Punch[]>([])
  const [occurrences, setOccurrences] = useState<Occurrence[]>([])
  const [audits, setAudits] = useState<Audit[]>([])
  const [requests, setRequests] = useState<TimeRequest[]>([])
  const [journeys, setJourneys] = useState<NamedRecord[]>([])
  const [choices, setChoices] = useState<{ value: string; label: string }[]>([])
  const [error, setError] = useState("")
  const [fullName, setFullName] = useState("")
  const [cpf, setCpf] = useState("")
  const [email, setEmail] = useState("")
  const [personId, setPersonId] = useState("")
  const [admission, setAdmission] = useState("")
  const [note, setNote] = useState("")
  const [kind, setKind] = useState("job")
  const [referenceId, setReferenceId] = useState("")
  const [statusLabel, setStatusLabel] = useState("active")
  const [validFrom, setValidFrom] = useState("")
  const [vigencyNote, setVigencyNote] = useState("")
  const [occurrenceKind, setOccurrenceKind] = useState("absence")
  const [startsOn, setStartsOn] = useState("")
  const [endsOn, setEndsOn] = useState("")
  const [reasonId, setReasonId] = useState("")
  const [occurrenceNote, setOccurrenceNote] = useState("")
  const [reasons, setReasons] = useState<NamedRecord[]>([])

  async function load() {
    const [person, history, marks, events, trail, inbox, journeyPage] = await Promise.all([
      getRecord<Employee>("/employees", id),
      listRecords<Vigency>("/employee-vigencies", { page: 1, limit: 100, employee_id: id }),
      listRecords<Punch>("/punches", { page: 1, limit: 100, employee_id: id }),
      listRecords<Occurrence>("/occurrences", { page: 1, limit: 100, employee_id: id }),
      isAdmin ? listRecords<Audit>("/audits", { page: 1, limit: 100, employee_id: id }) : Promise.resolve({ items: [] as Audit[], total: 0, page: 1, limit: 100 }),
      listRecords<TimeRequest>("/requests", { page: 1, limit: 100, employee_id: id }),
      listRecords<NamedRecord>("/journeys", { page: 1, limit: 100 }),
    ])
    setEmployee(person)
    setFullName(person.full_name)
    setCpf(person.cpf)
    setEmail(person.email || "")
    setPersonId(person.person_id ? String(person.person_id) : "")
    setAdmission(person.admission_date)
    setNote(person.note || "")
    setVigencies(history.items)
    setPunches(marks.items)
    setOccurrences(events.items)
    setAudits(trail.items)
    setRequests(inbox.items)
    setJourneys(journeyPage.items)
  }

  useEffect(() => {
    let active = true
    load()
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Não foi possível carregar.")
        }
      })
    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    if (kind === "status") {
      return
    }
    const target = links.find((item) => item[0] === kind)
    if (!target) {
      return
    }
    listRecords<NamedRecord | Employee>(target[2], { page: 1, limit: 100 })
      .then((page) => {
        setChoices(
          page.items
            .filter((item) => kind !== "manager" || item.id !== id)
            .map((item) => ({
              value: String(item.id),
              label: "full_name" in item ? item.full_name : item.name,
            })),
        )
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Não foi possível carregar.")
      })
  }, [kind, id])

  useEffect(() => {
    const reasonKind = occurrenceKind === "vacation" || occurrenceKind === "leave" || occurrenceKind === "punch_entry" ? "" : occurrenceKind
    if (!reasonKind) {
      setReasons([])
      return
    }
    listRecords<NamedRecord>("/reasons", { page: 1, limit: 100, kind: reasonKind, active: true })
      .then((page) => setReasons(page.items))
      .catch(() => setReasons([]))
  }, [occurrenceKind])

  async function saveEmployee(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      const saved = await updateRecord<Employee>("/employees", id, {
        full_name: fullName.trim(),
        cpf: onlyDigits(cpf),
        email: email.trim() || null,
        person_id: personId.trim() ? Number(personId) : null,
        admission_date: admission,
        note: note.trim() || null,
      })
      setEmployee(saved)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.")
    }
  }

  async function saveVigency(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      await createRecord("/employee-vigencies", {
        employee_id: id,
        kind,
        reference_id: kind === "status" ? null : Number(referenceId),
        label: kind === "status" ? statusLabel : null,
        valid_from: validFrom,
        note: vigencyNote.trim() || null,
      })
      setReferenceId("")
      setVigencyNote("")
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.")
    }
  }

  async function saveOccurrence(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      await createRecord("/occurrences", {
        employee_id: id,
        kind: occurrenceKind,
        starts_on: startsOn,
        ends_on: endsOn || null,
        reason_id: reasonId ? Number(reasonId) : null,
        note: occurrenceNote.trim() || null,
      })
      setOccurrenceNote("")
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.")
    }
  }

  const journey = vigencies.find((item) => item.kind === "journey" && item.valid_to === null)
  const schedule = journeys.find((item) => item.id === journey?.reference_id)

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link to="/people" className="text-sm text-muted-foreground">
          Pessoas
        </Link>
        <h1 className="text-xl font-semibold">{employee?.full_name || "Funcionário"}</h1>
        <p className="text-sm text-muted-foreground">
          {situationLabel[employee?.situation || ""] || "Sem situação"}
          {employee?.job_label ? ` · ${employee.job_label}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map(([value, label]) => (
          <Button key={value} type="button" size="sm" variant={tab === value ? "default" : "outline"} onClick={() => setTab(value)}>
            {label}
          </Button>
        ))}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {tab === "data" ? (
        <form className="space-y-4" onSubmit={saveEmployee}>
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required disabled={!isAdmin} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" value={cpf} onChange={(event) => setCpf(event.target.value)} required disabled={!isAdmin} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={!isAdmin} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="person">Acesso (person id)</Label>
            <Input id="person" value={personId} onChange={(event) => setPersonId(event.target.value)} disabled={!isAdmin} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admission">Admissão</Label>
            <input id="admission" className={fieldClass} type="date" value={admission} onChange={(event) => setAdmission(event.target.value)} required disabled={!isAdmin} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Observação</Label>
            <textarea id="note" className="min-h-20 w-full rounded-md border border-border bg-card px-3 py-2 text-sm" value={note} onChange={(event) => setNote(event.target.value)} disabled={!isAdmin} />
          </div>
          {isAdmin ? <Button type="submit">Salvar</Button> : null}
        </form>
      ) : null}
      {tab === "work" ? (
        <div className="space-y-4">
          <ul className="grid gap-2 text-sm">
            <li>Cargo: {employee?.job_label || "—"}</li>
            <li>Jornada: {employee?.journey_label || "—"}</li>
            <li>Centro de custo: {employee?.cost_center_label || "—"}</li>
            <li>Unidade: {employee?.unit_label || "—"}</li>
            <li>Setor: {employee?.sector_label || "—"}</li>
            <li>Equipe: {employee?.team_label || "—"}</li>
            <li>Sindicato: {employee?.union_label || "—"}</li>
            <li>Gestor: {employee?.manager_label || "—"}</li>
          </ul>
          {isAdmin ? (
            <form className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={saveVigency}>
              <div className="space-y-2">
                <Label htmlFor="kind">Vínculo</Label>
                <select id="kind" className={fieldClass} value={kind} onChange={(event) => setKind(event.target.value)}>
                  {links.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                  <option value="status">Situação</option>
                </select>
              </div>
              {kind === "status" ? (
                <div className="space-y-2">
                  <Label htmlFor="status">Situação</Label>
                  <select id="status" className={fieldClass} value={statusLabel} onChange={(event) => setStatusLabel(event.target.value)}>
                    <option value="active">Ativo</option>
                    <option value="dismissed">Desligado</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="reference">Cadastro</Label>
                  <select id="reference" className={fieldClass} value={referenceId} onChange={(event) => setReferenceId(event.target.value)} required>
                    <option value="">Selecione</option>
                    {choices.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="from">Vigência a partir de</Label>
                <input id="from" className={fieldClass} type="date" value={validFrom} onChange={(event) => setValidFrom(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vnote">Observação</Label>
                <Input id="vnote" value={vigencyNote} onChange={(event) => setVigencyNote(event.target.value)} />
              </div>
              <Button type="submit">Registrar vigência</Button>
            </form>
          ) : null}
        </div>
      ) : null}
      {tab === "punch" ? (
        <div className="space-y-4">
          <section className="rounded-md border border-border bg-card px-4 py-3 text-sm">
            <h2 className="font-medium">Jornada prevista</h2>
            <p className="mt-1 text-muted-foreground">
              {schedule
                ? `${schedule.name}: ${schedule.morning_start || "—"}–${schedule.morning_end || "—"} / ${schedule.afternoon_start || "—"}–${schedule.afternoon_end || "—"}`
                : "Nenhuma jornada vigente."}
            </p>
            <p className="mt-2">A apuração não é calculada. As regras detalhadas de tolerância, extra e banco ainda não foram definidas.</p>
          </section>
          {isAdmin ? <PunchCorrectionForm employeeId={id} onSaved={load} /> : null}
          <PunchLists punches={punches} />
          <section className="text-sm">
            <h2 className="font-medium">Solicitações</h2>
            <p className="text-muted-foreground">Uma solicitação pendente não altera estas marcações. A origem da aprovação é solicitação.</p>
            <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-card">
              {requests.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  {requestKindLabel[item.kind] || item.kind} · {requestStatusLabel[item.status] || item.status}
                  {item.kind === "adjustment" && item.punches.length > 0 ? ` · ${item.punches.map((value) => showDateTime(value)).join(", ")}` : ""}
                  {item.kind === "adjustment" && item.status === "approved" ? ` · ${punchOrigin("approved_request")}` : ""}
                </li>
              ))}
              {requests.length === 0 ? <li className="px-4 py-3 text-muted-foreground">Nenhuma solicitação.</li> : null}
            </ul>
          </section>
        </div>
      ) : null}
      {tab === "events" ? (
        <div className="space-y-4">
          {isAdmin ? (
            <form className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={saveOccurrence}>
              <div className="space-y-2">
                <Label htmlFor="okind">Tipo</Label>
                <select id="okind" className={fieldClass} value={occurrenceKind} onChange={(event) => setOccurrenceKind(event.target.value)}>
                  {Object.entries(occurrenceKindLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start">Início</Label>
                <input id="start" className={fieldClass} type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">Fim</Label>
                <input id="end" className={fieldClass} type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} />
              </div>
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
                <Label htmlFor="onote">Observação</Label>
                <Input id="onote" value={occurrenceNote} onChange={(event) => setOccurrenceNote(event.target.value)} />
              </div>
              <Button type="submit">Registrar ocorrência</Button>
            </form>
          ) : null}
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {occurrences.map((item) => (
              <li key={item.id} className="px-4 py-3 text-sm">
                {occurrenceKindLabel[item.kind] || item.kind} · {showDate(item.starts_on)} a {showDate(item.ends_on)}
                {item.note ? ` · ${item.note}` : ""}
              </li>
            ))}
            {occurrences.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhuma ocorrência.</li> : null}
          </ul>
        </div>
      ) : null}
      {tab === "history" ? (
        <div className="space-y-4">
          <section>
            <h2 className="text-sm font-medium">Vigências</h2>
            <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-card">
              {vigencies.map((item) => (
                <li key={item.id} className="px-4 py-3 text-sm">
                  {vigencyKindLabel[item.kind] || item.kind}: {situationLabel[item.label] || item.label} · {showDate(item.valid_from)} até {item.valid_to ? showDate(item.valid_to) : "atual"}
                </li>
              ))}
              {vigencies.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhuma vigência.</li> : null}
            </ul>
          </section>
          <section>
            <h2 className="text-sm font-medium">Auditoria</h2>
            <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-card">
              {audits.map((item) => (
                <li key={item.id} className="px-4 py-3 text-sm">
                  {showDateTime(item.created_at)} · pessoa {item.person_id} · {item.action}
                  {item.previous_label ? ` · de ${item.previous_label}` : ""} {item.new_label ? `para ${item.new_label}` : ""}
                </li>
              ))}
              {audits.length === 0 ? <li className="px-4 py-3 text-sm text-muted-foreground">Nenhuma auditoria.</li> : null}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  )
}
