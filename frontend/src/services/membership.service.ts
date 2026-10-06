import { api, ensureCsrf } from "@/services/api"
import type { ApiResponse, Membership, Page } from "@/types/api"
import { apiErrorMessage } from "@/utils/api-error"

async function request<T>(work: () => Promise<{ data: ApiResponse<T> }>): Promise<T> {
  try {
    const response = await work()
    return response.data.data as T
  } catch (error) {
    throw new Error(apiErrorMessage(error))
  }
}

export function listMemberships(page = 1, limit = 10, role?: string): Promise<Page<Membership>> {
  return request(() =>
    api.get<ApiResponse<Page<Membership>>>("/memberships", {
      params: { page, limit, role: role || undefined },
    }),
  )
}

export function getMembership(id: number): Promise<Membership> {
  return request(() => api.get<ApiResponse<Membership>>(`/memberships/${id}`))
}

export function createMembership(payload: {
  cpf: string
  email: string
  fullName: string
  role: string
}): Promise<Membership> {
  return ensureCsrf().then(() =>
    request(() =>
      api.post<ApiResponse<Membership>>("/memberships", {
        cpf: payload.cpf,
        email: payload.email,
        full_name: payload.fullName,
        role: payload.role,
      }),
    ),
  )
}

export function updateMembership(id: number, role: string): Promise<Membership> {
  return ensureCsrf().then(() =>
    request(() => api.put<ApiResponse<Membership>>(`/memberships/${id}`, { role })),
  )
}

export function removeMembership(id: number): Promise<null> {
  return ensureCsrf().then(() => request(() => api.delete<ApiResponse<null>>(`/memberships/${id}`)))
}
