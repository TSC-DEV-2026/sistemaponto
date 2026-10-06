export type ApiResponse<T> = {
  data: T | null
  error: { message: string } | null
}

export type Page<T> = {
  items: T[]
  total: number
  page: number
  limit: number
}

export type Tenant = {
  id: number
  name: string
  slug: string
  document: string | null
  trial_started_at: string
  trial_ends_at: string
  employee_capacity: number
}

export type Membership = {
  id: number
  person_id: number
  full_name: string
  role: string
}

export type SessionUser = {
  person_id: number
  full_name: string
  email: string
  email_verified: boolean
  role: string | null
  active_tenant: Tenant | null
  tenants: Tenant[]
  must_login: boolean
}

export type ResourceOut = {
  name: string
  fields: string[]
  list_fields: string[]
}
