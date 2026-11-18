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
      { name: "tolerance_minutes", label: "Tolerância (minutos)", type: "number", required: true, defaultValue: "10", min: 0, max: 240 },
      { name: "minimum_interval", label: "Intervalo mínimo", type: "duration", required: true, defaultValue: "01:00" },
      { name: "night_start", label: "Período noturno (início)", type: "time", required: true, defaultValue: "22:00" },
      { name: "night_end", label: "Período noturno (fim)", type: "time", required: true, defaultValue: "05:00" },
      { name: "night_additional_percent", label: "Adicional (H. noturnas) (%)", type: "number", required: true, defaultValue: "20", min: 0, max: 100 },
      { name: "note", label: "Observação", type: "textarea" },
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
          { value: "adjustment", label: "Correção" },
        ],
      },
    ],
  },
}
