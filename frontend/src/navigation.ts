import {
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  Clock,
  CreditCard,
  FileSpreadsheet,
  Inbox,
  LayoutDashboard,
  Lock,
  ScrollText,
  Settings,
  Shield,
  Smartphone,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react"

export type DomainSection = {
  title: string
  text: string
}

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  lead: string
  sections: DomainSection[]
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

export const dashboardItem = {
  to: "/",
  label: "Dashboard",
  icon: LayoutDashboard,
}

export const navGroups: NavGroup[] = [
  {
    label: "Operação",
    items: [
      {
        to: "/schedules",
        label: "Jornada e Ponto",
        icon: Clock,
        lead: "Jornada é o previsto. Marcação é o ocorrido. Apuração é o resultado.",
        sections: [
          { title: "Jornadas", text: "Nenhuma jornada cadastrada." },
          { title: "Marcações", text: "Nenhuma marcação." },
          { title: "Apuração", text: "Nenhum resultado calculado." },
          { title: "Banco de horas", text: "Nenhum saldo." },
        ],
      },
      {
        to: "/time-clock",
        label: "Registro de Ponto",
        icon: Smartphone,
        lead: "Modalidades do registro feito pelo funcionário no app.",
        sections: [
          { title: "Registro Simples", text: "Modalidade prevista." },
          { title: "QR Code + Selfie", text: "Modalidade prevista." },
          { title: "Reconhecimento facial", text: "Online e offline." },
        ],
      },
      {
        to: "/occurrences",
        label: "Ajustes e Ocorrências",
        icon: ClipboardList,
        lead: "Tratamento administrativo. Motivo padronizado quando houver catálogo. Observação complementar quando couber.",
        sections: [
          { title: "Ajustes de ponto", text: "Nenhum ajuste." },
          { title: "Lançamentos de marcações", text: "Nenhum lançamento." },
          { title: "Faltas", text: "Nenhuma falta registrada." },
          { title: "Atestados", text: "Nenhum atestado efetivado." },
          { title: "Férias", text: "Nenhuma ocorrência de férias." },
          { title: "Abonos", text: "Nenhum abono." },
          { title: "Afastamentos", text: "Nenhum afastamento." },
        ],
      },
      {
        to: "/requests",
        label: "Solicitações",
        icon: Inbox,
        lead: "Caixa de entrada. Uma solicitação pendente não altera o ponto.",
        sections: [
          { title: "Todas", text: "0" },
          { title: "Pendentes", text: "0 ajustes, 0 abonos, 0 atestados." },
          { title: "Aprovadas", text: "0" },
          { title: "Recusadas", text: "0" },
          { title: "Canceladas", text: "0" },
        ],
      },
      {
        to: "/closings",
        label: "Fechamento do Ponto",
        icon: Lock,
        lead: "Períodos já abertos neste sistema.",
        sections: [{ title: "Períodos", text: "Nenhum fechamento." }],
      },
    ],
  },
  {
    label: "Gestão",
    items: [
      {
        to: "/people",
        label: "Pessoas",
        icon: Users,
        lead: "Funcionários, cargos e centros de custo. O cadastro do funcionário reúne dados, trabalho, ponto, ocorrências e histórico.",
        sections: [
          { title: "Funcionários", text: "Nenhum funcionário." },
          { title: "Cargos", text: "Nenhum cargo." },
          { title: "Centros de custo", text: "Nenhum centro de custo." },
        ],
      },
      {
        to: "/reports",
        label: "Relatórios",
        icon: BarChart3,
        lead: "Consulta analítica. O dashboard permanece a visão operacional.",
        sections: [
          { title: "Ponto", text: "Nenhum relatório." },
          { title: "Jornada", text: "Nenhum relatório." },
          { title: "Banco de horas", text: "Nenhum relatório." },
          { title: "Ocorrências", text: "Nenhum relatório." },
          { title: "Gestão", text: "Nenhum relatório." },
        ],
      },
      {
        to: "/notifications",
        label: "Notificações",
        icon: Bell,
        lead: "Eventos deste sistema.",
        sections: [
          { title: "Solicitações", text: "Nova, aprovada, recusada ou cancelada." },
          { title: "Ponto", text: "Ponto incompleto e pendência de fechamento." },
          { title: "Plano", text: "Trial terminando, limite próximo e limite atingido." },
        ],
      },
    ],
  },
  {
    label: "Organização",
    items: [
      {
        to: "/organization",
        label: "Estrutura Organizacional",
        icon: Building2,
        lead: "Unidades, setores e equipes. Mudança relevante preserva vigência.",
        sections: [
          { title: "Unidades", text: "Nenhuma unidade." },
          { title: "Setores", text: "Nenhum setor." },
          { title: "Equipes", text: "Nenhuma equipe." },
        ],
      },
      {
        to: "/labor-rules",
        label: "Regras Trabalhistas",
        icon: ScrollText,
        lead: "Sindicatos, convenções, feriados e regras de ponto.",
        sections: [
          { title: "Sindicatos", text: "Nenhum sindicato." },
          { title: "Convenções e acordos", text: "Nenhum acordo." },
          { title: "Feriados", text: "Nenhum feriado." },
          { title: "Regras de ponto", text: "Nenhuma regra." },
        ],
      },
    ],
  },
  {
    label: "Integrações",
    items: [
      {
        to: "/payroll",
        label: "Fiscal / Folha",
        icon: FileSpreadsheet,
        lead: "Fora do fluxo cotidiano do funcionário.",
        sections: [
          { title: "AFD", text: "Importação e exportação." },
          { title: "AEJ", text: "Exportação." },
          { title: "Folha de pagamento", text: "Exportação de totais." },
        ],
      },
    ],
  },
  {
    label: "Administração",
    items: [
      {
        to: "/reasons",
        label: "Motivos",
        icon: Tags,
        lead: "Catálogo da empresa. A observação complementar continua possível.",
        sections: [
          { title: "Ajustes", text: "Nenhum motivo." },
          { title: "Faltas", text: "Nenhum motivo." },
          { title: "Abonos", text: "Nenhum motivo." },
          { title: "Atestados", text: "Nenhum motivo." },
        ],
      },
      {
        to: "/memberships",
        label: "Permissões e Acessos",
        icon: Shield,
        lead: "Quem entra neste sistema e com qual papel. Não é o cadastro de funcionário.",
        sections: [],
      },
      {
        to: "/plan",
        label: "Plano e Assinatura",
        icon: CreditCard,
        lead: "Trial de 7 dias, até 10 funcionários, com as funcionalidades liberadas.",
        sections: [],
      },
      {
        to: "/settings",
        label: "Configurações",
        icon: Settings,
        lead: "Conta, verificação de e-mail e empresas deste sistema.",
        sections: [],
      },
    ],
  },
]

export const shellItems = navGroups.flatMap((group) => group.items)
