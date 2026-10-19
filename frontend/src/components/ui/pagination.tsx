import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import type { ComponentProps } from "react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/utils/cn"

function Pagination({ className, ...props }: ComponentProps<"nav">) {
  return <nav role="navigation" aria-label="Paginação" className={cn("mx-auto flex w-full justify-center", className)} {...props} />
}

function PaginationContent({ className, ...props }: ComponentProps<"ul">) {
  return <ul className={cn("flex flex-row items-center gap-1", className)} {...props} />
}

function PaginationItem({ className, ...props }: ComponentProps<"li">) {
  return <li className={cn("", className)} {...props} />
}

type PaginationLinkProps = ComponentProps<"button"> & {
  isActive?: boolean
  size?: "default" | "icon"
}

function PaginationLink({ className, isActive, size = "icon", ...props }: PaginationLinkProps) {
  return (
    <button
      type="button"
      aria-current={isActive ? "page" : undefined}
      className={cn(buttonVariants({ variant: isActive ? "outline" : "ghost", size }), className)}
      {...props}
    />
  )
}

function PaginationPrevious({ className, ...props }: ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink aria-label="Página anterior" size="default" className={cn("gap-1 pl-2.5", className)} {...props}>
      <ChevronLeft className="h-4 w-4" />
      <span>Anterior</span>
    </PaginationLink>
  )
}

function PaginationNext({ className, ...props }: ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink aria-label="Próxima página" size="default" className={cn("gap-1 pr-2.5", className)} {...props}>
      <span>Próxima</span>
      <ChevronRight className="h-4 w-4" />
    </PaginationLink>
  )
}

function PaginationEllipsis({ className, ...props }: ComponentProps<"span">) {
  return (
    <span aria-hidden className={cn("flex h-9 w-9 items-center justify-center", className)} {...props}>
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">Mais páginas</span>
    </span>
  )
}

function paginationItems(current: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }
  const start = Math.max(2, current - 1)
  const end = Math.min(totalPages - 1, current + 1)
  const items: Array<number | "ellipsis"> = [1]
  if (start > 2) items.push("ellipsis")
  for (let page = start; page <= end; page += 1) items.push(page)
  if (end < totalPages - 1) items.push("ellipsis")
  items.push(totalPages)
  return items
}

export { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, paginationItems }
