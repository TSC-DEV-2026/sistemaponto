const DAY_MS = 86_400_000

export function trialDaysLeft(iso: string): number {
  const end = new Date(iso).getTime()
  if (Number.isNaN(end)) {
    return 0
  }
  return Math.max(0, Math.ceil((end - Date.now()) / DAY_MS))
}

export function trialEnded(iso: string): boolean {
  const end = new Date(iso).getTime()
  return !Number.isNaN(end) && end <= Date.now()
}

export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return date.toLocaleDateString("pt-BR")
}
