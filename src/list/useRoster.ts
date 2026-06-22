import { useMemo, useReducer } from 'react'
import type { Detachment, FactionCatalogue, GameSizeId } from '../data/schema'
import { fromSavedList, loadCurrent } from './storage'

/**
 * In-memory working state for the list being built. This is deliberately
 * lighter than the persisted SavedList shape (Phase 4) — it tracks the chosen
 * detachments and the unit instances with their selected size, wargear choices,
 * assigned enhancement, and leader attachment.
 */
export interface RosterUnit {
  instanceId: string
  datasheetId: string
  sizeOptionIndex: number
  /** wargear optionId -> selected choiceId(s). */
  wargearSelections: Record<string, string[]>
  /** Enhancement (from one of the selected detachments) assigned to this unit. */
  enhancementId?: string
  /** For a LEADER: instanceId of the bodyguard unit it's attached to. */
  attachedToInstanceId?: string
}

export interface RosterState {
  id: string
  name: string
  createdAt: string
  /** Game size (points/DP/enhancement budgets), e.g. strikeForce or incursion. */
  gameSizeId: GameSizeId
  /** 11e lets an army combine several detachments up to the DP budget. */
  detachmentIds: string[]
  units: RosterUnit[]
}

type Action =
  | { type: 'addDetachment'; detachmentId: string }
  | { type: 'removeDetachment'; detachmentId: string; remainingEnhancementIds: string[] }
  | { type: 'addUnit'; datasheetId: string }
  | { type: 'removeUnit'; instanceId: string }
  | { type: 'setSize'; instanceId: string; sizeOptionIndex: number }
  | { type: 'setWargear'; instanceId: string; optionId: string; choiceIds: string[] }
  | { type: 'setEnhancement'; instanceId: string; enhancementId?: string }
  | { type: 'setAttachment'; instanceId: string; attachedToInstanceId?: string }
  | { type: 'rename'; name: string }
  | { type: 'setGameSize'; gameSizeId: GameSizeId }
  | { type: 'load'; state: RosterState }
  | { type: 'new'; detachmentId: string; gameSizeId: GameSizeId }

