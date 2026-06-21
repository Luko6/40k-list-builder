import type { Datasheet, Enhancement } from '../data/schema'
import type { RosterUnit } from './useRoster'

/** Default enhancement eligibility: a CHARACTER that isn't an Epic Hero. */
export function canTakeEnhancement(ds: Datasheet): boolean {
  return ds.keywords.includes('Character') && !ds.keywords.includes('Epic Hero')
}

/** Whether this specific enhancement may go on this datasheet. Most are any
 *  non-Epic character; some are restricted to a datasheet/keyword (e.g.
 *  Marshal's Household enhancements → Sword Brethren Squad). */
export function canTakeEnhancementOf(ds: Datasheet, enh: Enhancement): boolean {
  if (enh.eligibility?.datasheetId) return ds.id === enh.eligibility.datasheetId
  if (enh.eligibility?.keyword) return ds.keywords.includes(enh.eligibility.keyword)
  return canTakeEnhancement(ds)
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
