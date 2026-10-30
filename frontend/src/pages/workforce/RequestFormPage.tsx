import { FormEvent, useEffect, useState } from "react"
import { Calendar, Clock, FileText, MessageSquare, Plus, Trash2, type LucideIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { DatePickerField } from "@/components/ui/date-picker-field"
import { Label } from "@/components/ui/label"
import { SiteSelect } from "@/components/ui/site-select"
import { TimePickerField } from "@/components/ui/time-picker-field"
import { moduleDangerIconClass, moduleLabelClass, modulePrimaryClass, moduleQuietClass, moduleTextClass } from "@/components/workforce/module-visual"
import { momentsOf } from "@/components/workforce/PunchDay"
import { CertificatePhotoField, emptyTimeOff, TimeOffFields, timeOffBody, type TimeOffDraft } from "@/components/workforce/TimeOffFields"
import { createRecord, listRecords, uploadCertificatePhoto, type Employee, type NamedRecord } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/utils/cn"
import { manualTimeOffKinds, requestKindLabel } from "@/utils/labels"

const requestCardClass = "rounded-[14px] border border-[#E2E8F0] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-6"

function CardHeading({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]">
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0">
        <h2 className="text-base font-semibold leading-5 text-[#0A0A0A]">{title}</h2>
        {text ? <p className="mt-0.5 text-sm leading-5 text-[#71717A]">{text}</p> : null}
      </div>
    </div>
  )
}

