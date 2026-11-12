import { useEffect, useState } from "react"

import { listRecords, type Closing, type TimeRequest } from "@/services/workforce.service"

function overlaps(start: string | null | undefined, end: string | null | undefined, from: string, to: string) {
  const left = (start || "").slice(0, 10)
  const right = (end || start || "").slice(0, 10)
  if (!left) return false
  const begin = left <= right ? left : right
  const finish = left <= right ? right : left
  return begin <= to && from <= finish
}

export function rangeLockMessage(start: string, end: string, closings: Closing[], requests: TimeRequest[]) {
  const from = start.slice(0, 10)
  const to = (end || start).slice(0, 10)
  if (!from) return ""
  const [begin, finish] = from <= to ? [from, to] : [to, from]
  const closed = closings.some((item) => item.status === "closed" && overlaps(item.starts_on, item.ends_on, begin, finish))
  if (closed) return "Período fechado."
  const pending = requests.some((item) => item.status === "pending" && overlaps(item.starts_on || item.occurred_at, item.ends_on || item.starts_on || item.occurred_at, begin, finish))
  if (pending) return "Há solicitação pendente cobrindo este dia."
  return ""
}

export function useDayLocks(employeeId: number | null) {
  const [closings, setClosings] = useState<Closing[]>([])
  const [requests, setRequests] = useState<TimeRequest[]>([])
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!employeeId) {
      setClosings([])
      setRequests([])
      return
    }
    let active = true
    Promise.all([
      listRecords<Closing>("/closings", { page: 1, limit: 100, status: "closed" }),
      listRecords<TimeRequest>("/requests", { page: 1, limit: 100, employee_id: employeeId, status: "pending" }),
    ])
      .then(([closed, pending]) => {
        if (!active) return
        setClosings(closed.items)
        setRequests(pending.items)
      })
      .catch(() => {
        if (!active) return
        setClosings([])
        setRequests([])
      })
    return () => {
      active = false
    }
  }, [employeeId, version])

  return {
    lockDay: (day: string) => rangeLockMessage(day, day, closings, requests),
    lockRange: (start: string, end: string) => rangeLockMessage(start, end, closings, requests),
    reload: () => setVersion((current) => current + 1),
  }
}
