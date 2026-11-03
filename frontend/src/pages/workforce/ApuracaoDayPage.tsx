import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"

import { BackLink } from "@/components/ui/back-link"
import { Spinner } from "@/components/ui/spinner"
import { ApuracaoDayDetails } from "@/components/workforce/apuracao-day"
import { apuracaoDay } from "@/components/workforce/apuracao-session"
import { getTimeResults, type TimeResult } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"

const backTo = "/schedules?aba=apuracao"

function isoDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return ""
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return ""
  return value
}

export function ApuracaoDayPage() {
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const params = useParams()
  const [search] = useSearchParams()
  const workDate = isoDate(params.workDate)
  const employeeId = Number(search.get("funcionario"))
  const startsOn = isoDate(search.get("de") ?? undefined)
  const endsOn = isoDate(search.get("ate") ?? undefined)
  const readyContext = Boolean(tenantId && workDate && Number.isInteger(employeeId) && employeeId > 0 && startsOn && endsOn)
  const cached = readyContext ? apuracaoDay(tenantId, employeeId, startsOn, endsOn, workDate) : null
  const [item, setItem] = useState<TimeResult | null>(cached)
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">(cached ? "ready" : readyContext ? "loading" : "missing")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!readyContext) {
      setItem(null)
      setStatus("missing")
      return
    }
    const cached = apuracaoDay(tenantId, employeeId, startsOn, endsOn, workDate)
    if (cached) {
      setItem(cached)
      setError("")
      setStatus("ready")
      return
    }
    let active = true
    setItem(null)
    setError("")
    setStatus("loading")
    getTimeResults(employeeId, workDate, workDate)
      .then((data) => {
        if (!active) return
        const found = data.employee_id === employeeId ? data.items.find((row) => row.work_date.slice(0, 10) === workDate) : undefined
        if (!found) {
          setStatus("missing")
          return
        }
        setItem(found)
        setStatus("ready")
      })
      .catch((caught: unknown) => {
        if (!active) return
        setError(caught instanceof Error ? caught.message : "Não foi possível apurar.")
        setStatus("error")
      })
    return () => {
      active = false
    }
  }, [tenantId, employeeId, startsOn, endsOn, workDate, readyContext])

  return (
    <div className="w-full min-w-0 space-y-5">
      <BackLink to={backTo} appearance="detail" />
      {status === "loading" ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-[#E4E4E7] bg-white px-5 py-10" role="status" aria-live="polite">
          <Spinner label="Carregando a apuração" className="h-8 w-8 text-[#1E8A3A]" />
        </div>
      ) : null}
      {status === "error" ? <p className="text-sm text-destructive">{error}</p> : null}
      {status === "missing" ? (
        <p className="rounded-xl border border-[#E4E4E7] bg-white px-5 py-4 text-sm text-brand-muted">
          O resultado desta apuração não está disponível. Volte à consulta para apurar de novo.
        </p>
      ) : null}
      {status === "ready" && item ? <ApuracaoDayDetails item={item} /> : null}
    </div>
  )
}
