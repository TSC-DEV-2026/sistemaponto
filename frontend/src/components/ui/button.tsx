import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { forwardRef, useContext, useRef, useState, type ButtonHTMLAttributes, type MouseEvent } from "react"

import { FormPendingContext } from "@/components/ui/action-form"
import { cn } from "@/utils/cn"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-border bg-card hover:bg-muted",
        ghost: "hover:bg-muted",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    pending?: boolean
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>
  }

function isPromise(value: unknown): value is Promise<unknown> {
  return typeof value === "object" && value !== null && typeof (value as Promise<unknown>).then === "function"
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, pending = false, type, onClick, disabled, children, ...props }, ref) => {
    const formPending = useContext(FormPendingContext)
    const [clickPending, setClickPending] = useState(false)
    const lock = useRef(false)
    const waiting = pending || clickPending || (type === "submit" && formPending)

    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props}>
          {children}
        </Slot>
      )
    }

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
      if (lock.current) {
        event.preventDefault()
        return
      }
      const result = onClick?.(event)
      if (!isPromise(result)) return
      lock.current = true
      setClickPending(true)
      void result.finally(() => {
        lock.current = false
        setClickPending(false)
      })
    }

    return (
      <button
        {...props}
        className={cn(buttonVariants({ variant, size }), waiting && "pointer-events-none", className)}
        ref={ref}
        type={type}
        disabled={disabled}
        aria-busy={waiting || undefined}
        aria-disabled={waiting || undefined}
        aria-label={waiting ? "Carregando" : props["aria-label"]}
        onClick={handleClick}
      >
        <span className="inline-grid place-items-center">
          <span className={cn("col-start-1 row-start-1 inline-flex items-center gap-2", waiting && "invisible")}>{children}</span>
          {waiting ? <Loader2 className="col-start-1 row-start-1 h-4 w-4 animate-spin" aria-hidden /> : null}
        </span>
      </button>
    )
  },
)
Button.displayName = "Button"
