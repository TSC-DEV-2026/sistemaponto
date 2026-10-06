import { useLoaderStore } from "@/store/loader.store"

export function GlobalLoader() {
  const isLoading = useLoaderStore((state) => state.isLoading)
  if (!isLoading) {
    return null
  }
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-primary/20">
      <div className="h-full w-1/3 animate-pulse bg-primary" />
    </div>
  )
}
