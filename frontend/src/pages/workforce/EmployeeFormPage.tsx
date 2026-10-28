import { FormEvent, useEffect, useState } from "react"
import { Save } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"

import { ActionForm } from "@/components/ui/action-form"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { CpfField } from "@/components/ui/cpf-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fieldClass } from "@/components/workforce/CatalogPanel"
import { createRecord, getRecord, updateRecord, type Employee } from "@/services/workforce.service"
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

  return (
    <ActionForm className="mx-auto max-w-lg space-y-4" onSubmit={onSubmit}>
      <BackLink to="/people" />
      <p className="text-sm text-muted-foreground">
        {id === null
          ? "O funcionário nasce ativo. O acesso nasce deste CPF. O e-mail é obrigatório quando a pessoa ainda não existe. A senha não fica neste sistema. O papel continua em Permissões e Acessos."
          : "A alteração não troca o acesso já gravado. A senha não fica neste sistema. O papel continua em Permissões e Acessos."}
      </p>
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cpf">CPF</Label>
        <CpfField id="cpf" value={cpf} onValueChange={setCpf} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        {id === null ? <p className="text-sm text-muted-foreground">Obrigatório se este CPF ainda não tiver pessoa.</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="admission">Admissão</Label>
        <input id="admission" className={fieldClass} type="date" value={admission} onChange={(event) => setAdmission(event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="clock-method">Tipo de registro</Label>
        <select id="clock-method" className={fieldClass} value={clockMethod} onChange={(event) => setClockMethod(event.target.value)}>
          {Object.entries(clockMethodLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground">O aplicativo mostra só este tipo. Quem já existe fica em Simples.</p>
      </div>
      {clockMethod === "face" ? (
        <div className="space-y-2">
          <Label htmlFor="face-image">Foto de referência</Label>
          <input id="face-image" className={fieldClass} type="file" accept="image/png,image/jpeg" onChange={(event) => setFaceFile(event.target.files?.[0] ?? null)} />
          {faceUrl ? (
            <a className="text-sm font-medium" href={faceUrl} target="_blank" rel="noreferrer">
              Ver foto de referência
            </a>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Pode ficar vazia. Sem a foto, a batida responde que não há foto de referência. Quando enviada, o servidor guarda o embedding e a foto.
          </p>
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="registration">Matrícula</Label>
        <Input id="registration" value={registration} onChange={(event) => setRegistration(event.target.value)} />
        <p className="text-sm text-muted-foreground">Pode ficar vazia. O QR exige matrícula e unidade vigente. Na empresa ela não se repete.</p>
      </div>
      <label className="flex items-center gap-2 text-sm" htmlFor="hour-bank">
        <input id="hour-bank" type="checkbox" checked={hourBank} onChange={(event) => setHourBank(event.target.checked)} />
        Usa banco de horas
      </label>
      <div className="space-y-2">
        <Label htmlFor="note">Observação</Label>
        <textarea id="note" className="min-h-20 w-full rounded-md border border-border bg-card px-3 py-2 text-sm" value={note} onChange={(event) => setNote(event.target.value)} />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit">
        <Save className="h-4 w-4" />
        Salvar
      </Button>
    </ActionForm>
  )
}
