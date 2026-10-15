import { Loader2 } from "lucide-react"

import { useLoaderStore } from "@/store/loader.store"

export function GlobalLoader() {
  const isLoading = useLoaderStore((state) => state.isLoading)
  if (!isLoading) {
    return null
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80" role="status">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
        <p className="text-sm">Carregando</p>
      </div>
    </div>
  )
}
