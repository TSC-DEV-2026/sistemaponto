import {
  FileSpreadsheet,
  LayoutDashboard,
  ListChecks,
  MonitorSmartphone,
  ClipboardList,
  Shield,
  Smartphone,
  type LucideIcon,
} from "lucide-react"

import { conceptIcon } from "@/utils/concept-icons"

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
  adminOnly?: boolean
  staffOnly?: boolean
  hideFromAdmin?: boolean
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
        to: "/timekeeping?tab=calculations",
        label: "Ponto",
        icon: conceptIcon.point,
        lead: "Apuração do período, banco de horas e fechamento.",
        sections: [
          { title: "Apurações", text: "Resultado do período." },
          { title: "Banco de horas", text: "Saldo contínuo." },
          { title: "Fechamento", text: "Nenhum fechamento." },
        ],
      },
      {
        to: "/punches",
        label: "Registro",
        icon: Smartphone,
        hideFromAdmin: true,
        lead: "Modalidades do registro feito pelo funcionário no app.",
        sections: [
          { title: "Registro Simples", text: "Botão do funcionário." },
          { title: "QR Code + Selfie", text: "Empresa, CPF e matrícula." },
          { title: "Reconhecimento facial", text: "Online e offline." },
        ],
      },
      {
        to: "/occurrences?tab=allowances",
        label: "Ocorrências",
        icon: conceptIcon.occurrence,
        lead: "Abono, atestado, falta, afastamento e férias. Motivo padronizado quando houver catálogo.",
        sections: [
          { title: "Abonos", text: "Nenhum abono." },
          { title: "Atestados", text: "Nenhum atestado efetivado." },
          { title: "Faltas", text: "Nenhuma falta registrada." },
          { title: "Afastamentos", text: "Nenhum afastamento." },
          { title: "Férias", text: "Nenhuma ocorrência de férias." },
        ],
      },
      {
        to: "/requests",
        label: "Solicitações",
        icon: conceptIcon.request,
        lead: "Caixa de entrada. Uma solicitação pendente não altera o ponto.",
        sections: [
          { title: "Todas", text: "0" },
          { title: "Pendentes", text: "0 ajustes, 0 abonos, 0 atestados." },
          { title: "Aprovadas", text: "0" },
          { title: "Recusadas", text: "0" },
          { title: "Canceladas", text: "0" },
        ],
      },
    ],
  },
  {
    label: "Gestão",
    items: [
      {
        to: "/staff?tab=employees",
        label: "Quadro",
        icon: conceptIcon.quadro,
        lead: "Funcionários, funções e jornadas. O cadastro do funcionário reúne dados, trabalho, ponto, ocorrências e histórico.",
        sections: [
          { title: "Funcionários", text: "Nenhum funcionário." },
          { title: "Funções", text: "Nenhuma função." },
          { title: "Jornadas", text: "Nenhuma jornada cadastrada." },
        ],
      },
      {
        to: "/clock-devices",
        label: "Aparelhos",
        icon: MonitorSmartphone,
        adminOnly: true,
        lead: "Libera um aparelho para várias pessoas registrarem o ponto.",
        sections: [
          { title: "Código", text: "Uso único, válido por alguns minutos." },
          { title: "Organizações", text: "Cada conta libera o próprio aparelho." },
        ],
      },
      {
        to: "/bulk-changes",
        label: "Operações em massa",
        icon: ListChecks,
        adminOnly: true,
        lead: "Altera o vínculo ou o tipo de registro de várias pessoas de uma vez.",
        sections: [
          { title: "Vínculos", text: "Função, jornada, categoria, equipe, situação, gestor e norma." },
          { title: "Tipo de registro", text: "Simples, QR Code ou reconhecimento facial." },
        ],
      },
      {
        to: "/reports",
        label: "Relatórios",
        icon: conceptIcon.report,
        staffOnly: true,
        lead: "Consulta analítica. O dashboard permanece a visão operacional.",
        sections: [
          { title: "Ponto", text: "Histórico da apuração." },
          { title: "Marcações", text: "Batidas que valem e as que deixaram de valer." },
          { title: "Jornada", text: "Histórico da vigência." },
          { title: "Banco de Horas", text: "Saldo e lançamentos." },
          { title: "Ocorrências", text: "O que já foi lançado." },
          { title: "Gestão", text: "Fechamento e solicitação." },
        ],
      },
    ],
  },
  {
    label: "Organização",
    items: [
      {
        to: "/structure?tab=units",
        label: "Estrutura Organizacional",
        icon: conceptIcon.structure,
        lead: "Empresas, equipes e categorias. Mudança relevante preserva vigência.",
        sections: [
          { title: "Empresas", text: "Nenhuma empresa." },
          { title: "Equipes", text: "Nenhuma equipe." },
          { title: "Categorias", text: "Nenhuma categoria." },
        ],
      },
      {
        to: "/punch-rules?tab=norms",
        label: "Regras de ponto",
        icon: ClipboardList,
        lead: "Normas, feriados e motivos.",
        sections: [
          { title: "Normas", text: "Sindicato, convenção ou acordo e regras de ponto." },
          { title: "Feriados", text: "Nenhum feriado." },
          { title: "Motivos", text: "O tipo diz onde o motivo é usado." },
        ],
      },
    ],
  },
  {
    label: "Integrações",
    items: [
      {
        to: "/integrations?tab=fiscal-files",
        label: "Fiscal / Folha",
        icon: FileSpreadsheet,
        staffOnly: true,
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
        to: "/memberships",
        label: "Permissões e Acessos",
        icon: Shield,
        adminOnly: true,
        lead: "Quem entra neste sistema e com qual papel. Não é o cadastro de funcionário.",
        sections: [],
      },
      {
        to: "/plan?tab=subscriptions",
        label: "Plano e Assinatura",
        icon: conceptIcon.plan,
        adminOnly: true,
        lead: "Mensalidade de R$ 5 por pessoa.",
        sections: [],
      },
    ],
  },
]

export const shellItems = navGroups.flatMap((group) => group.items)
