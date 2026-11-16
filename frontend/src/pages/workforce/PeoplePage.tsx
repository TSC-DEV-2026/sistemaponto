import { conceptIcon } from "@/utils/concept-icons"

import { CatalogList, DomainTabs, EmployeeList } from "@/pages/workforce/EntityScreens"

export function PeoplePage() {
  return (
    <DomainTabs
      title="Quadro"
      people
      tabs={[
        { id: "employees", label: "Funcionários", icon: conceptIcon.employee, panel: <EmployeeList /> },
        { id: "jobs", label: "Funções", icon: conceptIcon.job, panel: <CatalogList catalog="jobs" presentation="people" /> },
        { id: "journeys", label: "Jornadas", icon: conceptIcon.journey, panel: <CatalogList catalog="journeys" presentation="people" /> },
        { id: "groups", label: "Grupos", icon: conceptIcon.group, panel: <CatalogList catalog="groups" presentation="people" /> },
      ]}
    />
  )
}
