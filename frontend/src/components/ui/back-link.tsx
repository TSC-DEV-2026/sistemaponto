import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"

export function BackLink({ to }: { to: string }) {
  return (
    <Button variant="outline" size="sm" className="w-fit" asChild>
      <Link to={to}>
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>
    </Button>
  )
}
