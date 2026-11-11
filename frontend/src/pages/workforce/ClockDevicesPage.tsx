import { MonitorSmartphone, ShieldOff } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ListPager } from "@/components/workforce/list-controls"
import { moduleCardClass, moduleDangerClass, modulePrimaryClass, moduleQuietClass } from "@/components/workforce/module-visual"
import { issueClockCode, listClockDevices, revokeClockDevice } from "@/services/clock-device.service"
import { useAuthStore } from "@/store/auth.store"
import type { ClockDevice, ClockReleaseCode } from "@/types/api"
import { cn } from "@/utils/cn"

function when(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}

export function ClockDevicesPage() {
  const navigate = useNavigate()
  const role = useAuthStore((state) => state.user?.role)
  const isAdmin = role === "admin"
  const tenantId = useAuthStore((state) => state.activeTenant?.id)
  const requestId = useRef(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [items, setItems] = useState<ClockDevice[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)
  const [issuing, setIssuing] = useState(false)
  const [code, setCode] = useState<ClockReleaseCode | null>(null)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [revoking, setRevoking] = useState(false)

  useEffect(() => {
    if (!role || isAdmin) return
    navigate("/", { replace: true })
  }, [role, isAdmin, navigate])

  useEffect(() => {
    if (!isAdmin) return
    const current = ++requestId.current
    setLoading(true)
    setError("")
    listClockDevices(page, pageSize)
      .then((result) => {
        if (current !== requestId.current) return
        setItems(result.items)
        setTotal(result.total)
      })
      .catch((caught: unknown) => {
        if (current !== requestId.current) return
        setItems([])
        setTotal(0)
        setError(caught instanceof Error ? caught.message : "Não foi possível listar.")
      })
      .finally(() => {
        if (current === requestId.current) setLoading(false)
      })
  }, [isAdmin, tenantId, page, pageSize, reloadKey])

  async function generate() {
    setIssuing(true)
    setError("")
    try {
      setCode(await issueClockCode())
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Não foi possível gerar o código.")
    } finally {
      setIssuing(false)
    }
  }

  async function revoke(id: number) {
    setRevoking(true)
    setError("")
    try {
      await revokeClockDevice(id)
      setPendingId(null)
      setReloadKey((current) => current + 1)
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Não foi possível revogar.")
    } finally {
      setRevoking(false)
    }
  }

  if (!isAdmin) return null

  return (
    <div className="w-full min-w-0 space-y-4">
      <section className={moduleCardClass}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(30,138,58,0.1)] text-[#1E8A3A]" aria-hidden>
              <MonitorSmartphone className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[#0A0A0A]">Liberar aparelho</h2>
              <p className="text-sm text-[#64748B]">O código vale 10 minutos e uma vez. A senha da conta não vai para o aparelho.</p>
            </div>
          </div>
          <Button type="button" className={cn(modulePrimaryClass, "h-12 w-full shrink-0 sm:w-auto")} disabled={issuing} onClick={generate}>
            {issuing ? "Gerando" : "Gerar código"}
          </Button>
        </div>
        {code ? (
          <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-[#F7FCF9] px-4 py-5 text-center">
            <p className="text-sm text-[#64748B]">Digite no aparelho</p>
            <p className="mt-2 font-mono text-3xl font-semibold tracking-[0.2em] text-[#0A0A0A]">{code.code}</p>
            <p className="mt-2 text-sm text-[#64748B]">Válido até {when(code.expires_at)}</p>
          </div>
        ) : null}
      </section>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      <section className={moduleCardClass}>
        <h2 className="text-lg font-semibold text-[#0A0A0A]">Aparelhos desta empresa</h2>
        {loading ? (
          <div className="flex justify-center py-10" role="status">
            <Spinner label="Carregando os aparelhos" className="h-8 w-8 text-[#1E8A3A]" />
          </div>
        ) : null}
        {!loading && !error && items.length === 0 ? (
          <div className="px-2 py-10 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(30,138,58,0.08)] text-[#1E8A3A]">
              <MonitorSmartphone className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-[#0A0A0A]">Nenhum aparelho</p>
            <p className="mt-1 text-sm text-[#71717A]">Gere um código e confirme no aparelho.</p>
          </div>
        ) : null}
        {!loading && items.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex min-h-16 min-w-0 flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 sm:flex-row sm:items-center">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-[#0A0A0A]">{item.public_id}</span>
                  <span className="mt-[3px] block truncate text-sm text-[#64748B]">Liberado em {when(item.created_at)}</span>
                </span>
                {pendingId === item.id ? (
                  <span className="flex shrink-0 gap-2">
                    <Button type="button" className={moduleQuietClass} disabled={revoking} onClick={() => setPendingId(null)}>
                      Cancelar
                    </Button>
                    <Button type="button" className={moduleDangerClass} disabled={revoking} onClick={() => revoke(item.id)}>
                      {revoking ? "Revogando" : "Confirmar"}
                    </Button>
                  </span>
                ) : (
                  <Button type="button" className={cn(moduleDangerClass, "w-full sm:w-auto")} onClick={() => setPendingId(item.id)}>
                    <ShieldOff className="h-4 w-4" />
                    Revogar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        {!loading && total > 0 ? (
          <div className="mt-4 border-t border-[#F1F5F9] pt-4">
            <ListPager page={page} pageSize={pageSize} total={total} onPage={setPage} onPageSize={(size) => { setPage(1); setPageSize(size) }} />
          </div>
        ) : null}
      </section>
    </div>
  )
}
