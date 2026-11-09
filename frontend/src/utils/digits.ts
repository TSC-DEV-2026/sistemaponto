export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "")
}

export function formatCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  let text = digits.slice(0, 3)
  if (digits.length > 3) {
    text += `.${digits.slice(3, 6)}`
  }
  if (digits.length > 6) {
    text += `.${digits.slice(6, 9)}`
  }
  if (digits.length > 9) {
    text += `-${digits.slice(9, 11)}`
  }
  return text
}

export function offsetAfterDigits(masked: string, digitCount: number): number {
  if (digitCount <= 0) return 0
  let seen = 0
  for (let index = 0; index < masked.length; index += 1) {
    const char = masked[index]
    if (char >= "0" && char <= "9") {
      seen += 1
      if (seen === digitCount) return index + 1
    }
  }
  return masked.length
}

export function maskCpfEdit(previous: string, raw: string, cursor: number): { text: string; caret: number } {
  const safeCursor = Math.max(0, Math.min(cursor, raw.length))
  let digits = onlyDigits(raw).slice(0, 11)
  let digitsBefore = Math.min(onlyDigits(raw.slice(0, safeCursor)).length, 11)

  if (onlyDigits(raw) === onlyDigits(previous) && raw.length < previous.length && previous.length > 0) {
    const removedAt = Math.min(safeCursor, previous.length - 1)
    const removed = previous[removedAt]
    if (removed < "0" || removed > "9") {
      const before = onlyDigits(previous.slice(0, removedAt)).length
      if (before > 0) {
        const all = onlyDigits(previous)
        digits = `${all.slice(0, before - 1)}${all.slice(before)}`.slice(0, 11)
        digitsBefore = before - 1
      }
    }
  }

  const text = formatCpf(digits)
  return { text, caret: Math.min(offsetAfterDigits(text, digitsBefore), text.length) }
}

export function formatCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14)
  let text = digits.slice(0, 2)
  if (digits.length > 2) text += `.${digits.slice(2, 5)}`
  if (digits.length > 5) text += `.${digits.slice(5, 8)}`
  if (digits.length > 8) text += `/${digits.slice(8, 12)}`
  if (digits.length > 12) text += `-${digits.slice(12, 14)}`
  return text
}

export function maskCnpjEdit(previous: string, raw: string, cursor: number): { text: string; caret: number } {
  const safeCursor = Math.max(0, Math.min(cursor, raw.length))
  let digits = onlyDigits(raw).slice(0, 14)
  let digitsBefore = Math.min(onlyDigits(raw.slice(0, safeCursor)).length, 14)

  if (onlyDigits(raw) === onlyDigits(previous) && raw.length < previous.length && previous.length > 0) {
    const removedAt = Math.min(safeCursor, previous.length - 1)
    const removed = previous[removedAt]
    if (removed < "0" || removed > "9") {
      const before = onlyDigits(previous.slice(0, removedAt)).length
      if (before > 0) {
        const all = onlyDigits(previous)
        digits = `${all.slice(0, before - 1)}${all.slice(before)}`.slice(0, 14)
        digitsBefore = before - 1
      }
    }
  }

  const text = formatCnpj(digits)
  return { text, caret: Math.min(offsetAfterDigits(text, digitsBefore), text.length) }
}
