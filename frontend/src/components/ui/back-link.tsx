import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { cn } from "@/utils/cn"

function scrollPageToTop() {
  window.scrollTo(0, 0)
}

export function BackLink({ to, className, appearance = "default" }: { to: string; className?: string; appearance?: "default" | "detail" }) {
  if (appearance === "detail") {
    return (
      <Button
        variant="outline"
        className={cn(
          "group h-10 w-fit gap-2 rounded-[10px] border-ui-line-input bg-white px-3.5 text-sm font-semibold text-ui-ink shadow-[0_2px_6px_rgb(var(--ui-shadow)/0.04)] transition-[background-color,border-color,box-shadow] duration-200 hover:border-brand-cta hover:bg-brand-cta/10 hover:shadow-[0_4px_12px_rgb(var(--brand-cta)/0.16)] active:bg-brand-cta/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta/30",
          className,
        )}
        asChild
      >
        <Link to={to} onClick={scrollPageToTop}>
          <ArrowLeft className="h-4 w-4 text-brand-cta transition-transform duration-200 motion-reduce:transition-none motion-safe:group-hover:-translate-x-[3px]" />
          Voltar
        </Link>
      </Button>
    )
  }

  return (
    <Button variant="outline" size="sm" className={cn("w-fit transition-colors duration-200", className)} asChild>
      <Link to={to} onClick={scrollPageToTop}>
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>
    </Button>
  )
}
