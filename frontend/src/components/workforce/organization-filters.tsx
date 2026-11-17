import { useEffect, useRef, useState } from "react"

import { Label } from "@/components/ui/label"
import { SiteSelect } from "@/components/ui/site-select"
import { PlaceCombobox } from "@/components/workforce/place-combobox"
import { moduleLabelClass } from "@/components/workforce/module-visual"
import { listRecords, type NamedRecord } from "@/services/workforce.service"
import { toastError } from "@/store/toast.store"
import { conceptIcon } from "@/utils/concept-icons"

const situationOptions = [
  { value: "", label: "Todas" },
  { value: "active", label: "Ativo" },
  { value: "dismissed", label: "Desligado" },
]

function alignTeams(current: number[], units: number[], added: number[], removed: number[], catalog: NamedRecord[]) {
  const removedIds = new Set(catalog.filter((item) => item.unit_id != null && removed.includes(item.unit_id)).map((item) => item.id))
  const addedIds = catalog.filter((item) => item.unit_id != null && added.includes(item.unit_id)).map((item) => item.id)
  const next = [...new Set([...current.filter((id) => !removedIds.has(id)), ...addedIds])]
  if (units.length === 0) return next
  const allowed = new Set(catalog.filter((item) => item.unit_id != null && units.includes(item.unit_id)).map((item) => item.id))
  return next.filter((id) => allowed.has(id))
}

function mergeRecords(current: NamedRecord[], extra: NamedRecord[]) {
  const pool = new Map(current.map((item) => [item.id, item]))
  for (const item of extra) pool.set(item.id, item)
  return [...pool.values()]
}

async function loadAll(path: string, params: Record<string, string | number> = {}) {
  const first = await listRecords<NamedRecord>(path, { page: 1, limit: 100, ...params })
  const items = [...first.items]
  const pages = Math.ceil(first.total / 100)
  for (let page = 2; page <= pages; page += 1) {
    const next = await listRecords<NamedRecord>(path, { page, limit: 100, ...params })
    items.push(...next.items)
  }
  return items
}

export function useOrganizationFilters(enabled: boolean) {
  const [units, setUnits] = useState<NamedRecord[]>([])
  const [teams, setTeams] = useState<NamedRecord[]>([])
  const [jobs, setJobs] = useState<NamedRecord[]>([])
  const [journeys, setJourneys] = useState<NamedRecord[]>([])
  const [ready, setReady] = useState(false)
  const [unitIds, setUnitIds] = useState<number[]>([])
  const [teamIds, setTeamIds] = useState<number[]>([])
  const [jobIds, setJobIds] = useState<number[]>([])
  const [journeyIds, setJourneyIds] = useState<number[]>([])
  const [situation, setSituation] = useState("")
  const unitIdsRef = useRef<number[]>([])
  const teamsRef = useRef<NamedRecord[]>([])
  const request = useRef(0)

  useEffect(() => {
    if (!enabled) return
    let active = true
    setReady(false)
    Promise.all([
      listRecords<NamedRecord>("/units", { page: 1, limit: 100 }),
      listRecords<NamedRecord>("/teams", { page: 1, limit: 100 }),
      listRecords<NamedRecord>("/jobs", { page: 1, limit: 100 }),
      listRecords<NamedRecord>("/journeys", { page: 1, limit: 100 }),
    ])
      .then(([unitPage, teamPage, jobPage, journeyPage]) => {
        if (!active) return
        setUnits(unitPage.items)
        setTeams(teamPage.items)
        teamsRef.current = teamPage.items
        setJobs(jobPage.items)
        setJourneys(journeyPage.items)
      })
      .catch((caught: unknown) => {
        if (active) toastError(caught instanceof Error ? caught.message : "Não foi possível carregar os filtros.")
      })
      .finally(() => {
        if (active) setReady(true)
      })
    return () => {
      active = false
    }
  }, [enabled])

  function reset() {
    request.current += 1
    unitIdsRef.current = []
    setUnitIds([])
    setTeamIds([])
    setJobIds([])
    setJourneyIds([])
    setSituation("")
  }

  function changeUnits(next: number[]) {
    const ticket = ++request.current
    const previous = unitIdsRef.current
    const added = next.filter((id) => !previous.includes(id))
    const removed = previous.filter((id) => !next.includes(id))
    unitIdsRef.current = next
    setUnitIds(next)
    void (async () => {
      let catalog = teamsRef.current
      if (added.length > 0) {
        try {
          const pages = await Promise.all(added.map((id) => loadAll("/teams", { unit_id: id })))
          if (ticket !== request.current) return
          catalog = mergeRecords(catalog, pages.flat())
          teamsRef.current = catalog
          setTeams(catalog)
        } catch (caught: unknown) {
          if (ticket === request.current) toastError(caught instanceof Error ? caught.message : "Não foi possível carregar as equipes.")
        }
      }
      if (ticket !== request.current) return
      setTeamIds((current) => alignTeams(current, next, added, removed, teamsRef.current))
    })()
  }

  function changeTeams(next: number[]) {
    const unitsSelected = unitIdsRef.current
    if (unitsSelected.length === 0) {
      setTeamIds(next)
      return
    }
    const allowed = new Set(teamsRef.current.filter((item) => item.unit_id != null && unitsSelected.includes(item.unit_id)).map((item) => item.id))
    setTeamIds(next.filter((id) => allowed.has(id)))
  }

  const teamOptions = unitIds.length === 0 ? teams : teams.filter((item) => item.unit_id != null && unitIds.includes(item.unit_id))
  const params: Record<string, string> = {}
  if (unitIds.length) params.unit_id = unitIds.join(",")
  if (teamIds.length) params.team_id = teamIds.join(",")
  if (jobIds.length) params.job_id = jobIds.join(",")
  if (journeyIds.length) params.journey_id = journeyIds.join(",")
  if (situation) params.situation = situation
  const active = unitIds.length + teamIds.length + jobIds.length + journeyIds.length > 0 || situation !== ""
  const key = JSON.stringify(params)

  return {
    ready,
    active,
    key,
    params,
    reset,
    units,
    teamOptions,
    jobs,
    journeys,
    unitIds,
    teamIds,
    jobIds,
    journeyIds,
    situation,
    changeUnits,
    changeTeams,
    setJobIds,
    setJourneyIds,
    setSituation,
  }
}

