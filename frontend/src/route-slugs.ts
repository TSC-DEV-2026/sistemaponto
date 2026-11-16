const tabAliases: Record<string, string> = {
  funcionarios: "employees",
  funcoes: "jobs",
  jornadas: "journeys",
  grupos: "groups",
  centros: "groups",
  apuracao: "calculations",
  calculation: "calculations",
  banco: "hour-bank",
  fechamento: "closings",
  closing: "closings",
  empresas: "units",
  setores: "sectors",
  equipes: "teams",
  sindicatos: "unions",
  convencoes: "agreements",
  feriados: "holidays",
  regras: "punch-rules",
  allowance: "allowances",
  certificate: "certificates",
  absence: "absences",
  leave: "leaves",
  vacation: "vacations",
  abonos: "allowances",
  atestados: "certificates",
  faltas: "absences",
  ajustes: "adjustments",
  avisos: "notices",
  preferencias: "notice-preferences",
  preferences: "notice-preferences",
  folha: "payroll-totals",
  payroll: "payroll-totals",
  afd: "fiscal-files",
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

function swapPrefix(path: string, from: string, to: string) {
  if (path === from || path.startsWith(`${from}/`)) return `${to}${path.slice(from.length)}`
  return path
}

export function legacyPath(pathname: string, search: string) {
  let path = pathname
  path = swapPrefix(path, "/people", "/staff")
  path = swapPrefix(path, "/schedules", "/timekeeping")
  path = path.replace("/apuracao/", "/calculations/").replace("/calculation/", "/calculations/")
  path = swapPrefix(path, "/timekeeping/journeys", "/journeys")
  path = swapPrefix(path, "/timekeeping/adjustments", "/punches/corrections")
  path = swapPrefix(path, "/timekeeping/hour-bank", "/hour-bank-entries")
  path = swapPrefix(path, "/timekeeping/calculation", "/calculations")
  path = swapPrefix(path, "/staff/jobs", "/jobs")
  path = swapPrefix(path, "/staff/journeys", "/journeys")
  path = swapPrefix(path, "/staff/classifications", "/groups")
  path = swapPrefix(path, "/organization/units", "/units")
  path = swapPrefix(path, "/organization/sectors", "/sectors")
  path = swapPrefix(path, "/organization/teams", "/teams")
  path = swapPrefix(path, "/organization", "/structure")
  path = swapPrefix(path, "/payroll", "/integrations")
  path = swapPrefix(path, "/labor-rules/unions", "/unions")
  path = swapPrefix(path, "/labor-rules/agreements", "/agreements")
  path = swapPrefix(path, "/labor-rules/holidays", "/holidays")
  path = swapPrefix(path, "/labor-rules/punch-rules", "/punch-rules")
  path = swapPrefix(path, "/time-clock", "/punches")
  path = swapPrefix(path, "/notifications", "/notices")
  if (path.startsWith("/staff/cost-centers")) {
    return path.endsWith("/new") ? "/groups/new" : `/staff${canonicalSearch("?tab=groups")}`
  }
  if (path === "/staff/new") path = "/employees/new"
  path = path.replace(/^\/staff\/(\d+)(\/edit)?$/, "/employees/$1$2")
  let kind = ""
  const reason = /^\/reasons\/reason-(adjustment|absence|allowance|certificate)(\/.*)?$/.exec(path)
  if (reason) {
    const rest = reason[2] || ""
    if (!rest || rest === "/new") {
      path = "/reasons/new"
      kind = reason[1]
    } else {
      path = `/reasons${rest}`
    }
  }
  const query = canonicalSearch(search)
  if (!kind) return `${path}${query}`
  return query ? `${path}${query}&kind=${kind}` : `${path}?kind=${kind}`
}
