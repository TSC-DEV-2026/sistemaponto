import { catalogs } from "@/pages/workforce/catalogs"
import { occurrenceNewLabel } from "@/utils/labels"

export type PageHeading = {
  title: string
  subtitle: string
}

type Pattern = PageHeading & {
  path: string
}

const catalogAreas: Record<string, { base: string; subtitle: string }> = {
  journeys: { base: "/schedules/journeys", subtitle: "Acompanhe as jornadas e marcações" },
  jobs: { base: "/people/jobs", subtitle: "Gerencie os funcionários" },
  "cost-centers": { base: "/people/cost-centers", subtitle: "Gerencie os funcionários" },
  units: { base: "/organization/units", subtitle: "Gerencie a estrutura da empresa" },
  sectors: { base: "/organization/sectors", subtitle: "Gerencie a estrutura da empresa" },
  teams: { base: "/organization/teams", subtitle: "Gerencie a estrutura da empresa" },
  unions: { base: "/labor-rules/unions", subtitle: "Configure as regras trabalhistas" },
  agreements: { base: "/labor-rules/agreements", subtitle: "Configure as regras trabalhistas" },
  holidays: { base: "/labor-rules/holidays", subtitle: "Configure as regras trabalhistas" },
  "punch-rules": { base: "/labor-rules/punch-rules", subtitle: "Configure as regras trabalhistas" },
  "reason-adjustment": { base: "/reasons/reason-adjustment", subtitle: "Gerencie os motivos cadastrados" },
  "reason-absence": { base: "/reasons/reason-absence", subtitle: "Gerencie os motivos cadastrados" },
  "reason-allowance": { base: "/reasons/reason-allowance", subtitle: "Gerencie os motivos cadastrados" },
  "reason-certificate": { base: "/reasons/reason-certificate", subtitle: "Gerencie os motivos cadastrados" },
}

function recordNoun(editTitle: string) {
  const rest = editTitle.replace(/^Editar\s+/, "")
  return rest.charAt(0).toLocaleUpperCase("pt-BR") + rest.slice(1)
}

function catalogPatterns(): Pattern[] {
  return Object.entries(catalogAreas).flatMap(([key, area]) => {
    const entry = catalogs[key]
    return [
      { path: `${area.base}/new`, title: entry.newLabel, subtitle: area.subtitle },
      { path: `${area.base}/:id/edit`, title: entry.editTitle, subtitle: area.subtitle },
      { path: `${area.base}/:id`, title: recordNoun(entry.editTitle), subtitle: area.subtitle },
    ]
  })
}

const patterns: Pattern[] = [
  ...catalogPatterns(),
  { path: "/", title: "Dashboard", subtitle: "Visão geral do sistema" },
  { path: "/schedules", title: "Jornada e Ponto", subtitle: "Acompanhe as jornadas e marcações" },
  { path: "/schedules/apuracao/:workDate", title: "Detalhes da apuração", subtitle: "Detalhamento das horas apuradas" },
  { path: "/schedules/adjustments", title: "Ajustar marcações", subtitle: "Corrija as marcações do dia" },
  { path: "/schedules/hour-bank/new", title: "Novo lançamento", subtitle: "Lance no banco de horas" },
  { path: "/time-clock", title: "Registro de Ponto", subtitle: "Registre e consulte suas marcações" },
  { path: "/occurrences/new", title: "Novo lançamento", subtitle: "Lance um ajuste ou uma ocorrência" },
  { path: "/occurrences", title: "Ajustes e Ocorrências", subtitle: "Gerencie ajustes e ocorrências" },
  { path: "/requests", title: "Solicitações", subtitle: "Acompanhe solicitações e pendências" },
  { path: "/requests/new", title: "Nova solicitação", subtitle: "Informe o pedido" },
  { path: "/closings", title: "Fechamento do Ponto", subtitle: "Gerencie os períodos de fechamento" },
  { path: "/people", title: "Pessoas", subtitle: "Gerencie os funcionários" },
  { path: "/people/new", title: "Novo funcionário", subtitle: "Cadastro da ficha" },
  { path: "/people/:id/edit", title: "Editar funcionário", subtitle: "Atualize a ficha" },
  { path: "/people/:id", title: "Funcionário", subtitle: "Ficha do funcionário" },
  { path: "/bulk-changes", title: "Operações em massa", subtitle: "Altere várias pessoas de uma vez" },
  { path: "/reports", title: "Relatórios", subtitle: "Consulte informações e indicadores" },
  { path: "/organization", title: "Estrutura Organizacional", subtitle: "Gerencie a estrutura da empresa" },
  { path: "/labor-rules", title: "Regras Trabalhistas", subtitle: "Configure as regras trabalhistas" },
  { path: "/payroll", title: "Fiscal / Folha", subtitle: "Consulte integrações e informações" },
  { path: "/reasons", title: "Motivos", subtitle: "Gerencie os motivos cadastrados" },
  { path: "/notifications", title: "Notificações", subtitle: "Avisos da conta e da empresa" },
  { path: "/memberships", title: "Permissões e Acessos", subtitle: "Gerencie permissões e usuários" },
  { path: "/memberships/new", title: "Vincular pessoa", subtitle: "Novo acesso ao sistema" },
  { path: "/memberships/:id", title: "Acesso", subtitle: "Papel desta pessoa" },
  { path: "/plan", title: "Plano e Assinatura", subtitle: "Consulte os dados da assinatura" },
  { path: "/settings", title: "Configurações", subtitle: "Personalize as configurações do sistema" },
  { path: "/change-password", title: "Trocar senha", subtitle: "Altere a senha de acesso" },
  { path: "/tenants", title: "Empresas", subtitle: "Empresas deste sistema" },
  { path: "/tenants/:id", title: "Empresa", subtitle: "Dados da empresa" },
]

function segments(path: string) {
  return path.split("/").filter(Boolean)
}

function matches(pattern: string, pathname: string) {
  if (pattern === "/") {
    return pathname === "/"
  }
  const left = segments(pattern)
  const right = segments(pathname)
  if (left.length !== right.length) {
    return false
  }
  return left.every((part, index) => part.startsWith(":") || part === right[index])
}

function score(pattern: string) {
  const left = segments(pattern)
  const literals = left.filter((part) => !part.startsWith(":")).length
  return literals * 10 + left.length
}

export function headingFor(pathname: string, search = ""): PageHeading {
  let best: Pattern | null = null
  let bestScore = -1
  for (const item of patterns) {
    if (!matches(item.path, pathname)) {
      continue
    }
    const value = score(item.path)
    if (value > bestScore) {
      best = item
      bestScore = value
    }
  }
  if (!best) return { title: "sistemaponto", subtitle: "" }
  if (best.path === "/occurrences/new") {
    const kind = new URLSearchParams(search).get("tipo") || ""
    const title = occurrenceNewLabel[kind]
    if (title) return { ...best, title }
  }
  return best
}