export function OrganizationFilterFields({
  idPrefix,
  filters,
}: {
  idPrefix: string
  filters: ReturnType<typeof useOrganizationFilters>
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div className="min-w-0 space-y-2">
        <Label className={moduleLabelClass} htmlFor={`${idPrefix}-unit`}>Empresa</Label>
        <PlaceCombobox id={`${idPrefix}-unit`} icon={conceptIcon.unit} options={filters.units} selected={filters.unitIds} emptyLabel="Todas" searchPlaceholder="Pesquisar empresa" emptyResult="Nenhuma empresa encontrada." searchPath="/units" extendSearch={filters.units.length >= 100} loading={!filters.ready} onChange={filters.changeUnits} />
      </div>
      <div className="min-w-0 space-y-2">
        <Label className={moduleLabelClass} htmlFor={`${idPrefix}-team`}>Equipe</Label>
        <PlaceCombobox id={`${idPrefix}-team`} icon={conceptIcon.team} options={filters.teamOptions} selected={filters.teamIds} emptyLabel="Todas" searchPlaceholder="Pesquisar equipe" emptyResult="Nenhuma equipe encontrada." searchPath="/teams" extendSearch={filters.unitIds.length === 0 && filters.teamOptions.length >= 100} loading={!filters.ready} onChange={filters.changeTeams} />
      </div>
      <div className="min-w-0 space-y-2">
        <Label className={moduleLabelClass} htmlFor={`${idPrefix}-job`}>Função</Label>
        <PlaceCombobox id={`${idPrefix}-job`} icon={conceptIcon.job} options={filters.jobs} selected={filters.jobIds} emptyLabel="Todas" searchPlaceholder="Pesquisar função" emptyResult="Nenhuma função encontrada." searchPath="/jobs" extendSearch={filters.jobs.length >= 100} loading={!filters.ready} onChange={filters.setJobIds} />
      </div>
      <div className="min-w-0 space-y-2">
        <Label className={moduleLabelClass} htmlFor={`${idPrefix}-journey`}>Jornada</Label>
        <PlaceCombobox id={`${idPrefix}-journey`} icon={conceptIcon.journey} options={filters.journeys} selected={filters.journeyIds} emptyLabel="Todas" searchPlaceholder="Pesquisar jornada" emptyResult="Nenhuma jornada encontrada." searchPath="/journeys" extendSearch={filters.journeys.length >= 100} loading={!filters.ready} onChange={filters.setJourneyIds} />
      </div>
      <div className="min-w-0 space-y-2">
        <Label className={moduleLabelClass} htmlFor={`${idPrefix}-situation`}>Situação</Label>
        <SiteSelect id={`${idPrefix}-situation`} value={filters.situation} className="h-[50px]" icon={conceptIcon.situation} options={situationOptions} onChange={filters.setSituation} />
      </div>
    </div>
  )
}
