import { useLocation } from "react-router-dom"

import { shellItems } from "@/navigation"

export function DomainPage() {
  const location = useLocation()
  const item = shellItems.find((entry) => entry.to === location.pathname)

  if (!item || item.sections.length === 0) {
    return null
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{item.label}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{item.lead}</p>
      </div>
      <div className="grid gap-3">
        {item.sections.map((section) => (
          <section key={section.title} className="rounded-md border border-border bg-card px-4 py-3">
            <h2 className="text-sm font-medium">{section.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{section.text}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
