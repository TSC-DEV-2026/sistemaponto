import { FormEvent, useEffect, useState } from "react"
import { Briefcase, Building2, CalendarClock, ClipboardList, Clock, Info, Save, Tags, Timer, User, UserRound, Users, type LucideIcon } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { CpfField } from "@/components/ui/cpf-field"
import { DatePickerField } from "@/components/ui/date-picker-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteSelect } from "@/components/ui/site-select"
import { SlidingHighlight } from "@/components/ui/sliding-highlight"
import { Spinner } from "@/components/ui/spinner"
import { loadClassificationGroups } from "@/components/workforce/ClassificationFilter"
import { HourBankPanel } from "@/components/workforce/HourBankPanel"
import { useDayLocks } from "@/components/workforce/use-day-lock"
import { moduleCardClass, moduleFieldClass, moduleLabelClass, modulePrimaryClass, moduleTextClass } from "@/components/workforce/module-visual"
import { PunchCorrectionForm } from "@/components/workforce/PunchDay"
import { CertificatePhotoField, emptyTimeOff, TimeOffFields, timeOffBody, type TimeOffDraft } from "@/components/workforce/TimeOffFields"
import { createRecord, getRecord, listRecords, updateRecord, uploadCertificatePhoto, type Employee, type NamedRecord } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/utils/cn"
import { formatCpf, onlyDigits } from "@/utils/digits"
import { isoWeekday } from "@/pages/workforce/journey"
import { absenceKinds, clockMethodLabel, manualTimeOffKinds, occurrenceKindLabel } from "@/utils/labels"

const vigencyTargets: { kind: string; label: string; path: string; searchKey: "name" | "full_name"; icon: LucideIcon }[] = [
  { kind: "job", label: "Cargo", path: "/jobs", searchKey: "name", icon: Briefcase },
  { kind: "journey", label: "Jornada", path: "/journeys", searchKey: "name", icon: CalendarClock },
  { kind: "team", label: "Equipe", path: "/teams", searchKey: "name", icon: Users },
  { kind: "union", label: "Sindicato", path: "/unions", searchKey: "name", icon: Building2 },
  { kind: "manager", label: "Gestor", path: "/employees", searchKey: "full_name", icon: UserRound },
  { kind: "status", label: "Situação", path: "", searchKey: "name", icon: User },
]

function readFaceImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      reject(new Error("A foto de referência não foi aceita."))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("A foto de referência não foi aceita."))
    reader.readAsDataURL(file)
  })
}

