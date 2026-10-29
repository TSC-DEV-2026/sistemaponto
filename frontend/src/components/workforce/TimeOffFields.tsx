import { useState } from "react"
import { FileImage, Upload } from "lucide-react"

import { DatePickerField } from "@/components/ui/date-picker-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteSelect } from "@/components/ui/site-select"
import { TimePickerField } from "@/components/ui/time-picker-field"
import { fieldClass } from "@/components/workforce/CatalogPanel"
import { moduleFieldClass, moduleLabelClass, modulePrimaryClass } from "@/components/workforce/module-visual"
import { cn } from "@/utils/cn"
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
  appearance = "plain",
}: {
  idPrefix: string
  kind: string
  draft: TimeOffDraft
  fileKey: number
  onChange: (next: TimeOffDraft) => void
  appearance?: "plain" | "module"
}) {
  const [photoOver, setPhotoOver] = useState(false)

  function patch(partial: Partial<TimeOffDraft>) {
    onChange({ ...draft, ...partial })
  }

  const daysOnly = kind === "vacation"
  const mode = daysOnly ? "days" : draft.mode

  if (appearance === "module") {
    return (
      <>
        {daysOnly ? null : (
          <div className="space-y-2">
            <Label className={moduleLabelClass} htmlFor={`${idPrefix}-mode`}>
              Período
            </Label>
            <SiteSelect
              id={`${idPrefix}-mode`}
              value={mode}
              options={[
                { value: "days", label: "Dia inteiro ou vários dias" },
                { value: "hours", label: "Algumas horas de um dia" },
              ]}
              onChange={(value) => patch({ mode: value === "hours" ? "hours" : "days" })}
            />
          </div>
        )}
        {mode === "days" ? (
          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
            <DatePickerField id={`${idPrefix}-start`} label="De" value={draft.startsOn} onChange={(startsOn) => patch({ startsOn })} required />
            <DatePickerField id={`${idPrefix}-end`} label="Até" value={draft.endsOn} onChange={(endsOn) => patch({ endsOn })} />
          </div>
        ) : (
          <>
            <DatePickerField id={`${idPrefix}-start`} label="Dia" value={draft.startsOn} onChange={(startsOn) => patch({ startsOn })} required />
            <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
              <TimePickerField id={`${idPrefix}-from`} label="De" value={draft.startTime} onChange={(startTime) => patch({ startTime })} required />
              <TimePickerField id={`${idPrefix}-to`} label="Até" value={draft.endTime} onChange={(endTime) => patch({ endTime })} required />
            </div>
          </>
        )}
        {kind === "certificate" ? (
          <div className="grid min-w-0 grid-cols-1 gap-4 border-t border-[#F0F0F2] pt-5 lg:grid-cols-2">
            <p className="text-sm font-semibold text-[#1B2534] lg:col-span-2">Dados do atestado</p>
            <div className="space-y-2">
              <Label className={moduleLabelClass} htmlFor={`${idPrefix}-cid`}>
                CID
              </Label>
              <Input id={`${idPrefix}-cid`} className={moduleFieldClass} value={draft.cid} maxLength={16} onChange={(event) => patch({ cid: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className={moduleLabelClass} htmlFor={`${idPrefix}-crm`}>
                CRM
              </Label>
              <Input id={`${idPrefix}-crm`} className={moduleFieldClass} value={draft.crm} maxLength={32} onChange={(event) => patch({ crm: event.target.value })} required />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label className={moduleLabelClass} htmlFor={`${idPrefix}-doctor`}>
                Nome do médico
              </Label>
              <Input id={`${idPrefix}-doctor`} className={moduleFieldClass} value={draft.doctorName} maxLength={255} onChange={(event) => patch({ doctorName: event.target.value })} required />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label className={moduleLabelClass} htmlFor={`${idPrefix}-photo`}>
                Foto do atestado
              </Label>
              <input
                key={fileKey}
                id={`${idPrefix}-photo`}
                className="peer sr-only"
                type="file"
                accept="image/png,image/jpeg,application/pdf"
                onChange={(event) => patch({ photo: event.target.files?.[0] ?? null })}
              />
              <label
                htmlFor={`${idPrefix}-photo`}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-dashed bg-[rgba(30,138,58,0.04)] px-4 py-3 transition-[border-color,background-color,box-shadow] duration-200 peer-focus-visible:border-[#1E8A3A] peer-focus-visible:shadow-[0_0_0_3px_rgba(30,138,58,0.12)] motion-reduce:transition-none",
                  photoOver ? "border-[#1E8A3A] bg-[rgba(30,138,58,0.08)]" : "border-[#B7D7C3]",
                )}
                onDragOver={(event) => {
                  event.preventDefault()
                  setPhotoOver(true)
                }}
                onDragLeave={() => setPhotoOver(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setPhotoOver(false)
                  const file = event.dataTransfer.files?.[0]
                  if (!file) return
                  const allowed = !file.type || file.type === "image/png" || file.type === "image/jpeg" || file.type === "application/pdf"
                  if (allowed) patch({ photo: file })
                }}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.12)] text-[#1E8A3A]">
                    <FileImage className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#0A0A0A]">{draft.photo ? draft.photo.name : "Arraste ou selecione o atestado"}</span>
                    <span className="mt-0.5 block text-xs text-[#71717A]">PNG, JPG ou PDF (máx. 10 MB)</span>
                  </span>
                </span>
                <span className={cn(modulePrimaryClass, "inline-flex shrink-0 items-center gap-2")}>
                  <Upload className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  Escolher arquivo
                </span>
              </label>
            </div>
          </div>
        ) : null}
      </>
    )
  }

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

export function DocumentLink({ href, label = "Ver documento", className }: { href: string | null; label?: string; className?: string }) {
  if (!href) {
    return null
  }
  return (
    <a className={className || "font-medium"} href={href} target="_blank" rel="noreferrer">
      {label}
    </a>
  )
}