export function RequestFormPage() {
  const navigate = useNavigate()
  const personId = useAuthStore((state) => state.user?.person_id)
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const [ready, setReady] = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [blocked, setBlocked] = useState("")
  const [reasons, setReasons] = useState<NamedRecord[]>([])
  const [error, setError] = useState("")
  const [flow, setFlow] = useState<"adjustment" | "absence">("adjustment")
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

  const adjustment = flow === "adjustment"
  const activeReasons = adjustment ? reasons : offReasons
  const activeReason = adjustment ? reasonId : offReasonId
  const activeNote = adjustment ? requestNote : offNote
  const showDocuments = !adjustment && offKind === "certificate"

  function changeTime(index: number, value: string) {
    setTimes(times.map((item, position) => (position === index ? value : item)))
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <BackLink to="/requests" appearance="detail" />
      {ready && blocked ? <p className="text-sm text-[#52525B]">{blocked}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {allowed ? (
        <>
          <section className={requestCardClass}>
            <CardHeading icon={FileText} title="Tipo de solicitação" text="Selecione o tipo de solicitação que deseja realizar" />
            <div className="mt-5 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2">
              <TypeChoice
                selected={adjustment}
                icon={Clock}
                title="Ajuste de ponto"
                text="Para corrigir marcações de entrada, saída ou intervalos."
                onSelect={() => setFlow("adjustment")}
              />
              <TypeChoice
                selected={!adjustment}
                icon={Calendar}
                title="Abono, atestado, afastamento ou férias"
                text="Para períodos de ausência."
                onSelect={() => setFlow("absence")}
              />
            </div>
          </section>
          <ActionForm className={cn("grid items-start gap-4", showDocuments && "lg:grid-cols-[minmax(0,7fr)_minmax(240px,3fr)] lg:gap-5")} onSubmit={adjustment ? requestAdjustment : requestTimeOff}>
            <div className="min-w-0 space-y-4">
              <section className={requestCardClass}>
                <CardHeading icon={Calendar} title="Período e marcações" text={adjustment ? "Informe o dia e as marcações que devem valer." : "Informe o tipo e o período."} />
                <div className="mt-5 space-y-4">
                  {adjustment ? (
                    <>
                      <DatePickerField id="request-day" label="Dia" value={day} onChange={setDay} required />
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <Label className={moduleLabelClass}>Marcações do dia</Label>
                          {times.length < 20 ? (
                            <Button type="button" variant="outline" className={cn(moduleQuietClass, "shrink-0")} onClick={() => setTimes([...times, ""])}>
                              <Plus className="h-4 w-4" />
                              Incluir horário
                            </Button>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {times.map((time, index) => (
                            <div key={index} className="flex min-w-0 items-center gap-2">
                              <div className="min-w-0 flex-1">
                                <TimePickerField id={`request-time-${index}`} value={time} inputLabel={`Marcação ${index + 1}`} required={index === 0} onChange={(value) => changeTime(index, value)} />
                              </div>
                              {times.length > 1 ? (
                                <Button type="button" variant="outline" className={cn(moduleDangerIconClass, "h-12 w-12")} aria-label="Remover" title="Remover" onClick={() => setTimes(times.filter((_, position) => position !== index))}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="min-w-0 space-y-2">
                          <Label className={moduleLabelClass} htmlFor="off-kind">
                            Tipo
                          </Label>
                          <SiteSelect
                            id="off-kind"
                            value={offKind}
                            options={manualTimeOffKinds.map((value) => ({ value, label: requestKindLabel[value] }))}
                            onChange={(value) => setOffKind(value as (typeof manualTimeOffKinds)[number])}
                          />
                        </div>
                        {offKind === "vacation" ? null : (
                          <div className="min-w-0 space-y-2">
                            <Label className={moduleLabelClass} htmlFor="request-off-mode">
                              Período
                            </Label>
                            <SiteSelect
                              id="request-off-mode"
                              value={offDraft.mode}
                              options={[
                                { value: "days", label: "Dia inteiro ou vários dias" },
                                { value: "hours", label: "Algumas horas de um dia" },
                              ]}
                              onChange={(value) => setOffDraft({ ...offDraft, mode: value === "hours" ? "hours" : "days" })}
                            />
                          </div>
                        )}
                      </div>
                      <TimeOffFields idPrefix="request-off" kind={offKind} draft={offDraft} fileKey={0} onChange={setOffDraft} appearance="module" hideMode showPhoto={false} />
                    </>
                  )}
                </div>
              </section>
              <section className={requestCardClass}>
                <CardHeading icon={MessageSquare} title="Justificativa" text="Informe o motivo e, se necessário, adicione uma observação." />
                <div className="mt-5 space-y-4">
                  {activeReasons.length > 0 ? (
                    <div className="space-y-2">
                      <Label className={moduleLabelClass} htmlFor="request-reason">
                        Motivo
                      </Label>
                      <SiteSelect
                        id="request-reason"
                        value={activeReason}
                        placeholder="Selecione"
                        required
                        options={activeReasons.map((item) => ({ value: String(item.id), label: item.name }))}
                        onChange={adjustment ? setReasonId : setOffReasonId}
                      />
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label className={moduleLabelClass} htmlFor="request-note">
                      Observação
                    </Label>
                    <textarea
                      id="request-note"
                      className={cn(moduleTextClass, "min-h-[92px]")}
                      value={activeNote}
                      onChange={(event) => (adjustment ? setRequestNote(event.target.value) : setOffNote(event.target.value))}
                    />
                  </div>
                </div>
              </section>
              <div className="flex justify-end">
                <Button type="submit" className={modulePrimaryClass}>
                  {adjustment ? "Enviar ajuste" : "Enviar solicitação"}
                </Button>
              </div>
            </div>
            {showDocuments ? (
              <div className="min-w-0">
                <section className={requestCardClass}>
                  <CardHeading icon={FileText} title="Documentos" text="A foto do atestado é opcional." />
                  <div className="mt-5">
                    <CertificatePhotoField id="request-off-photo" fileKey={0} layout="stack" photo={offDraft.photo} onChange={(photo) => setOffDraft({ ...offDraft, photo })} />
                  </div>
                </section>
              </div>
            ) : null}
          </ActionForm>
        </>
      ) : null}
    </div>
  )
}

function TypeChoice({
  selected,
  icon: Icon,
  title,
  text,
  onSelect,
}: {
  selected: boolean
  icon: LucideIcon
  title: string
  text: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "flex h-full min-w-0 items-center gap-3 rounded-xl border px-4 py-4 text-left transition-[transform,border-color,background-color,box-shadow] duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        selected ? "border-[#1E8A3A] bg-[#F5FBF7] shadow-[0_8px_24px_rgba(30,138,58,0.08)]" : "border-[#E2E8F0] bg-white hover:border-[rgba(30,138,58,0.35)] hover:shadow-[0_8px_20px_rgba(15,23,42,0.06)]",
      )}
      onClick={onSelect}
    >
      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", selected ? "border-[#1E8A3A] bg-[#1E8A3A]" : "border-[#D4D4D8] bg-white")}>
        {selected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
      </span>
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", selected ? "bg-[rgba(30,138,58,0.12)] text-[#1E8A3A]" : "bg-[#F4F4F5] text-[#71717A]")}>
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[#0A0A0A]">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-5 text-[#71717A]">{text}</span>
      </span>
    </button>
  )
}
