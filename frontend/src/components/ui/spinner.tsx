import { Loader2 } from "lucide-react"

export function Spinner({ label = "Carregando" }: { label?: string }) {
  return (
    <span className="inline-flex align-middle" role="status" aria-label={label}>
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
    </span>
  )
}
