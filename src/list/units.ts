import type { Datasheet, Enhancement } from '../data/schema'
import type { RosterUnit } from './useRoster'

/** Enhancements go on CHARACTERs that aren't Epic Heroes (e.g. not Helbrecht). */
export function canTakeEnhancement(ds: Datasheet): boolean {
  return ds.keywords.includes('Character') && !ds.keywords.includes('Epic Hero')
}

/** canLead carries some slugified rule-text fragments from compilation; keep
 *  only ids that resolve to a real datasheet in the catalogue. */
export function realCanLead(ds: Datasheet, byId: Map<string, Datasheet>): string[] {
  return (ds.canLead ?? []).filter((id) => byId.has(id))
}

/** Which attach slot a character occupies. A bodyguard unit may hold at most one
 *  LEADER and one SUPPORT character. Attachable characters with no explicit role
 *  are treated as leaders. */
export function attachSlot(ds?: Datasheet): 'leader' | 'support' {
  return ds?.role === 'support' ? 'support' : 'leader'
}

export function unitPoints(ds: Datasheet, u: RosterUnit, enhancement?: Enhancement): number {
  return (ds.sizeOptions[u.sizeOptionIndex]?.points ?? 0) + (enhancement?.points ?? 0)
}

/** Label each instance, disambiguating duplicates of the same datasheet. */
export function buildInstanceLabels(
  units: RosterUnit[],
  byId: Map<string, Datasheet>,
): Map<string, string> {
  const counts = new Map<string, number>()
  for (const u of units) counts.set(u.datasheetId, (counts.get(u.datasheetId) ?? 0) + 1)
  const seen = new Map<string, number>()
  const labels = new Map<string, string>()
  for (const u of units) {
    const name = byId.get(u.datasheetId)?.name ?? u.datasheetId
    if ((counts.get(u.datasheetId) ?? 0) > 1) {
      const n = (seen.get(u.datasheetId) ?? 0) + 1
      seen.set(u.datasheetId, n)
      labels.set(u.instanceId, `${name} #${n}`)
    } else {
      labels.set(u.instanceId, name)
    }
  }
  return labels
}
