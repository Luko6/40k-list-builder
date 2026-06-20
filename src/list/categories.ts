import type { Datasheet } from '../data/schema'

/** Roster sections, in display order. */
export const CATEGORY_ORDER = [
  'Characters',
  'Battleline',
  'Dedicated Transports',
  'Other',
] as const

export type Category = (typeof CATEGORY_ORDER)[number]

/** Which roster section a datasheet belongs to (keyword/role driven). */
export function unitCategory(ds: Datasheet): Category {
  if (ds.role || ds.keywords.includes('Character') || ds.keywords.includes('Epic Hero'))
    return 'Characters'
  if (ds.keywords.includes('Battleline')) return 'Battleline'
  if (ds.isDedicatedTransport || ds.keywords.includes('Dedicated Transport'))
    return 'Dedicated Transports'
  return 'Other'
}
