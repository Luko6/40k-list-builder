/**
 * Persistence for lists: localStorage + JSON import/export.
 *
 * The on-disk / exported format is the schema's SavedList (with SCHEMA_VERSION),
 * so exported files are self-describing and can be migrated later. The builder
 * works in the lighter RosterState shape, so we convert at this boundary.
 */
import type { GameSizeId, SavedList } from '../data/schema'
import { SCHEMA_VERSION } from '../data/schema'
import type { RosterState } from './useRoster'

const CURRENT_KEY = 'btlb:current'
const LISTS_KEY = 'btlb:lists'

const now = () => new Date().toISOString()

export function toSavedList(state: RosterState, gameSizeId: GameSizeId): SavedList {
  const enhancementIds = state.units
    .map((u) => u.enhancementId)
    .filter((id): id is string => Boolean(id))
  return {
    schemaVersion: SCHEMA_VERSION,
    id: state.id,
    name: state.name.trim() || 'Untitled list',
    faction: 'black-templars',
    gameSizeId,
    detachments: [{ detachmentId: state.detachmentId, enhancementIds }],
    units: state.units.map((u) => ({
      instanceId: u.instanceId,
      datasheetId: u.datasheetId,
      sizeOptionIndex: u.sizeOptionIndex,
      wargearSelections: u.wargearSelections,
      ...(u.enhancementId ? { enhancementId: u.enhancementId } : {}),
    })),
    createdAt: state.createdAt,
    updatedAt: now(),
  }
}

export function fromSavedList(sl: SavedList): RosterState {
  if (sl.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `Unsupported list version ${sl.schemaVersion} (this app expects ${SCHEMA_VERSION}).`,
    )
  }
  if (sl.faction !== 'black-templars' || !Array.isArray(sl.units)) {
    throw new Error('This file is not a valid Black Templars list.')
  }
  return {
    id: sl.id,
    name: sl.name,
    createdAt: sl.createdAt ?? now(),
    detachmentId: sl.detachments?.[0]?.detachmentId ?? '',
    units: sl.units.map((u) => ({
      instanceId: u.instanceId,
      datasheetId: u.datasheetId,
      sizeOptionIndex: u.sizeOptionIndex,
      wargearSelections: u.wargearSelections ?? {},
      enhancementId: u.enhancementId,
    })),
  }
}

// ── localStorage (best-effort; storage can be unavailable/full) ──────────
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota or disabled — nothing we can do, work stays in memory */
  }
}

export function loadCurrent(): SavedList | null {
  return read<SavedList | null>(CURRENT_KEY, null)
}
export function saveCurrent(sl: SavedList) {
  write(CURRENT_KEY, sl)
}

export function getSavedLists(): SavedList[] {
  return read<SavedList[]>(LISTS_KEY, [])
}
export function upsertSavedList(sl: SavedList) {
  const lists = getSavedLists().filter((l) => l.id !== sl.id)
  lists.push(sl)
  lists.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  write(LISTS_KEY, lists)
}
export function deleteSavedList(id: string) {
  write(LISTS_KEY, getSavedLists().filter((l) => l.id !== id))
}

// ── File import/export ───────────────────────────────────────────────────
export function downloadJson(sl: SavedList) {
  const safe = sl.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
  const blob = new Blob([JSON.stringify(sl, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safe || 'list'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function readListFile(file: File): Promise<SavedList> {
  const text = await file.text()
  let parsed: SavedList
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  // Validate by round-tripping through fromSavedList (throws on bad shape).
  fromSavedList(parsed)
  return parsed
}
