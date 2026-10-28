import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/utils/cn"

export function ListPlaceholder({ loading, empty, className }: { loading: boolean; empty: string; className?: string }) {
  if (loading) {
    return (
      <li className={cn("flex justify-center px-4 py-6", className)}>
        <Spinner />
      </li>
    )
  }
  return <li className={cn("px-4 py-3 text-sm text-muted-foreground", className)}>{empty}</li>
}
