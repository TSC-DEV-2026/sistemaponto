import { api, ensureCsrf } from "@/services/api"
import type { ApiResponse, Page, Tenant } from "@/types/api"
import { apiErrorMessage } from "@/utils/api-error"

async function request<T>(work: () => Promise<{ data: ApiResponse<T> }>): Promise<T> {
  try {
    const response = await work()
    return response.data.data as T
  } catch (error) {
    throw new Error(apiErrorMessage(error))
  }
}

export function listTenants(page = 1, limit = 10): Promise<Page<Tenant>> {
  return request(() => api.get<ApiResponse<Page<Tenant>>>("/tenants", { params: { page, limit } }))
}

export function getTenant(id: number): Promise<Tenant> {
  return request(() => api.get<ApiResponse<Tenant>>(`/tenants/${id}`))
}

export function createTenant(name: string, document: string): Promise<Tenant> {
  return ensureCsrf().then(() =>
    request(() => api.post<ApiResponse<Tenant>>("/tenants", { name, document })),
  )
}

export function updateTenant(id: number, name: string, document: string): Promise<Tenant> {
  const body: { name: string; document?: string } = { name }
  if (document) {
    body.document = document
  }
  return ensureCsrf().then(() => request(() => api.put<ApiResponse<Tenant>>(`/tenants/${id}`, body)))
}

export function removeTenant(id: number): Promise<null> {
  return ensureCsrf().then(() => request(() => api.delete<ApiResponse<null>>(`/tenants/${id}`)))
}
