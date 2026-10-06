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
