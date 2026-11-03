import { Loader2 } from "lucide-react"

import { cn } from "@/utils/cn"

export function Spinner({ label = "Carregando", className }: { label?: string; className?: string }) {
  return (
    <span className="inline-flex align-middle" role="status" aria-label={label}>
      <Loader2 className={cn("h-5 w-5 animate-spin text-muted-foreground motion-reduce:animate-none", className)} aria-hidden />
    </span>
  )
}
