import { useMemo, useReducer } from 'react'
import type { Detachment, FactionCatalogue } from '../data/schema'
import { fromSavedList, loadCurrent } from './storage'

/**
 * In-memory working state for the list being built. This is deliberately
 * lighter than the persisted SavedList shape (Phase 4) — it tracks the chosen
 * detachment and the unit instances with their selected size, wargear choices,
 * and any assigned enhancement. Leader attachment state lands here later.
 */
export interface RosterUnit {
  instanceId: string
  datasheetId: string
  sizeOptionIndex: number
  /** wargear optionId -> selected choiceId(s). */
  wargearSelections: Record<string, string[]>
  /** Enhancement (from the current detachment) assigned to this unit. */
  enhancementId?: string
  /** For a LEADER: instanceId of the bodyguard unit it's attached to. */
  attachedToInstanceId?: string
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
  | { type: 'setWargear'; instanceId: string; optionId: string; choiceIds: string[] }
  | { type: 'setEnhancement'; instanceId: string; enhancementId?: string }
  | { type: 'setAttachment'; instanceId: string; attachedToInstanceId?: string }
  | { type: 'rename'; name: string }
  | { type: 'load'; state: RosterState }
  | { type: 'new'; detachmentId: string }

function reducer(state: RosterState, action: Action): RosterState {
  switch (action.type) {
    case 'setDetachment':
      if (action.detachmentId === state.detachmentId) return state
      // Enhancements belong to a detachment, so switching invalidates them.
      return {
        ...state,
        detachmentId: action.detachmentId,
        units: state.units.map((u) =>
          u.enhancementId ? { ...u, enhancementId: undefined } : u,
        ),
      }
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
            wargearSelections: {},
          },
        ],
      }
    case 'removeUnit':
      return {
        ...state,
        units: state.units
          .filter((u) => u.instanceId !== action.instanceId)
          // Detach any leader that was attached to the removed bodyguard.
          .map((u) =>
            u.attachedToInstanceId === action.instanceId
              ? { ...u, attachedToInstanceId: undefined }
              : u,
          ),
      }
    case 'setSize':
      return {
        ...state,
        units: state.units.map((u) =>
          u.instanceId === action.instanceId
            ? { ...u, sizeOptionIndex: action.sizeOptionIndex }
            : u,
        ),
      }
    case 'setWargear':
      return {
        ...state,
        units: state.units.map((u) => {
          if (u.instanceId !== action.instanceId) return u
          const wargearSelections = { ...u.wargearSelections }
          if (action.choiceIds.length) wargearSelections[action.optionId] = action.choiceIds
          else delete wargearSelections[action.optionId]
          return { ...u, wargearSelections }
        }),
      }
    case 'setEnhancement':
      return {
        ...state,
        units: state.units.map((u) =>
          u.instanceId === action.instanceId
            ? { ...u, enhancementId: action.enhancementId || undefined }
            : u,
        ),
      }
    case 'setAttachment':
      return {
        ...state,
        units: state.units.map((u) =>
          u.instanceId === action.instanceId
            ? { ...u, attachedToInstanceId: action.attachedToInstanceId || undefined }
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
  /** Enhancements assigned across the army. */
  enhancementsUsed: number
  enhancementLimit: number
  enhancementOverLimit: boolean
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
    const detachment = catalogue.detachments.find((d) => d.id === state.detachmentId)
    const enhancementById = new Map((detachment?.enhancements ?? []).map((e) => [e.id, e]))
    let points = 0
    let enhancementsUsed = 0
    const perDatasheet = new Map<string, number>()
    for (const u of state.units) {
      const ds = byId.get(u.datasheetId)
      const opt = ds?.sizeOptions[u.sizeOptionIndex]
      if (opt) points += opt.points
      // Wargear point deltas (0 in current data, but modeled for safety).
      for (const choiceIds of Object.values(u.wargearSelections)) {
        for (const choiceId of choiceIds) {
          const choice = ds?.wargearOptions
            .flatMap((o) => o.choices)
            .find((c) => c.id === choiceId)
          if (choice?.pointsDelta) points += choice.pointsDelta
        }
      }
      const enhancement = u.enhancementId ? enhancementById.get(u.enhancementId) : undefined
      if (enhancement) {
        points += enhancement.points
        enhancementsUsed += 1
      }
      perDatasheet.set(u.datasheetId, (perDatasheet.get(u.datasheetId) ?? 0) + 1)
    }
    return {
      points,
      pointsLimit: size.pointsLimit,
      detachment,
      unitCount: state.units.length,
      perDatasheet,
      overLimit: points > size.pointsLimit,
      enhancementsUsed,
      enhancementLimit: size.enhancementLimit,
      enhancementOverLimit: enhancementsUsed > size.enhancementLimit,
    }
  }, [state, byId, catalogue.detachments, size])

  return { state, dispatch, totals, byId, size }
}
