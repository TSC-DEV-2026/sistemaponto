import { catalogs } from "@/pages/workforce/catalogs"
import { occurrenceKindOf, occurrenceNewLabel } from "@/utils/labels"

export type PageHeading = {
  title: string
  subtitle: string
}

type Pattern = PageHeading & {
  path: string
}

const catalogAreas: Record<string, { base: string; subtitle: string }> = {
  journeys: { base: "/journeys", subtitle: "Cadastre as jornadas" },
  jobs: { base: "/jobs", subtitle: "Gerencie os funcionários" },
  categories: { base: "/categories", subtitle: "Gerencie a estrutura da organização" },
  units: { base: "/units", subtitle: "Gerencie a estrutura da organização" },
  teams: { base: "/teams", subtitle: "Gerencie a estrutura da organização" },
  norms: { base: "/norms", subtitle: "Configure as regras de ponto" },
  holidays: { base: "/holidays", subtitle: "Configure as regras de ponto" },
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
  { path: "/timekeeping", title: "Ponto", subtitle: "Apure o período, consulte o banco de horas e feche o período" },
  { path: "/calculations/:workDate", title: "Detalhes da apuração", subtitle: "Detalhamento das horas apuradas" },
  { path: "/punches/corrections", title: "Ajustar marcações", subtitle: "Corrija as marcações do dia" },
  { path: "/hour-bank-entries/new", title: "Novo lançamento", subtitle: "Some, diminua, lance o saldo ou quite o saldo" },
  { path: "/hour-bank-entries/:id/edit", title: "Editar lançamento", subtitle: "Some, diminua, lance o saldo ou quite o saldo" },
  { path: "/punches", title: "Registro", subtitle: "Registre e consulte suas marcações" },
  { path: "/reasons/new", title: "Novo motivo", subtitle: "Configure as regras de ponto" },
  { path: "/reasons/:id/edit", title: "Editar motivo", subtitle: "Configure as regras de ponto" },
  { path: "/reasons/:id", title: "Motivo", subtitle: "Configure as regras de ponto" },
  { path: "/occurrences/new", title: "Nova ocorrência", subtitle: "Lance abono, atestado, falta, afastamento ou férias" },
  { path: "/occurrences/:id/edit", title: "Editar ocorrência", subtitle: "Atualize a observação do lançamento" },
  { path: "/occurrences/:id", title: "Ocorrência", subtitle: "Consulta do lançamento" },
  { path: "/occurrences", title: "Ocorrências", subtitle: "Consulte e lance as ocorrências" },
  { path: "/requests", title: "Solicitações", subtitle: "Acompanhe solicitações e pendências" },
  { path: "/requests/new", title: "Nova solicitação", subtitle: "Informe o pedido" },
  { path: "/closings/new", title: "Novo fechamento", subtitle: "Selecione o período e quem entra no fechamento." },
  { path: "/closings/:id", title: "Fechamento", subtitle: "Banco de horas e resultado do período" },
  { path: "/closings", title: "Ponto", subtitle: "Apure o período, consulte o banco de horas e feche o período" },
  { path: "/categories/:id/values/new", title: "Novo valor", subtitle: "Gerencie a estrutura da organização" },
  { path: "/categories/:id/values/:valueId/edit", title: "Editar valor", subtitle: "Gerencie a estrutura da organização" },
  { path: "/categories/:id/values/:valueId", title: "Valor", subtitle: "Gerencie a estrutura da organização" },
  { path: "/staff", title: "Quadro", subtitle: "Funcionários, funções e jornadas" },
  { path: "/employees/new", title: "Novo funcionário", subtitle: "Cadastro da ficha" },
  { path: "/employees/:id/edit", title: "Editar funcionário", subtitle: "Atualize a ficha" },
  { path: "/employees/:id", title: "Funcionário", subtitle: "Ficha do funcionário" },
  { path: "/clock-devices", title: "Aparelhos", subtitle: "Libere o aparelho compartilhado" },
  { path: "/bulk-changes", title: "Operações em massa", subtitle: "Altere várias pessoas de uma vez" },
  { path: "/reports", title: "Relatórios", subtitle: "Consulte informações e indicadores" },
  { path: "/structure", title: "Estrutura Organizacional", subtitle: "Gerencie a estrutura da organização" },
  { path: "/punch-rules", title: "Regras de ponto", subtitle: "Normas, feriados e motivos" },
  { path: "/integrations", title: "Fiscal / Folha", subtitle: "Consulte integrações e informações" },
  { path: "/notices", title: "Notificações", subtitle: "Avisos da conta e da organização" },
  { path: "/memberships", title: "Permissões e Acessos", subtitle: "Gerencie permissões e usuários" },
  { path: "/memberships/new", title: "Vincular pessoa", subtitle: "Novo acesso ao sistema" },
  { path: "/memberships/:id", title: "Acesso", subtitle: "Papel desta pessoa" },
  { path: "/plan", title: "Plano e Assinatura", subtitle: "Consulte os dados da assinatura" },
  { path: "/settings", title: "Configurações", subtitle: "Personalize as configurações do sistema" },
  { path: "/change-password", title: "Trocar senha", subtitle: "Altere a senha de acesso" },
  { path: "/tenants", title: "Organizações", subtitle: "Organizações deste sistema" },
  { path: "/tenants/new", title: "Nova organização", subtitle: "Informe o nome e o CNPJ" },
  { path: "/tenants/:id/edit", title: "Editar organização", subtitle: "Atualize os dados da organização" },
  { path: "/tenants/:id", title: "Organização", subtitle: "Dados da organização" },
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
    const kind = new URLSearchParams(search).get("kind") || new URLSearchParams(search).get("tipo") || ""
    const title = occurrenceNewLabel[occurrenceKindOf(kind)] || occurrenceNewLabel[kind]
    if (title) return { ...best, title }
  }
  return best
}
