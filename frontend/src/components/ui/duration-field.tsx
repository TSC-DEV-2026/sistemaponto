import { useLayoutEffect, useRef, type ComponentProps } from "react"

import { Input } from "@/components/ui/input"
import { caretAfterDigits, maskClockDigits } from "@/utils/clock-edit"

type DurationFieldProps = Omit<ComponentProps<typeof Input>, "type" | "inputMode" | "onChange" | "value"> & {
  value: string
  onValueChange: (value: string) => void
}

export function DurationField({ value, onValueChange, placeholder = "00:00", ...props }: DurationFieldProps) {
  const ref = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)

  useLayoutEffect(() => {
    const element = ref.current
    const position = caret.current
    caret.current = null
    if (!element || position == null || document.activeElement !== element) return
    const place = () => {
      if (document.activeElement !== element) return
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
      autoComplete="off"
      placeholder={placeholder}
      value={value}
      onChange={(event) => {
        const input = event.target
        const cursor = input.selectionStart ?? input.value.length
        const digitsBefore = input.value.slice(0, cursor).replace(/\D/g, "").length
        const digits = input.value.replace(/\D/g, "").slice(0, 4)
        const next = maskClockDigits(digits)
        const place = caretAfterDigits(next, Math.min(digitsBefore, digits.length))
        if (next === value) {
          input.value = next
          input.setSelectionRange(place, place)
          return
        }
        caret.current = place
        onValueChange(next)
      }}
    />
  )
}
