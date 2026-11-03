import { Briefcase, Building2, Users } from "lucide-react"

import { CatalogList, DomainTabs, EmployeeList } from "@/pages/workforce/EntityScreens"

export function PeoplePage() {
  return (
    <DomainTabs
      title="Pessoas"
      people
      tabs={[
        { id: "funcionarios", label: "Funcionários", icon: Users, panel: <EmployeeList /> },
        { id: "cargos", label: "Cargos", icon: Briefcase, panel: <CatalogList catalog="jobs" presentation="people" /> },
        { id: "centros", label: "Centros de custo", icon: Building2, panel: <CatalogList catalog="cost-centers" presentation="people" /> },
      ]}
    />
  )
}
