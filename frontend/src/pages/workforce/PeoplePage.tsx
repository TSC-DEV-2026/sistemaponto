import { Briefcase, Tags, Users } from "lucide-react"
import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"

import { CatalogList, DomainTabs, EmployeeList } from "@/pages/workforce/EntityScreens"

export function PeoplePage() {
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    if (params.get("aba") === "centros") setParams({ aba: "classificacoes" }, { replace: true })
  }, [params, setParams])

  return (
    <DomainTabs
      title="Pessoas"
      people
      tabs={[
        { id: "funcionarios", label: "Funcionários", icon: Users, panel: <EmployeeList /> },
        { id: "funcoes", label: "Funções", icon: Briefcase, panel: <CatalogList catalog="jobs" presentation="people" /> },
        { id: "classificacoes", label: "Classificações", icon: Tags, panel: <CatalogList catalog="classifications" presentation="people" /> },
      ]}
    />
  )
}
