export function maskClockDigits(digits: string) {
  const clean = digits.replace(/\D/g, "").slice(0, 4)
  if (clean.length <= 2) return clean
  return `${clean.slice(0, 2)}:${clean.slice(2)}`
}

export function maskSignedClockDigits(value: string) {
  const negative = value.includes("-")
  const body = maskClockDigits(value)
  if (!body) return negative ? "-" : ""
  return negative ? `-${body}` : body
}

export function caretAfterDigits(masked: string, count: number) {
  if (count <= 0) return 0
  let seen = 0
  for (let index = 0; index < masked.length; index += 1) {
    if (/\d/.test(masked[index] ?? "")) seen += 1
    if (seen === count) return index + 1
  }
  return masked.length
}
