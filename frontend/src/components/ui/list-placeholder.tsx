import { Spinner } from "@/components/ui/spinner"

export function ListPlaceholder({ loading, empty }: { loading: boolean; empty: string }) {
  if (loading) {
    return (
      <li className="flex justify-center px-4 py-6">
        <Spinner />
      </li>
    )
  }
  return <li className="px-4 py-3 text-sm text-muted-foreground">{empty}</li>
}
