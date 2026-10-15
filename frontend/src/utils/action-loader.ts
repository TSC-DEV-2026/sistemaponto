const ACTION_METHODS = new Set(["post", "put", "patch", "delete"])

export function waitsForAction(method: string | undefined, skipLoader?: boolean): boolean {
  if (skipLoader) return false
  return ACTION_METHODS.has((method || "get").toLowerCase())
}