function reducer(state: RosterState, action: Action): RosterState {
  switch (action.type) {
    case 'addDetachment':
      if (state.detachmentIds.includes(action.detachmentId)) return state
      return { ...state, detachmentIds: [...state.detachmentIds, action.detachmentId] }
    case 'removeDetachment': {
      const kept = new Set(action.remainingEnhancementIds)
      return {
        ...state,
        detachmentIds: state.detachmentIds.filter((id) => id !== action.detachmentId),
        // Drop enhancements that only existed in the removed detachment.
        units: state.units.map((u) =>
          u.enhancementId && !kept.has(u.enhancementId)
            ? { ...u, enhancementId: undefined }
            : u,
        ),
      }
    }
    case 'rename':
      return { ...state, name: action.name }
    case 'setGameSize':
      return { ...state, gameSizeId: action.gameSizeId }
    case 'load':
      return action.state
    case 'new':
      return {
        id: crypto.randomUUID(),
        name: 'Untitled list',
        createdAt: new Date().toISOString(),
        gameSizeId: action.gameSizeId,
        detachmentIds: action.detachmentId ? [action.detachmentId] : [],
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
  /** All currently-selected detachments. */
  detachments: Detachment[]
  unitCount: number
  /** datasheetId -> count, for the "max N of each datasheet" rule. */
  perDatasheet: Map<string, number>
  overLimit: boolean
  /** Enhancements assigned across the army. */
  enhancementsUsed: number
  enhancementLimit: number
  enhancementOverLimit: boolean
  /** Detachment-Points budget (sum of detachment DP vs the game-size budget). */
  detachmentPointsUsed: number
  detachmentPointsBudget: number
  dpOverBudget: boolean
  /** Human-readable validation issues, for the validation panel. */
  problems: string[]
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
    gameSizeId: catalogue.gameSizes[0]?.id ?? 'strikeForce',
    detachmentIds: catalogue.detachments[0] ? [catalogue.detachments[0].id] : [],
    units: [],
  }
}

export function useRoster(catalogue: FactionCatalogue) {
  const [state, dispatch] = useReducer(reducer, catalogue, init)

  const size =
    catalogue.gameSizes.find((s) => s.id === state.gameSizeId) ?? catalogue.gameSizes[0]
  const byId = useMemo(
    () => new Map(catalogue.datasheets.map((d) => [d.id, d])),
    [catalogue],
  )

  const totals: RosterTotals = useMemo(() => {
    const detachments = state.detachmentIds
      .map((id) => catalogue.detachments.find((d) => d.id === id))
      .filter((d): d is Detachment => Boolean(d))
    // Enhancement lookup across the union of selected detachments.
    const enhancementById = new Map(
      detachments.flatMap((d) => d.enhancements.map((e) => [e.id, e] as const)),
    )
    let points = 0
    // Upgrade-type enhancements can be taken multiple times; collectively they
    // use a single enhancement slot (and are capped at 3 instances). Other
    // enhancements are unique and each use one slot.
    let nonUpgradeAssignments = 0
    let upgradeInstances = 0
    const perDatasheet = new Map<string, number>()
    const enhancementUses = new Map<string, number>()
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
        enhancementUses.set(enhancement.id, (enhancementUses.get(enhancement.id) ?? 0) + 1)
        if (enhancement.isUpgrade) upgradeInstances += 1
        else nonUpgradeAssignments += 1
      }
      perDatasheet.set(u.datasheetId, (perDatasheet.get(u.datasheetId) ?? 0) + 1)
    }

    // Upgrades share one slot collectively; non-upgrades use one each.
    const enhancementsUsed = nonUpgradeAssignments + (upgradeInstances > 0 ? 1 : 0)
    const detachmentPointsUsed = detachments.reduce((n, d) => n + d.detachmentPoints, 0)
    const detachmentPointsBudget = size.detachmentPoints
    const dpOverBudget = detachmentPointsUsed > detachmentPointsBudget

    // Consolidated, human-readable validation issues.
    const problems: string[] = []
    if (detachments.length === 0) problems.push('No detachment selected.')
    if (points > size.pointsLimit)
      problems.push(`Over the points limit by ${points - size.pointsLimit} (${points}/${size.pointsLimit}).`)
    if (dpOverBudget)
      problems.push(
        `Detachments cost ${detachmentPointsUsed} DP, over the ${detachmentPointsBudget} DP budget.`,
      )
    if (enhancementsUsed > size.enhancementLimit)
      problems.push(`${enhancementsUsed} enhancements assigned, over the limit of ${size.enhancementLimit}.`)
    // Non-upgrade enhancements are unique; Upgrades may repeat (max 3 instances).
    const dupEnh = [...enhancementUses.entries()].filter(
      ([id, n]) => n > 1 && !enhancementById.get(id)?.isUpgrade,
    )
    for (const [id] of dupEnh) {
      const name = enhancementById.get(id)?.name ?? id
      problems.push(`Enhancement "${name}" is assigned more than once.`)
    }
    if (upgradeInstances > 3)
      problems.push(`${upgradeInstances} Upgrade enhancements taken — max 3.`)
    for (const [datasheetId, count] of perDatasheet) {
      const ds = byId.get(datasheetId)
      if (!ds || ds.isDedicatedTransport) continue
      if (count > size.datasheetLimit)
        problems.push(`${count}× ${ds.name} — max ${size.datasheetLimit} of a datasheet.`)
    }

    return {
      points,
      pointsLimit: size.pointsLimit,
      detachments,
      unitCount: state.units.length,
      perDatasheet,
      overLimit: points > size.pointsLimit,
      enhancementsUsed,
      enhancementLimit: size.enhancementLimit,
      enhancementOverLimit: enhancementsUsed > size.enhancementLimit,
      detachmentPointsUsed,
      detachmentPointsBudget,
      dpOverBudget,
      problems,
    }
  }, [state, byId, catalogue.detachments, size])

  return { state, dispatch, totals, byId, size }
}
