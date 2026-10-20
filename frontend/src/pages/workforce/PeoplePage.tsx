import { CatalogList, DomainTabs, EmployeeList } from "@/pages/workforce/EntityScreens"

export function PeoplePage() {
  return (
    <DomainTabs
      title="Pessoas"
      lead="Funcionários, cargos e centros de custo. Quem entra no sistema continua em Permissões e Acessos."
      tabs={[
        { id: "funcionarios", label: "Funcionários", panel: <EmployeeList /> },
        { id: "cargos", label: "Cargos", panel: <CatalogList catalog="jobs" /> },
        { id: "centros", label: "Centros de custo", panel: <CatalogList catalog="cost-centers" /> },
      ]}
    />
  )
}
