import { useLayoutEffect, useRef, type ComponentProps } from "react"

import { Input } from "@/components/ui/input"
import { maskCpfEdit } from "@/utils/digits"

type CpfFieldProps = Omit<ComponentProps<typeof Input>, "type" | "inputMode" | "onChange" | "value"> & {
  value: string
  onValueChange: (value: string) => void
}

export function CpfField({ value, onValueChange, ...props }: CpfFieldProps) {
  const ref = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)

  useLayoutEffect(() => {
    const element = ref.current
    const position = caret.current
    caret.current = null
    if (!element || position == null) return
    const place = () => {
      const next = Math.min(position, element.value.length)
      element.setSelectionRange(next, next)
    }
    place()
    const frame = requestAnimationFrame(place)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return (
    <Input
      {...props}
      ref={ref}
      inputMode="numeric"
      value={value}
      onChange={(event) => {
        const next = maskCpfEdit(value, event.target.value, event.target.selectionStart ?? event.target.value.length)
        if (next.text === value) {
          event.target.value = next.text
          event.target.setSelectionRange(next.caret, next.caret)
          return
        }
        caret.current = next.caret
        onValueChange(next.text)
      }}
    />
  )
}
