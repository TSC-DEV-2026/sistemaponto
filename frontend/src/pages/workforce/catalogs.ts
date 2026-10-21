import { optionsOf, type CatalogField } from "@/components/workforce/CatalogPanel"

export type Catalog = {
  path: string
  newLabel: string
  editTitle: string
  empty: string
  backTo: string
  fields: CatalogField[]
  kind?: string
}

export const catalogs: Record<string, Catalog> = {
  jobs: {
    path: "/jobs",
    newLabel: "Novo cargo",
    editTitle: "Editar cargo",
    empty: "Nenhum cargo.",
    backTo: "/people?aba=cargos",
    fields: [{ name: "name", label: "Nome", type: "text", required: true }],
  },
  "cost-centers": {
    path: "/cost-centers",
    newLabel: "Novo centro de custo",
    editTitle: "Editar centro de custo",
    empty: "Nenhum centro de custo.",
    backTo: "/people?aba=centros",
    fields: [{ name: "name", label: "Nome", type: "text", required: true }],
  },
  units: {
    path: "/units",
    newLabel: "Nova unidade",
    editTitle: "Editar unidade",
    empty: "Nenhuma unidade.",
    backTo: "/organization?aba=unidades",
    fields: [{ name: "name", label: "Nome da unidade", type: "text", required: true }],
  },
  sectors: {
    path: "/sectors",
    newLabel: "Novo setor",
    editTitle: "Editar setor",
    empty: "Nenhum setor.",
    backTo: "/organization?aba=setores",
    fields: [
      { name: "name", label: "Nome do setor", type: "text", required: true },
      { name: "unit_id", label: "Unidade", type: "select", required: true, loadOptions: () => optionsOf("/units") },
    ],
  },
  teams: {
    path: "/teams",
    newLabel: "Nova equipe",
    editTitle: "Editar equipe",
    empty: "Nenhuma equipe.",
    backTo: "/organization?aba=equipes",
    fields: [
      { name: "name", label: "Nome da equipe", type: "text", required: true },
      { name: "sector_id", label: "Setor", type: "select", required: true, loadOptions: () => optionsOf("/sectors") },
    ],
  },
  unions: {
    path: "/unions",
    newLabel: "Novo sindicato",
    editTitle: "Editar sindicato",
    empty: "Nenhum sindicato.",
    backTo: "/labor-rules?aba=sindicatos",
    fields: [{ name: "name", label: "Nome do sindicato", type: "text", required: true }],
  },
  agreements: {
    path: "/labor-agreements",
    newLabel: "Nova convenção",
    editTitle: "Editar convenção ou acordo",
    empty: "Nenhuma convenção.",
    backTo: "/labor-rules?aba=convencoes",
    fields: [
      { name: "name", label: "Nome da convenção ou do acordo", type: "text", required: true },
      { name: "union_id", label: "Sindicato", type: "select", loadOptions: () => optionsOf("/unions") },
      { name: "valid_from", label: "Início", type: "date", required: true },
      { name: "valid_to", label: "Fim", type: "date" },
      { name: "note", label: "Observação", type: "textarea" },
    ],
  },
  holidays: {
    path: "/holidays",
    newLabel: "Novo feriado",
    editTitle: "Editar feriado",
    empty: "Nenhum feriado.",
    backTo: "/labor-rules?aba=feriados",
    fields: [
      { name: "name", label: "Nome do feriado", type: "text", required: true },
      { name: "holiday_date", label: "Data", type: "date", required: true },
      { name: "note", label: "Observação", type: "textarea" },
    ],
  },
  "punch-rules": {
    path: "/punch-rules",
    newLabel: "Nova regra de ponto",
    editTitle: "Editar regra de ponto",
    empty: "Nenhuma regra de ponto.",
    backTo: "/labor-rules?aba=regras",
    fields: [
      { name: "name", label: "Nome da regra de ponto", type: "text", required: true },
      { name: "note", label: "Observação", type: "textarea" },
    ],
  },
  "reason-adjustment": {
    path: "/reasons",
    newLabel: "Novo ajuste",
    editTitle: "Editar ajuste",
    empty: "Nenhum ajuste.",
    backTo: "/reasons?aba=ajustes",
    kind: "adjustment",
    fields: [
      { name: "name", label: "Nome", type: "text", required: true },
      { name: "active", label: "Situação", type: "checkbox" },
    ],
  },
  "reason-absence": {
    path: "/reasons",
    newLabel: "Nova falta",
    editTitle: "Editar falta",
    empty: "Nenhuma falta.",
    backTo: "/reasons?aba=faltas",
    kind: "absence",
    fields: [
      { name: "name", label: "Nome", type: "text", required: true },
      { name: "active", label: "Situação", type: "checkbox" },
    ],
  },
  "reason-allowance": {
    path: "/reasons",
    newLabel: "Novo abono",
    editTitle: "Editar abono",
    empty: "Nenhum abono.",
    backTo: "/reasons?aba=abonos",
    kind: "allowance",
    fields: [
      { name: "name", label: "Nome", type: "text", required: true },
      { name: "active", label: "Situação", type: "checkbox" },
    ],
  },
  "reason-certificate": {
    path: "/reasons",
    newLabel: "Novo atestado",
    editTitle: "Editar atestado",
    empty: "Nenhum atestado.",
    backTo: "/reasons?aba=atestados",
    kind: "certificate",
    fields: [
      { name: "name", label: "Nome", type: "text", required: true },
      { name: "active", label: "Situação", type: "checkbox" },
    ],
  },
}
