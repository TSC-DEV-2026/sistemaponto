import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"

import { useAuthStore } from "@/store/auth.store"

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

api.interceptors.response.use(
  (response) => response,
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
