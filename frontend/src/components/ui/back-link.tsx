import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { cn } from "@/utils/cn"

export function BackLink({ to, className, appearance = "default" }: { to: string; className?: string; appearance?: "default" | "detail" }) {
  if (appearance === "detail") {
    return (
      <Button
        variant="outline"
        className={cn(
          "group h-10 w-fit gap-2 rounded-[10px] border-[#D9DEE5] bg-white px-3.5 text-sm font-semibold text-[#0A0A0A] shadow-[0_2px_6px_rgba(15,23,42,0.04)] transition-[background-color,border-color,box-shadow] duration-200 hover:border-[#1E8A3A] hover:bg-[rgba(30,138,58,0.1)] hover:shadow-[0_4px_12px_rgba(30,138,58,0.16)] active:bg-[rgba(30,138,58,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30",
          className,
        )}
        asChild
      >
        <Link to={to}>
          <ArrowLeft className="h-4 w-4 text-[#1E8A3A] transition-transform duration-200 motion-reduce:transition-none motion-safe:group-hover:-translate-x-[3px]" />
          Voltar
        </Link>
      </Button>
    )
  }

  return (
    <Button variant="outline" size="sm" className={cn("w-fit transition-colors duration-200", className)} asChild>
      <Link to={to}>
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>
    </Button>
  )
}
