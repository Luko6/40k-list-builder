import type { Datasheet } from '../data/schema'

/** Roster sections, in display order (New Recruit-style, keyword-driven). */
export const CATEGORY_ORDER = [
  'Epic Heroes',
  'Characters',
  'Battleline',
  'Infantry',
  'Mounted',
  'Vehicles',
  'Fortifications',
  'Dedicated Transports',
  'Allies',
  'Other',
] as const

export type Category = (typeof CATEGORY_ORDER)[number]

/** Which roster section a datasheet belongs to. A unit carries several keywords
 *  (e.g. Character + Infantry), so the first match in this priority order wins. */
export function unitCategory(ds: Datasheet): Category {
  const k = ds.keywords
  if (ds.source === 'agents') return 'Allies'
  if (k.includes('Epic Hero')) return 'Epic Heroes'
  if (k.includes('Character')) return 'Characters'
  if (ds.isDedicatedTransport || k.includes('Dedicated Transport')) return 'Dedicated Transports'
  if (k.includes('Battleline')) return 'Battleline'
  if (k.includes('Infantry')) return 'Infantry'
  if (k.includes('Mounted')) return 'Mounted'
  if (k.includes('Vehicle')) return 'Vehicles'
  if (k.includes('Fortification')) return 'Fortifications'
  return 'Other'
}
