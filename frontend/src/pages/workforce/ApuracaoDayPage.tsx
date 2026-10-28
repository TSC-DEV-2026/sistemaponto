import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"

import { BackLink } from "@/components/ui/back-link"
import { Spinner } from "@/components/ui/spinner"
import { ApuracaoDayDetails, SituationBadge } from "@/components/workforce/apuracao-day"
import { apuracaoDay } from "@/components/workforce/apuracao-session"
import { getTimeResults, type TimeResult } from "@/services/workforce.service"
import { useAuthStore } from "@/store/auth.store"
import { showDate } from "@/utils/labels"

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
    <div className="w-full">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.14em] text-brand-cta">APURAÇÃO / DETALHES</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight text-brand-ink">{workDate ? showDate(workDate) : "Data inválida"}</h2>
            {item ? <SituationBadge item={item} /> : null}
          </div>
          <p className="mt-1 text-sm text-brand-quiet">Detalhamento das horas apuradas</p>
        </div>
        <BackLink to={backTo} appearance="detail" />
      </div>
      {status === "loading" ? (
        <div className="mt-4 flex justify-center rounded-xl border border-[#E4E4E7] bg-white px-5 py-10">
          <Spinner />
        </div>
      ) : null}
      {status === "error" ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      {status === "missing" ? (
        <p className="mt-4 rounded-xl border border-[#E4E4E7] bg-white px-5 py-4 text-sm text-brand-muted">
          O resultado desta apuração não está disponível. Volte à consulta para apurar de novo.
        </p>
      ) : null}
      {status === "ready" && item ? (
        <div className="mt-4">
          <ApuracaoDayDetails item={item} />
        </div>
      ) : null}
    </div>
  )
}
