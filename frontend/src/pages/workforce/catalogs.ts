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
  journeys: {
    path: "/journeys",
    newLabel: "Nova jornada",
    editTitle: "Editar jornada",
    empty: "Nenhuma jornada.",
    backTo: "/staff?tab=journeys",
    fields: [
      { name: "name", label: "Nome", type: "text", required: true },
      { name: "note", label: "Observação", type: "textarea" },
    ],
  },
  jobs: {
    path: "/jobs",
    newLabel: "Nova função",
    editTitle: "Editar função",
    empty: "Nenhuma função.",
    backTo: "/staff?tab=jobs",
    fields: [{ name: "name", label: "Nome", type: "text", required: true }],
  },
  groups: {
    path: "/groups",
    newLabel: "Novo grupo",
    editTitle: "Editar grupo",
    empty: "Nenhum grupo.",
    backTo: "/staff?tab=groups",
    fields: [{ name: "name", label: "Nome", type: "text", required: true }],
  },
  units: {
    path: "/units",
    newLabel: "Nova empresa",
    editTitle: "Editar empresa",
    empty: "Nenhuma empresa.",
    backTo: "/structure?tab=units",
    fields: [{ name: "name", label: "Nome da empresa", type: "text", required: true }],
  },
  sectors: {
    path: "/sectors",
    newLabel: "Novo setor",
    editTitle: "Editar setor",
    empty: "Nenhum setor.",
    backTo: "/structure?tab=sectors",
    fields: [
      { name: "name", label: "Nome do setor", type: "text", required: true },
      { name: "unit_id", label: "Empresa", type: "select", required: true, searchPath: "/units", loadOptions: () => optionsOf("/units") },
    ],
  },
  teams: {
    path: "/teams",
    newLabel: "Nova equipe",
    editTitle: "Editar equipe",
    empty: "Nenhuma equipe.",
    backTo: "/structure?tab=teams",
    fields: [
      { name: "name", label: "Nome da equipe", type: "text", required: true },
      { name: "sector_id", label: "Setor", type: "select", required: true, searchPath: "/sectors", loadOptions: () => optionsOf("/sectors") },
    ],
  },
  unions: {
    path: "/unions",
    newLabel: "Novo sindicato",
    editTitle: "Editar sindicato",
    empty: "Nenhum sindicato.",
    backTo: "/labor-rules?tab=unions",
    fields: [{ name: "name", label: "Nome do sindicato", type: "text", required: true }],
  },
  agreements: {
    path: "/agreements",
    newLabel: "Nova convenção",
    editTitle: "Editar convenção ou acordo",
    empty: "Nenhuma convenção.",
    backTo: "/labor-rules?tab=agreements",
    fields: [
      { name: "name", label: "Nome da convenção ou do acordo", type: "text", required: true },
      { name: "union_id", label: "Sindicato", type: "select", searchPath: "/unions", loadOptions: () => optionsOf("/unions") },
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
    backTo: "/labor-rules?tab=holidays",
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
    backTo: "/labor-rules?tab=punch-rules",
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
    backTo: "/reasons?tab=adjustments",
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
    backTo: "/reasons?tab=absences",
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
    backTo: "/reasons?tab=allowances",
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
    backTo: "/reasons?tab=certificates",
    kind: "certificate",
    fields: [
      { name: "name", label: "Nome", type: "text", required: true },
      { name: "active", label: "Situação", type: "checkbox" },
    ],
  },
}
