import { FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fieldClass } from "@/components/workforce/CatalogPanel"
import { createRecord, type Employee } from "@/services/workforce.service"
import { onlyDigits } from "@/utils/digits"

export function EmployeeFormPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState("")
  const [cpf, setCpf] = useState("")
  const [email, setEmail] = useState("")
  const [personId, setPersonId] = useState("")
  const [admission, setAdmission] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState("")

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      const created = await createRecord<Employee>("/employees", {
        full_name: fullName.trim(),
        cpf: onlyDigits(cpf),
        email: email.trim() || null,
        person_id: personId.trim() ? Number(personId) : null,
        admission_date: admission,
        note: note.trim() || null,
      })
      navigate(`/people/${created.id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.")
    }
  }

  return (
    <form className="mx-auto max-w-lg space-y-4" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">Novo funcionário</h1>
      <p className="text-sm text-muted-foreground">O funcionário nasce ativo. A senha não fica neste sistema. O número de acesso, se houver, está em Permissões e Acessos.</p>
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cpf">CPF</Label>
        <Input id="cpf" value={cpf} onChange={(event) => setCpf(event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="person">Acesso (person id)</Label>
        <Input id="person" value={personId} onChange={(event) => setPersonId(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admission">Admissão</Label>
        <input id="admission" className={fieldClass} type="date" value={admission} onChange={(event) => setAdmission(event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Observação</Label>
        <textarea id="note" className="min-h-20 w-full rounded-md border border-border bg-card px-3 py-2 text-sm" value={note} onChange={(event) => setNote(event.target.value)} />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit">Salvar</Button>
    </form>
  )
}
