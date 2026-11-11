import { api, ensureCsrf } from "@/services/api"
import type { ApiResponse, ClockDevice, ClockReleaseCode, Page } from "@/types/api"
import { apiErrorMessage } from "@/utils/api-error"

async function request<T>(work: () => Promise<{ data: ApiResponse<T> }>): Promise<T> {
  try {
    const response = await work()
    return response.data.data as T
  } catch (error) {
    throw new Error(apiErrorMessage(error))
  }
}

export function listClockDevices(page = 1, limit = 10): Promise<Page<ClockDevice>> {
  return request(() => api.get<ApiResponse<Page<ClockDevice>>>("/clock-devices", { params: { page, limit } }))
}

export function issueClockCode(): Promise<ClockReleaseCode> {
  return ensureCsrf().then(() => request(() => api.post<ApiResponse<ClockReleaseCode>>("/clock-release-codes")))
}

export function revokeClockDevice(id: number): Promise<null> {
  return ensureCsrf().then(() => request(() => api.delete<ApiResponse<null>>(`/clock-devices/${id}`)))
}
