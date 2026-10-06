import { forwardRef, type InputHTMLAttributes } from "react"

import { cn } from "@/utils/cn"

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none ring-primary focus-visible:ring-2",
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = "Input"
