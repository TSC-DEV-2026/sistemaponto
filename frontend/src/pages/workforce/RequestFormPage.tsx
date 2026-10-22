import { FormEvent, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fieldClass } from "@/components/workforce/CatalogPanel"
import { DayTimesFields, momentsOf } from "@/components/workforce/PunchDay"
import { emptyTimeOff, TimeOffFields, timeOffBody, type TimeOffDraft } from "@/components/workforce/TimeOffFields"
import { createRecord, listRecords, uploadCertificatePhoto, type Employee, type NamedRecord } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { manualTimeOffKinds, requestKindLabel } from "@/utils/labels"

export function RequestFormPage() {
  const navigate = useNavigate()
  const personId = useAuthStore((state) => state.user?.person_id)
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [ready, setReady] = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [blocked, setBlocked] = useState("")
  const [reasons, setReasons] = useState<NamedRecord[]>([])
  const [error, setError] = useState("")
  const [day, setDay] = useState("")
  const [times, setTimes] = useState(["", ""])
  const [requestNote, setRequestNote] = useState("")
  const [reasonId, setReasonId] = useState("")
  const [offKind, setOffKind] = useState<(typeof manualTimeOffKinds)[number]>("allowance")
  const [offDraft, setOffDraft] = useState<TimeOffDraft>(emptyTimeOff)
  const [offNote, setOffNote] = useState("")
  const [offReasonId, setOffReasonId] = useState("")
  const [offReasons, setOffReasons] = useState<NamedRecord[]>([])

  useEffect(() => {
    let active = true
    if (!personId) {
      setAllowed(false)
      setBlocked("Seu acesso não está ligado a um funcionário.")
      setReady(true)
      return
    }
    listRecords<Employee>("/employees", { page: 1, limit: 1, person_id: personId })
      .then((page) => {
        if (!active) return
        const employee = page.items[0]
        if (!employee) {
          setAllowed(false)
          setBlocked("Seu acesso não está ligado a um funcionário.")
        } else if (employee.situation === "dismissed") {
          setAllowed(false)
          setBlocked("Funcionário desligado.")
        } else {
          setAllowed(true)
          setBlocked("")
        }
      })
      .catch((caught: unknown) => {
        if (!active) return
        setAllowed(false)
        setError(caught instanceof Error ? caught.message : "Não foi possível abrir a solicitação.")
      })
      .finally(() => {
        if (active) setReady(true)
      })
    return () => {
      active = false
    }
  }, [personId, tenantId])

  useEffect(() => {
    if (!allowed) return
    let active = true
    listRecords<NamedRecord>("/reasons", { page: 1, limit: 100, kind: "adjustment", active: true })
      .then((page) => {
        if (active) setReasons(page.items)
      })
      .catch(() => {
        if (active) setReasons([])
      })
    return () => {
      active = false
    }
  }, [allowed, tenantId])

  useEffect(() => {
    if (!allowed) return
    const reasonKind = offKind === "allowance" || offKind === "certificate" ? offKind : ""
    if (!reasonKind) {
      setOffReasons([])
      setOffReasonId("")
      return
    }
    let active = true
    listRecords<NamedRecord>("/reasons", { page: 1, limit: 100, kind: reasonKind, active: true })
      .then((page) => {
        if (active) setOffReasons(page.items)
      })
      .catch(() => {
        if (active) setOffReasons([])
      })
    return () => {
      active = false
    }
  }, [allowed, offKind, tenantId])

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
      navigate("/requests")
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
      navigate("/requests")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível solicitar.")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <BackLink to="/requests" />
      <h1 className="text-xl font-semibold">Nova solicitação</h1>
      {ready && blocked ? <p className="text-sm text-muted-foreground">{blocked}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {allowed ? (
        <>
          <ActionForm className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={requestAdjustment}>
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
          </ActionForm>
          <ActionForm className="grid gap-3 rounded-md border border-border bg-card p-3" onSubmit={requestTimeOff}>
            <h2 className="text-sm font-medium">Solicitar abono, atestado, afastamento ou férias</h2>
            <p className="text-sm text-muted-foreground">Pendente não altera o ponto. Depois da aprovação, a origem é solicitação. No atestado, o CID pode ficar vazio. CRM e o nome do médico são obrigatórios. A foto é opcional.</p>
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
            <TimeOffFields idPrefix="request-off" kind={offKind} draft={offDraft} fileKey={0} onChange={setOffDraft} />
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
          </ActionForm>
        </>
      ) : null}
    </div>
  )
}
