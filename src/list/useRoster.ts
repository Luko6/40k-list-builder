import { useMemo, useReducer } from 'react'
import type { Detachment, FactionCatalogue } from '../data/schema'
import { fromSavedList, loadCurrent } from './storage'

/**
 * In-memory working state for the list being built. This is deliberately
 * lighter than the persisted SavedList shape (Phase 4) — it tracks only what
 * the builder needs right now: the chosen detachment and the unit instances
 * with their selected size. Wargear/enhancement/leader state lands here later.
 */
export interface RosterUnit {
  instanceId: string
  datasheetId: string
  sizeOptionIndex: number
}

export interface RosterState {
  id: string
  name: string
  createdAt: string
  detachmentId: string
  units: RosterUnit[]
}

type Action =
  | { type: 'setDetachment'; detachmentId: string }
  | { type: 'addUnit'; datasheetId: string }
  | { type: 'removeUnit'; instanceId: string }
  | { type: 'setSize'; instanceId: string; sizeOptionIndex: number }
  | { type: 'rename'; name: string }
  | { type: 'load'; state: RosterState }
  | { type: 'new'; detachmentId: string }

function reducer(state: RosterState, action: Action): RosterState {
  switch (action.type) {
    case 'setDetachment':
      return { ...state, detachmentId: action.detachmentId }
    case 'rename':
      return { ...state, name: action.name }
    case 'load':
      return action.state
    case 'new':
      return {
        id: crypto.randomUUID(),
        name: 'Untitled list',
        createdAt: new Date().toISOString(),
        detachmentId: action.detachmentId,
        units: [],
      }
    case 'addUnit':
      return {
        ...state,
        units: [
          ...state.units,
          {
            instanceId: crypto.randomUUID(),
            datasheetId: action.datasheetId,
            sizeOptionIndex: 0,
          },
        ],
      }
    case 'removeUnit':
      return { ...state, units: state.units.filter((u) => u.instanceId !== action.instanceId) }
    case 'setSize':
      return {
        ...state,
        units: state.units.map((u) =>
          u.instanceId === action.instanceId
            ? { ...u, sizeOptionIndex: action.sizeOptionIndex }
            : u,
        ),
      }
  }
}

export interface RosterTotals {
  points: number
  pointsLimit: number
  detachment: Detachment | undefined
  unitCount: number
  /** datasheetId -> count, for the "max N of each datasheet" rule. */
  perDatasheet: Map<string, number>
  overLimit: boolean
}

function init(catalogue: FactionCatalogue): RosterState {
  const current = loadCurrent()
  if (current) {
    try {
      return fromSavedList(current)
    } catch {
      /* stale/incompatible saved list — fall through to a fresh one */
    }
  }
  return {
    id: crypto.randomUUID(),
    name: 'Untitled list',
    createdAt: new Date().toISOString(),
    detachmentId: catalogue.detachments[0]?.id ?? '',
    units: [],
  }
}

export function useRoster(catalogue: FactionCatalogue) {
  const [state, dispatch] = useReducer(reducer, catalogue, init)

  const size = catalogue.gameSizes[0]
  const byId = useMemo(
    () => new Map(catalogue.datasheets.map((d) => [d.id, d])),
    [catalogue],
  )

  const totals: RosterTotals = useMemo(() => {
    let points = 0
    const perDatasheet = new Map<string, number>()
    for (const u of state.units) {
      const ds = byId.get(u.datasheetId)
      const opt = ds?.sizeOptions[u.sizeOptionIndex]
      if (opt) points += opt.points
      perDatasheet.set(u.datasheetId, (perDatasheet.get(u.datasheetId) ?? 0) + 1)
    }
    return {
      points,
      pointsLimit: size.pointsLimit,
      detachment: catalogue.detachments.find((d) => d.id === state.detachmentId),
      unitCount: state.units.length,
      perDatasheet,
      overLimit: points > size.pointsLimit,
    }
  }, [state, byId, catalogue.detachments, size])

  return { state, dispatch, totals, byId, size }
}
