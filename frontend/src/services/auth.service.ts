import { api, ensureCsrf } from "@/services/api"
import type { ApiResponse, SessionUser } from "@/types/api"
import { apiErrorMessage } from "@/utils/api-error"

async function request<T>(work: () => Promise<{ data: ApiResponse<T> }>): Promise<T> {
  try {
    const response = await work()
    return response.data.data as T
  } catch (error) {
    throw new Error(apiErrorMessage(error))
  }
}

export type RegisterPayload = {
  fullName: string
  cpf: string
  email: string
  companyName: string
  password: string
}

export function register(payload: RegisterPayload): Promise<SessionUser> {
  return ensureCsrf().then(() =>
    request(() =>
      api.post<ApiResponse<SessionUser>>("/auth/register", {
        full_name: payload.fullName,
        cpf: payload.cpf,
        email: payload.email,
        company_name: payload.companyName,
        password: payload.password,
      }),
    ),
  )
}

export function login(cpf: string, password: string): Promise<SessionUser> {
  return ensureCsrf().then(() =>
    request(() => api.post<ApiResponse<SessionUser>>("/auth/login", { cpf, password })),
  )
}

export function me(): Promise<SessionUser> {
  return request(() => api.get<ApiResponse<SessionUser>>("/auth/me"))
}

export function logout(): Promise<null> {
  return ensureCsrf().then(() => request(() => api.post<ApiResponse<null>>("/auth/logout")))
}

export function switchTenant(tenantId: number): Promise<SessionUser> {
  return ensureCsrf().then(() =>
    request(() => api.post<ApiResponse<SessionUser>>("/auth/switch-tenant", { tenant_id: tenantId })),
  )
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return ensureCsrf().then(() =>
    request(() => api.post<ApiResponse<{ message: string }>>("/auth/forgot-password", { email })),
  )
}

export function resetPassword(token: string, newPassword: string): Promise<null> {
  return ensureCsrf().then(() =>
    request(() =>
      api.post<ApiResponse<null>>("/auth/reset-password", {
        token,
        new_password: newPassword,
      }),
    ),
  )
}

export function changePassword(currentPassword: string, newPassword: string): Promise<null> {
  return ensureCsrf().then(() =>
    request(() =>
      api.post<ApiResponse<null>>("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      }),
    ),
  )
}

export function verifyEmail(token: string): Promise<null> {
  return request(() => api.get<ApiResponse<null>>("/auth/verify-email", { params: { token } }))
}

export function resendVerification(email: string): Promise<{ message: string }> {
  return ensureCsrf().then(() =>
    request(() => api.post<ApiResponse<{ message: string }>>("/auth/resend-verification", { email })),
  )
}
