const tabAliases: Record<string, string> = {
  funcionarios: "employees",
  funcoes: "jobs",
  jornadas: "journeys",
  grupos: "groups",
  centros: "groups",
  apuracao: "calculation",
  banco: "hour-bank",
  fechamento: "closing",
  empresas: "units",
  setores: "sectors",
  equipes: "teams",
  sindicatos: "unions",
  convencoes: "agreements",
  feriados: "holidays",
  regras: "punch-rules",
  abonos: "allowances",
  atestados: "certificates",
  faltas: "absences",
  ajustes: "adjustments",
  avisos: "notices",
  preferencias: "preferences",
  folha: "payroll",
  assinaturas: "subscriptions",
  contratacao: "contract",
}

export function canonicalTab(value: string | null) {
  if (!value) return ""
  return tabAliases[value] || value
}

export function canonicalSearch(search: string) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  const tab = params.get("tab") || params.get("aba")
  if (params.has("aba") || (tab && tabAliases[tab])) {
    params.delete("aba")
    if (tab) params.set("tab", canonicalTab(tab))
  }
  if (params.has("tipo") && !params.get("kind")) {
    params.set("kind", params.get("tipo") || "")
    params.delete("tipo")
  }
  const query = params.toString()
  return query ? `?${query}` : ""
}

export function legacyPath(pathname: string, search: string) {
  let path = pathname
  if (path === "/people" || path.startsWith("/people/")) path = `/staff${path.slice("/people".length)}`
  if (path === "/schedules" || path.startsWith("/schedules/")) path = `/timekeeping${path.slice("/schedules".length)}`
  path = path.replace("/apuracao/", "/calculation/")
  if (path.startsWith("/timekeeping/journeys")) path = path.replace("/timekeeping/journeys", "/staff/journeys")
  if (path.startsWith("/staff/cost-centers")) {
    return path.endsWith("/new") ? "/staff/classifications/new" : `/staff${canonicalSearch("?tab=groups")}`
  }
  return `${path}${canonicalSearch(search)}`
}
