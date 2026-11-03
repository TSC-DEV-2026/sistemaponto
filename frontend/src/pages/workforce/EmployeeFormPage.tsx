import { FormEvent, useEffect, useState } from "react"
import { Info, Save, User } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { CpfField } from "@/components/ui/cpf-field"
import { DatePickerField } from "@/components/ui/date-picker-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteSelect } from "@/components/ui/site-select"
import { moduleCardClass, moduleFieldClass, moduleLabelClass, modulePrimaryClass, moduleTextClass } from "@/components/workforce/module-visual"
import { CertificatePhotoField } from "@/components/workforce/TimeOffFields"
import { createRecord, getRecord, updateRecord, type Employee } from "@/services/workforce.service"
import { cn } from "@/utils/cn"
import { formatCpf, onlyDigits } from "@/utils/digits"
import { clockMethodLabel } from "@/utils/labels"

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
  const [error, setError] = useState("")

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
      <BackLink to="/people" appearance="detail" />
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
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end border-t border-[#F1F5F9] pt-5">
          <Button type="submit" className={modulePrimaryClass}>
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </div>
      </ActionForm>
    </div>
  )
}
