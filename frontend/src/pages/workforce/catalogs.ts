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
  categories: {
    path: "/categories",
    newLabel: "Nova categoria",
    editTitle: "Editar categoria",
    empty: "Nenhuma categoria.",
    backTo: "/structure?tab=categories",
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
  teams: {
    path: "/teams",
    newLabel: "Nova equipe",
    editTitle: "Editar equipe",
    empty: "Nenhuma equipe.",
    backTo: "/structure?tab=teams",
    fields: [
      { name: "name", label: "Nome da equipe", type: "text", required: true },
      { name: "unit_id", label: "Empresa", type: "select", required: true, searchPath: "/units", loadOptions: () => optionsOf("/units") },
    ],
  },
  norms: {
    path: "/norms",
    newLabel: "Nova norma",
    editTitle: "Editar norma",
    empty: "Nenhuma norma.",
    backTo: "/punch-rules?tab=norms",
    fields: [
      { name: "name", label: "Nome da norma", type: "text", required: true },
      { name: "union_name", label: "Sindicato", type: "text", required: true },
      {
        name: "kind",
        label: "Tipo",
        type: "select",
        required: true,
        options: [
          { value: "convention", label: "Convenção" },
          { value: "agreement", label: "Acordo" },
        ],
      },
      { name: "valid_from", label: "Início", type: "date", required: true },
      { name: "valid_to", label: "Fim", type: "date" },
      { name: "note", label: "Regras de ponto", type: "textarea" },
    ],
  },
  holidays: {
    path: "/holidays",
    newLabel: "Novo feriado",
    editTitle: "Editar feriado",
    empty: "Nenhum feriado.",
    backTo: "/punch-rules?tab=holidays",
    fields: [
      { name: "name", label: "Nome do feriado", type: "text", required: true },
      { name: "holiday_date", label: "Data", type: "date", required: true },
      { name: "note", label: "Observação", type: "textarea" },
    ],
  },
  reasons: {
    path: "/reasons",
    newLabel: "Novo motivo",
    editTitle: "Editar motivo",
    empty: "Nenhum motivo.",
    backTo: "/punch-rules?tab=reasons",
    fields: [
      { name: "name", label: "Nome", type: "text", required: true },
      {
        name: "kind",
        label: "Tipo",
        type: "select",
        required: true,
        options: [
          { value: "allowance", label: "Abono" },
          { value: "certificate", label: "Atestado" },
          { value: "absence", label: "Falta" },
          { value: "adjustment", label: "Ajuste" },
        ],
      },
    ],
  },
}