function ClassificationAssignment({ employeeId }: { employeeId: number }) {
  const [groups, setGroups] = useState<{ id: number; name: string; values: NamedRecord[] }[]>([])
  const [classificationId, setClassificationId] = useState("")
  const [valueId, setValueId] = useState("")
  const [validFrom, setValidFrom] = useState("")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const selected = groups.find((item) => String(item.id) === classificationId)

  useEffect(() => {
    let active = true
    loadClassificationGroups()
      .then((page) => {
        if (active) setGroups(page)
      })
      .catch(() => {
        if (active) setMessage("Não foi possível carregar as classificações.")
      })
    return () => {
      active = false
    }
  }, [employeeId])

  async function save() {
    if (!classificationId) {
      setMessage("Selecione a classificação.")
      return
    }
    if (!valueId) {
      setMessage("Selecione o valor.")
      return
    }
    if (!validFrom) {
      setMessage("Informe a data de início.")
      return
    }
    setMessage("")
    setSaving(true)
    try {
      await createRecord("/employee-vigencies", {
        employee_id: employeeId,
        kind: "classification",
        reference_id: Number(valueId),
        valid_from: validFrom,
        note: note.trim() || null,
      })
      setClassificationId("")
      setValueId("")
      setValidFrom("")
      setNote("")
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Não foi possível salvar a classificação.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={cn(moduleCardClass, "space-y-5")}>
      <h2 className="text-lg font-semibold text-[#0A0A0A]">Alterar classificações</h2>
      {message ? <p className="text-sm text-destructive" role="alert">{message}</p> : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className={moduleLabelClass} htmlFor="employee-classification">Classificação</Label>
          <SiteSelect
            id="employee-classification"
            value={classificationId}
            searchable
            searchPath="/classifications"
            searchPlaceholder="Pesquisar classificação"
            placeholder="Selecione"
            className="h-12"
            icon={Tags}
            options={groups.map((item) => ({ value: String(item.id), label: item.name }))}
            onChange={(next) => {
              setClassificationId(next)
              setValueId("")
            }}
          />
        </div>
        <div className="space-y-2">
          <Label className={moduleLabelClass} htmlFor="employee-classification-value">Valor</Label>
          <SiteSelect
            id="employee-classification-value"
            value={valueId}
            searchable={Boolean(classificationId)}
            searchPath={classificationId ? "/classification-values" : undefined}
            searchParams={classificationId ? { classification_id: Number(classificationId) } : undefined}
            searchPlaceholder="Pesquisar valor"
            placeholder="Selecione"
            className="h-12"
            options={(selected?.values || []).map((item) => ({ value: String(item.id), label: item.name }))}
            onChange={setValueId}
          />
        </div>
        <DatePickerField id="employee-classification-from" label="Início" value={validFrom} onChange={setValidFrom} />
        <div className="space-y-2 md:col-span-2">
          <Label className={moduleLabelClass} htmlFor="employee-classification-note">Observação</Label>
          <textarea id="employee-classification-note" className={cn(moduleTextClass, "min-h-24")} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
      </div>
      <Button type="button" className={modulePrimaryClass} disabled={saving} onClick={() => void save()}>
        {saving ? <Spinner className="h-4 w-4" /> : null}
        Salvar classificação
      </Button>
    </section>
  )
}

export function EmployeeFormPage() {
  const navigate = useNavigate()
  const params = useParams()
  const id = params.id ? Number(params.id) : null
  const [fullName, setFullName] = useState("")
  const [cpf, setCpf] = useState("")
  const [email, setEmail] = useState("")
  const [admission, setAdmission] = useState("")
  const [note, setNote] = useState("")
  const [hourBank, setHourBank] = useState(false)
  const [registration, setRegistration] = useState("")
  const [clockMethod, setClockMethod] = useState("simple")
  const [faceFile, setFaceFile] = useState<File | null>(null)
  const [faceUrl, setFaceUrl] = useState<string | null>(null)
  const [usesBank, setUsesBank] = useState(false)
  const [error, setError] = useState("")
  const [linkChoices, setLinkChoices] = useState<{ value: string; label: string; kind?: string; length?: number }[]>([])
  const [referenceId, setReferenceId] = useState("")
  const [journeyDetail, setJourneyDetail] = useState<NamedRecord | null>(null)
  const [cycleDay, setCycleDay] = useState("")
  const [cycleTouched, setCycleTouched] = useState(false)
  const [statusLabelValue, setStatusLabelValue] = useState("active")
  const [validFrom, setValidFrom] = useState("")
  const [vigencyNote, setVigencyNote] = useState("")
  const [savingLink, setSavingLink] = useState(false)
  const [occurrenceKind, setOccurrenceKind] = useState("absence")
  const [offDraft, setOffDraft] = useState<TimeOffDraft>(emptyTimeOff)
  const [offFileKey, setOffFileKey] = useState(0)
  const [startsOn, setStartsOn] = useState("")
  const [endsOn, setEndsOn] = useState("")
  const [reasonId, setReasonId] = useState("")
  const [occurrenceNote, setOccurrenceNote] = useState("")
  const [reasons, setReasons] = useState<NamedRecord[]>([])
  const [savingEvent, setSavingEvent] = useState(false)
  const role = useAuthStore((state) => state.user?.role)
  const isAdmin = role === "admin"
  const [tab, setTab] = useState("data")
  const canRecordEvent = isAdmin || role === "manager"
  const canCorrect = isAdmin || role === "manager"
  const locks = useDayLocks(id)
  const linkTarget = vigencyTargets.find((item) => item.kind === tab)
  const manualEvent = manualTimeOffKinds.includes(occurrenceKind as (typeof manualTimeOffKinds)[number])
  const asksReason = occurrenceKind !== "vacation" && occurrenceKind !== "leave" && occurrenceKind !== "punch_entry"

  useEffect(() => {
    if (id === null) return
    let active = true
    getRecord<Employee>("/employees", id)
      .then((person) => {
        if (!active) return
        setFullName(person.full_name)
        setCpf(formatCpf(person.cpf))
        setEmail(person.email || "")
        setAdmission(person.admission_date)
        setNote(person.note || "")
        setHourBank(Boolean(person.hour_bank))
        setUsesBank(Boolean(person.hour_bank))
        setRegistration(person.registration_number || "")
        setClockMethod(person.clock_method || "simple")
        setFaceUrl(person.face_url)
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Não foi possível carregar.")
      })
    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    if (!isAdmin || id === null || !linkTarget || linkTarget.kind === "status") {
      setLinkChoices([])
      return
    }
    let active = true
    listRecords<NamedRecord & { full_name?: string }>(linkTarget.path, { page: 1, limit: 100 })
      .then((page) => {
        if (!active) return
        setLinkChoices(
          page.items
            .filter((item) => linkTarget.kind !== "manager" || item.id !== id)
            .map((item) => ({
              value: String(item.id),
              label: item.full_name || item.name,
              kind: item.kind,
              length: item.days?.length || 0,
            })),
        )
      })
      .catch(() => {
        if (active) setLinkChoices([])
      })
    return () => {
      active = false
    }
  }, [isAdmin, id, linkTarget])

  const listedJourney = tab === "journey" ? linkChoices.find((item) => item.value === referenceId) : undefined

  useEffect(() => {
    if (tab !== "journey" || !referenceId || listedJourney) {
      setJourneyDetail(null)
      return
    }
    let active = true
    getRecord<NamedRecord>("/journeys", Number(referenceId))
      .then((journey) => {
        if (active) setJourneyDetail(journey)
      })
      .catch(() => {
        if (active) setJourneyDetail(null)
      })
    return () => {
      active = false
    }
  }, [tab, referenceId, listedJourney])

  const scheduledJourney = listedJourney
    ? listedJourney.kind === "programada"
    : journeyDetail !== null && String(journeyDetail.id) === referenceId && journeyDetail.kind === "programada"
  const sequenceLength = listedJourney?.length || journeyDetail?.days?.length || 0

  useEffect(() => {
    if (!scheduledJourney || cycleTouched || sequenceLength !== 7 || !validFrom) return
    setCycleDay(String(isoWeekday(validFrom)))
  }, [scheduledJourney, cycleTouched, sequenceLength, validFrom])

  useEffect(() => {
    if (id === null || !canRecordEvent || !asksReason) {
      setReasons([])
      return
    }
    let active = true
    listRecords<NamedRecord>("/reasons", { page: 1, limit: 100, kind: occurrenceKind, active: true })
      .then((page) => {
        if (active) setReasons(page.items)
      })
      .catch(() => {
        if (active) setReasons([])
      })
    return () => {
      active = false
    }
  }, [id, canRecordEvent, asksReason, occurrenceKind])

  async function saveLink() {
    if (id === null || !linkTarget) return
    setError("")
    if (linkTarget.kind !== "status" && !referenceId) {
      setError("Selecione o cadastro.")
      return
    }
    if (linkTarget.kind === "manager" && Number(referenceId) === id) {
      setError("Escolha outro gestor.")
      return
    }
    if (!validFrom) {
      setError("Informe a data de início.")
      return
    }
    if (scheduledJourney) {
      const day = Number(cycleDay)
      if (!cycleDay || day < 1 || day > sequenceLength) {
        setError("Informe o dia da sequência.")
        return
      }
    }
    setSavingLink(true)
    try {
      await createRecord("/employee-vigencies", {
        employee_id: id,
        kind: linkTarget.kind,
        reference_id: linkTarget.kind === "status" ? null : Number(referenceId),
        label: linkTarget.kind === "status" ? statusLabelValue : null,
        valid_from: validFrom,
        cycle_day: scheduledJourney ? Number(cycleDay) : null,
        note: vigencyNote.trim() || null,
      })
      setReferenceId("")
      setValidFrom("")
      setVigencyNote("")
      setCycleDay("")
      setCycleTouched(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar o vínculo.")
    } finally {
      setSavingLink(false)
    }
  }

  async function saveOccurrence() {
    if (id === null) return
    setError("")
    if (asksReason && reasons.length > 0 && !reasonId) {
      setError("Selecione o motivo.")
      return
    }
    if (!manualEvent && !startsOn) {
      setError("Informe a data de início.")
      return
    }
    const spanStart = manualEvent ? offDraft.startsOn : startsOn
    const spanEnd = manualEvent ? (offDraft.mode === "hours" ? offDraft.startsOn : offDraft.endsOn || spanStart) : endsOn || spanStart
    const blocked = locks.lockRange(spanStart, spanEnd)
    if (blocked) {
      setError(blocked)
      return
    }
    setSavingEvent(true)
    try {
      const span: Record<string, unknown> = manualEvent ? timeOffBody(offDraft, occurrenceKind) : { starts_on: startsOn, ends_on: endsOn || null }
      if (manualEvent && occurrenceKind === "certificate" && offDraft.photo) {
        span.photo_key = (await uploadCertificatePhoto(offDraft.photo)).key
      }
      await createRecord("/occurrences", {
        employee_id: id,
        kind: occurrenceKind,
        ...span,
        reason_id: reasonId ? Number(reasonId) : null,
        note: occurrenceNote.trim() || null,
      })
      setOccurrenceNote("")
      setReasonId("")
      setStartsOn("")
      setEndsOn("")
      setOffDraft(emptyTimeOff())
      setOffFileKey((current) => current + 1)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar a ocorrência.")
    } finally {
      setSavingEvent(false)
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    const body = {
      full_name: fullName.trim(),
      cpf: onlyDigits(cpf),
      email: email.trim() || null,
      admission_date: admission,
      note: note.trim() || null,
      hour_bank: hourBank,
      registration_number: registration.trim() || null,
      clock_method: clockMethod,
    }
    if (clockMethod === "face" && faceFile) {
      try {
        Object.assign(body, { face_image: await readFaceImage(faceFile) })
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "A foto de referência não foi aceita.")
        return
      }
    }
    try {
      if (id === null) {
        await createRecord<Employee>("/employees", body)
      } else {
        await updateRecord<Employee>("/employees", id, body)
      }
      navigate("/people")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.")
    }
  }

  const notice =
    id === null
      ? "O funcionário nasce ativo. O acesso nasce deste CPF. O e-mail é obrigatório quando a pessoa ainda não existe. A senha não fica neste sistema. O papel continua em Permissões e Acessos."
      : ""

  return (
    <div className="w-full min-w-0 space-y-5">
      <div className="w-full">
        <BackLink to={id === null ? "/people" : `/people/${id}`} appearance="detail" />
      </div>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      {id !== null ? (
        <SlidingHighlight className="inline-flex max-w-full gap-0 overflow-x-auto rounded-xl bg-[#E7E8EA] p-1" role="tablist">
          {(
            [
              { id: "data", label: "Dados", icon: User, show: true },
              ...vigencyTargets.map((item) => ({ id: item.kind, label: item.label, icon: item.icon, show: isAdmin })),
              { id: "classification", label: "Classificações", icon: Tags, show: isAdmin && id !== null },
              { id: "bank", label: "Banco de horas", icon: Timer, show: isAdmin || role === "manager" },
              { id: "correction", label: "Correção", icon: Clock, show: canCorrect },
              { id: "events", label: "Ausências", icon: ClipboardList, show: canRecordEvent },
            ]
          )
            .filter((item) => item.show)
            .map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                data-slide-active={tab === item.id ? "true" : undefined}
                className={cn(
                  "relative z-10 inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none",
                  tab === item.id ? "text-brand-cta" : "text-zinc-600 hover:text-zinc-900",
                )}
                onClick={() => {
                  setTab(item.id)
                  setReferenceId("")
                  setCycleDay("")
                  setCycleTouched(false)
                  setError("")
                }}
              >
                <item.icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                {item.label}
              </button>
            ))}
        </SlidingHighlight>
      ) : null}
      {id === null || tab === "data" ? (
      <ActionForm className={cn(moduleCardClass, "space-y-5")} onSubmit={onSubmit}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
            <User className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[#0A0A0A]">{id === null ? "Novo funcionário" : "Editar funcionário"}</h2>
            <p className="text-sm text-[#64748B]">{id === null ? "Cadastro da ficha" : "Atualize a ficha"}</p>
          </div>
        </div>
        {notice ? (
          <div className="flex items-start gap-3 rounded-xl border border-[rgba(30,138,58,0.16)] bg-[#EAF7EF] px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1E8A3A]" strokeWidth={1.75} aria-hidden />
            <p className="text-sm leading-6 text-[#334155]">{notice}</p>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label className={moduleLabelClass} htmlFor="name">
            Nome
          </Label>
          <Input id="name" className={moduleFieldClass} value={fullName} onChange={(event) => setFullName(event.target.value)} required />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="cpf">
              CPF
            </Label>
            <CpfField id="cpf" className={moduleFieldClass} value={cpf} onValueChange={setCpf} required />
          </div>
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="email">
              E-mail
            </Label>
            <Input id="email" className={moduleFieldClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            {id === null ? <p className="text-sm text-[#64748B]">Obrigatório se este CPF ainda não tiver pessoa.</p> : null}
          </div>
        </div>
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="admission">
              Admissão
            </Label>
            <DatePickerField id="admission" value={admission} onChange={setAdmission} required />
          </div>
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="clock-method">
              Tipo de registro
            </Label>
            <SiteSelect id="clock-method" value={clockMethod} options={Object.entries(clockMethodLabel).map(([value, label]) => ({ value, label }))} onChange={setClockMethod} />
            <p className="text-sm leading-5 text-[#64748B]">O aplicativo mostra só este tipo. Quem já existe fica em Simples.</p>
          </div>
        </div>
        {clockMethod === "face" ? (
          <div className="space-y-2">
            <Label className={moduleLabelClass} htmlFor="face-image">
              Foto de referência
            </Label>
            <CertificatePhotoField id="face-image" fileKey={0} photo={faceFile} accept="image/png,image/jpeg" emptyLabel="Arraste ou selecione a foto" hint="PNG ou JPG (máx. 2 MB)" onChange={setFaceFile} />
            {faceUrl ? (
              <a className="text-sm font-medium text-[#1E8A3A]" href={faceUrl} target="_blank" rel="noreferrer">
                Ver foto de referência
              </a>
            ) : null}
            <p className="text-sm text-[#64748B]">Pode ficar vazia. Sem a foto, a batida responde que não há foto de referência. Quando enviada, o servidor guarda o embedding e a foto.</p>
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label className={moduleLabelClass} htmlFor="registration">
              Matrícula
            </Label>
            <Input id="registration" className={moduleFieldClass} value={registration} onChange={(event) => setRegistration(event.target.value)} />
            <p className="text-sm leading-5 text-[#64748B]">Pode ficar vazia. O QR exige matrícula e unidade vigente. Na empresa ela não se repete.</p>
          </div>
        </div>
        <button
          type="button"
          id="hour-bank"
          role="switch"
          aria-checked={hourBank}
          className={cn(
            "flex w-full items-center justify-between gap-4 rounded-[10px] border px-4 py-3 text-left transition-[background-color,border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30 motion-reduce:transition-none",
            hourBank
              ? "border-[#8ED4A8] bg-[#E7F6EC] shadow-[0_8px_22px_rgba(30,138,58,0.16)]"
              : "border-[#E4E4E7] bg-white hover:border-[#B7D7C3]",
          )}
          onClick={() => setHourBank((current) => !current)}
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-[#0A0A0A]">Banco de horas</span>
            <span className={cn("mt-0.5 block text-sm", hourBank ? "font-medium text-[#146C2E]" : "text-[#64748B]")}>{hourBank ? "Usa" : "Não usa"}</span>
          </span>
          <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 motion-reduce:transition-none", hourBank ? "bg-[#1E8A3A]" : "bg-[#E4E4E7]")} aria-hidden>
            <span className={cn("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,0.2)] transition-transform duration-200 motion-reduce:transition-none", hourBank ? "translate-x-[22px]" : "translate-x-0.5")} />
          </span>
        </button>
        <div className="space-y-2">
          <Label className={moduleLabelClass} htmlFor="note">
            Observação
          </Label>
          <textarea id="note" className={cn(moduleTextClass, "min-h-[90px]")} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <div className="flex justify-end border-t border-[#F1F5F9] pt-5">
          <Button type="submit" className={modulePrimaryClass}>
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </div>
      </ActionForm>
      ) : null}
      {id !== null && tab === "classification" && isAdmin ? <ClassificationAssignment employeeId={id} /> : null}
      {id !== null && linkTarget && isAdmin ? (
        <section className={cn(moduleCardClass, "space-y-5")}>
          <h2 className="text-lg font-semibold text-[#0A0A0A]">Alterar {linkTarget.label.toLocaleLowerCase("pt-BR")}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {linkTarget.kind === "status" ? (
              <div className="space-y-2">
                <Label className={moduleLabelClass} htmlFor="employee-link-status">Situação</Label>
                <SiteSelect
                  id="employee-link-status"
                  value={statusLabelValue}
                  className="h-12"
                  options={[{ value: "active", label: "Ativo" }, { value: "dismissed", label: "Desligado" }]}
                  onChange={setStatusLabelValue}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className={moduleLabelClass} htmlFor="employee-link-reference">{linkTarget.label}</Label>
                <SiteSelect
                  id="employee-link-reference"
                  value={referenceId}
                  searchable
                  searchPath={linkTarget.path}
                  searchKey={linkTarget.searchKey}
                  searchPlaceholder={`Pesquisar ${linkTarget.label.toLocaleLowerCase("pt-BR")}`}
                  placeholder="Selecione"
                  className="h-12"
                  icon={Briefcase}
                  options={linkChoices}
                  onChange={(value) => {
                    setReferenceId(value)
                    if (linkTarget.kind === "journey") {
                      setCycleDay("")
                      setCycleTouched(false)
                    }
                  }}
                />
              </div>
            )}
            <DatePickerField id="employee-link-from" label="Início" value={validFrom} onChange={setValidFrom} />
            {scheduledJourney ? (
              <div className="space-y-2 md:col-span-2">
                <Label className={moduleLabelClass} htmlFor="employee-link-cycle">Dia da sequência nesta data</Label>
                <SiteSelect
                  id="employee-link-cycle"
                  value={cycleDay}
                  placeholder="Selecione o dia"
                  className="h-12"
                  options={Array.from({ length: sequenceLength }, (_, index) => ({ value: String(index + 1), label: `Dia ${index + 1}` }))}
                  onChange={(next) => {
                    setCycleDay(next)
                    setCycleTouched(true)
                  }}
                />
                <p className="text-sm text-[#64748B]">Na programada de sete dias, a sugestão é o dia da semana da vigência. Você pode escolher outro.</p>
              </div>
            ) : null}
            <div className="space-y-2 md:col-span-2">
              <Label className={moduleLabelClass} htmlFor="employee-link-note">Observação</Label>
              <textarea id="employee-link-note" className={cn(moduleTextClass, "min-h-24")} value={vigencyNote} onChange={(event) => setVigencyNote(event.target.value)} />
            </div>
          </div>
          <Button type="button" className={modulePrimaryClass} disabled={savingLink} onClick={() => void saveLink()}>
            {savingLink ? <Spinner className="h-4 w-4" /> : null}
            Salvar {linkTarget.label.toLocaleLowerCase("pt-BR")}
          </Button>
        </section>
      ) : null}
      {id !== null && tab === "events" && canRecordEvent ? (
        <section className={cn(moduleCardClass, "space-y-5")}>
          <h2 className="text-lg font-semibold text-[#0A0A0A]">Registrar ausência</h2>
          <div className="max-w-md space-y-2">
            <Label className={moduleLabelClass} htmlFor="employee-occurrence-kind">Tipo</Label>
            <SiteSelect
              id="employee-occurrence-kind"
              value={occurrenceKind}
              className="h-12"
              icon={ClipboardList}
              options={absenceKinds
                .filter((value) => isAdmin || manualTimeOffKinds.includes(value))
                .map((value) => ({ value, label: occurrenceKindLabel[value] }))}
              onChange={(value) => {
                setOccurrenceKind(value)
                setReasonId("")
                setOffDraft(emptyTimeOff())
                setOffFileKey((current) => current + 1)
              }}
            />
          </div>
          {manualEvent ? (
            <TimeOffFields idPrefix="employee-off" kind={occurrenceKind} draft={offDraft} fileKey={offFileKey} onChange={setOffDraft} appearance="module" />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DatePickerField id="employee-occurrence-start" label="De" value={startsOn} onChange={setStartsOn} />
              <DatePickerField id="employee-occurrence-end" label="Até" value={endsOn} onChange={setEndsOn} />
            </div>
          )}
          {asksReason ? (
            <div className="max-w-md space-y-2">
              <Label className={moduleLabelClass} htmlFor="employee-occurrence-reason">Motivo</Label>
              <SiteSelect
                id="employee-occurrence-reason"
                value={reasonId}
                searchable
                searchPath="/reasons"
                searchParams={{ kind: occurrenceKind, active: true }}
                searchPlaceholder="Pesquisar motivo"
                placeholder="Selecione"
                className="h-12"
                options={reasons.map((item) => ({ value: String(item.id), label: item.name }))}
                onChange={setReasonId}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label className={moduleLabelClass} htmlFor="employee-occurrence-note">Observação</Label>
            <textarea id="employee-occurrence-note" className={cn(moduleTextClass, "min-h-24")} value={occurrenceNote} onChange={(event) => setOccurrenceNote(event.target.value)} />
          </div>
          <Button type="button" className={modulePrimaryClass} disabled={savingEvent} onClick={() => void saveOccurrence()}>
            {savingEvent ? <Spinner className="h-4 w-4" /> : null}
            Registrar ausência
          </Button>
        </section>
      ) : null}
      {id !== null && tab === "bank" && (isAdmin || role === "manager") ? <HourBankPanel employeeId={id} canLaunch usesBank={usesBank} appearance="module" /> : null}
      {id !== null && tab === "correction" && canCorrect ? <PunchCorrectionForm employeeId={id} appearance="module" guard={locks.lockDay} onSaved={async () => undefined} /> : null}
    </div>
  )
}
