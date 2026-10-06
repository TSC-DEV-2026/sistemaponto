import { api } from "@/services/api"
import type { ApiResponse, Page, ResourceOut } from "@/types/api"
import { apiErrorMessage } from "@/utils/api-error"

async function request<T>(work: () => Promise<{ data: ApiResponse<T> }>): Promise<T> {
  try {
    const response = await work()
    return response.data.data as T
  } catch (error) {
    throw new Error(apiErrorMessage(error))
  }
}

export function listResources(page: number, limit: number, name?: string): Promise<Page<ResourceOut>> {
  return request(() =>
    api.get<ApiResponse<Page<ResourceOut>>>("/meta/resources", {
      params: { page, limit, name: name || undefined },
    }),
  )
}

export function getResource(name: string): Promise<ResourceOut> {
  return request(() => api.get<ApiResponse<ResourceOut>>(`/meta/resources/${name}`))
}
