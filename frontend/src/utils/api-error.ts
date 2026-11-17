import axios from "axios"

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error?.message
    if (typeof message === "string" && message.trim()) {
      return message
    }
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return "Não foi possível concluir a ação."
}

export function apiErrorPeople(error: unknown): number[] {
  if (!axios.isAxiosError(error)) return []
  const people = error.response?.data?.error?.people
  if (!Array.isArray(people)) return []
  return people.filter((item): item is number => typeof item === "number")
}
