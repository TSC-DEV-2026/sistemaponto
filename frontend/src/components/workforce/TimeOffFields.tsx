import { fieldClass } from "@/components/workforce/CatalogPanel"
import { Label } from "@/components/ui/label"
import { brazilMoment } from "@/utils/labels"

export type TimeOffDraft = {
  mode: "days" | "hours"
  startsOn: string
  endsOn: string
  startTime: string
  endTime: string
  cid: string
  crm: string
  doctorName: string
  photo: File | null
}

export function emptyTimeOff(): TimeOffDraft {
  return {
    mode: "days",
    startsOn: "",
    endsOn: "",
    startTime: "",
    endTime: "",
    cid: "",
    crm: "",
    doctorName: "",
    photo: null,
  }
}

export function timeOffBody(draft: TimeOffDraft, kind: string) {
  if (!draft.startsOn) {
    throw new Error("Informe o período.")
  }
  const hours = kind !== "vacation" && draft.mode === "hours"
  const body: Record<string, unknown> = {
    starts_on: draft.startsOn,
    ends_on: hours ? draft.startsOn : draft.endsOn || null,
    starts_at: null,
    ends_at: null,
  }
  if (hours) {
    if (!draft.startTime || !draft.endTime) {
      throw new Error("Informe o horário, de e até.")
    }
    body.starts_at = brazilMoment(draft.startsOn, draft.startTime)
    body.ends_at = brazilMoment(draft.startsOn, draft.endTime)
  }
  if (kind === "certificate") {
    body.cid = draft.cid.trim()
    body.crm = draft.crm.trim()
    body.doctor_name = draft.doctorName.trim()
  }
  return body
}

export function TimeOffFields({
  idPrefix,
  kind,
  draft,
  fileKey,
  onChange,
}: {
  idPrefix: string
  kind: string
  draft: TimeOffDraft
  fileKey: number
  onChange: (next: TimeOffDraft) => void
}) {
  function patch(partial: Partial<TimeOffDraft>) {
    onChange({ ...draft, ...partial })
  }

  const daysOnly = kind === "vacation"
  const mode = daysOnly ? "days" : draft.mode

  return (
    <>
      {daysOnly ? null : (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-mode`}>Período</Label>
          <select id={`${idPrefix}-mode`} className={fieldClass} value={mode} onChange={(event) => patch({ mode: event.target.value === "hours" ? "hours" : "days" })}>
            <option value="days">Dia inteiro ou vários dias</option>
            <option value="hours">Algumas horas de um dia</option>
          </select>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-start`}>{mode === "hours" ? "Dia" : "De"}</Label>
        <input id={`${idPrefix}-start`} className={fieldClass} type="date" value={draft.startsOn} onChange={(event) => patch({ startsOn: event.target.value })} required />
      </div>
      {mode === "days" ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-end`}>Até</Label>
          <input id={`${idPrefix}-end`} className={fieldClass} type="date" value={draft.endsOn} onChange={(event) => patch({ endsOn: event.target.value })} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-from`}>De</Label>
            <input id={`${idPrefix}-from`} className={fieldClass} type="time" value={draft.startTime} onChange={(event) => patch({ startTime: event.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-to`}>Até</Label>
            <input id={`${idPrefix}-to`} className={fieldClass} type="time" value={draft.endTime} onChange={(event) => patch({ endTime: event.target.value })} required />
          </div>
        </div>
      )}
      {kind === "certificate" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-cid`}>CID</Label>
            <input id={`${idPrefix}-cid`} className={fieldClass} value={draft.cid} maxLength={16} onChange={(event) => patch({ cid: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-crm`}>CRM</Label>
            <input id={`${idPrefix}-crm`} className={fieldClass} value={draft.crm} maxLength={32} onChange={(event) => patch({ crm: event.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-doctor`}>Nome do médico</Label>
            <input id={`${idPrefix}-doctor`} className={fieldClass} value={draft.doctorName} maxLength={255} onChange={(event) => patch({ doctorName: event.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-photo`}>Foto do atestado</Label>
            <input
              key={fileKey}
              id={`${idPrefix}-photo`}
              className={fieldClass}
              type="file"
              accept="image/png,image/jpeg"
              onChange={(event) => patch({ photo: event.target.files?.[0] ?? null })}
            />
          </div>
        </>
      ) : null}
    </>
  )
}

export function DocumentLink({ href, label = "Ver documento" }: { href: string | null; label?: string }) {
  if (!href) {
    return null
  }
  return (
    <a className="font-medium" href={href} target="_blank" rel="noreferrer">
      {label}
    </a>
  )
}
