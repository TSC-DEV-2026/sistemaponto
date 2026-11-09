import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"

import { useAuthStore } from "@/store/auth.store"
import { toastError, toastSuccess } from "@/store/toast.store"
import { apiErrorMessage } from "@/utils/api-error"

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"]

type RequestConfig = InternalAxiosRequestConfig & {
  skipAuthRefresh?: boolean
  _retried?: boolean
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  withCredentials: true,
})

api.interceptors.request.use((config: RequestConfig) => {
  config.headers.set("X-Client", "web")
  const method = (config.method || "get").toLowerCase()
  if (method === "post" || method === "put" || method === "delete") {
    const csrf = readCookie("csrf_token")
    if (csrf) {
      config.headers.set("X-CSRF-Token", csrf)
    }
  }
  return config
})

let refreshPromise: Promise<void> | null = null

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((item) => path === item || path.startsWith(`${item}/`))
}

function actionSuccessMessage(method: string, url: string): string | null {
  if (url.includes("/auth/refresh") || url.includes("/auth/switch-tenant")) return null
  if (url.includes("/auth/login")) return "Entrada realizada."
  if (url.includes("/auth/register")) return "Conta criada."
  if (url.includes("/auth/logout")) return "Sessão encerrada."
  if (url.includes("/auth/forgot-password")) return "Enviamos as instruções para o e-mail."
  if (url.includes("/auth/reset-password")) return "Senha redefinida."
  if (url.includes("/auth/change-password")) return "Senha alterada."
  if (url.includes("/auth/resend-verification")) return "E-mail de confirmação enviado."
  if (url.includes("/auth/verify-email")) return "E-mail confirmado."
  if (url.includes("/auth/me") && method === "put") return "Conta atualizada."
  if (url.includes("/notification-runs")) return "Avisos enviados."
  if (url.includes("/punches") && method === "post") return "Marcação registrada."
  if (method === "delete") return "Registro excluído."
  if (method === "put" || method === "patch") return "Alteração salva."
  if (method === "post") return "Registro salvo."
  return null
}

function reportActionError(error: AxiosError) {
  const config = error.config as RequestConfig | undefined
  if (!config) return
  const method = (config.method || "get").toLowerCase()
  const url = config.url || ""
  if (url.includes("/auth/refresh")) return
  if (method !== "post" && method !== "put" && method !== "patch" && method !== "delete") return
  const status = error.response?.status
  if (status === 401 && !url.includes("/auth/login") && !url.includes("/auth/register")) {
    sessionStorage.setItem("ponto-toast", JSON.stringify({ kind: "warning", message: "Sua sessão expirou. Entre novamente." }))
    return
  }
  toastError(apiErrorMessage(error))
}

api.interceptors.response.use(
  (response) => {
    const config = response.config as RequestConfig
    const method = (config.method || "get").toLowerCase()
    const url = config.url || ""
    const message = actionSuccessMessage(method, url)
    if (message && (method === "post" || method === "put" || method === "patch" || method === "delete" || url.includes("/auth/verify-email"))) {
      toastSuccess(message)
    }
    return response
  },
  async (error: AxiosError) => {
    const config = error.config as RequestConfig | undefined
    const url = config?.url || ""
    const skip =
      !config ||
      config.skipAuthRefresh ||
      config._retried ||
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/reset-password")
    if (error.response?.status === 401 && !skip) {
      config._retried = true
      try {
        if (!refreshPromise) {
          refreshPromise = api
            .post("/auth/refresh", {}, { skipAuthRefresh: true })
            .then(() => undefined)
            .finally(() => {
              refreshPromise = null
            })
        }
        await refreshPromise
        return api.request(config)
      } catch {
        useAuthStore.getState().clear()
        if (!isPublicPath(window.location.pathname)) {
          window.location.assign("/login")
        }
      }
    }
    reportActionError(error)
    return Promise.reject(error)
  },
)

export async function ensureCsrf(): Promise<void> {
  if (readCookie("csrf_token")) {
    return
  }
  try {
    await api.get("/auth/me", { skipAuthRefresh: true })
  } catch {
    // O GET grava o cookie de CSRF mesmo quando a sessão não existe.
  }
}
