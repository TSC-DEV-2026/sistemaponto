import { useState, type ComponentProps } from "react"
import { Eye, EyeOff } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/utils/cn"

type PasswordFieldProps = Omit<ComponentProps<typeof Input>, "type">

export function PasswordField({ className, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={cn("pr-10", className)} {...props} />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  )
}
