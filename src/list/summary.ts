import type { Datasheet, FactionCatalogue, GameSize } from '../data/schema'
import type { RosterState } from './useRoster'

function bucket(ds: Datasheet): string {
  if (ds.role || ds.keywords.includes('Character') || ds.keywords.includes('Epic Hero'))
    return 'Characters'
  if (ds.keywords.includes('Battleline')) return 'Battleline'
  if (ds.isDedicatedTransport || ds.keywords.includes('Dedicated Transport'))
    return 'Dedicated Transports'
  return 'Other'
}

const ORDER = ['Characters', 'Battleline', 'Other', 'Dedicated Transports']

/** A clean, copy-paste / printable text roster. */
export function buildSummaryText(
  catalogue: FactionCatalogue,
  size: GameSize,
  state: RosterState,
  byId: Map<string, Datasheet>,
): string {
  const detachments = state.detachmentIds
    .map((id) => catalogue.detachments.find((d) => d.id === id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d))
  const enhancementById = new Map(
    detachments.flatMap((d) => d.enhancements.map((e) => [e.id, e] as const)),
  )
  const groups = new Map<string, string[]>()
  let total = 0

  // Disambiguate duplicate datasheets so "leading X" is unambiguous.
  const dsCounts = new Map<string, number>()
  for (const u of state.units) dsCounts.set(u.datasheetId, (dsCounts.get(u.datasheetId) ?? 0) + 1)
  const seenDs = new Map<string, number>()
  const labelByInstance = new Map<string, string>()
  for (const u of state.units) {
    const name = byId.get(u.datasheetId)?.name ?? u.datasheetId
    if ((dsCounts.get(u.datasheetId) ?? 0) > 1) {
      const n = (seenDs.get(u.datasheetId) ?? 0) + 1
      seenDs.set(u.datasheetId, n)
      labelByInstance.set(u.instanceId, `${name} #${n}`)
    } else {
      labelByInstance.set(u.instanceId, name)
    }
  }

  for (const u of state.units) {
    const ds = byId.get(u.datasheetId)
    if (!ds) continue
    const opt = ds.sizeOptions[u.sizeOptionIndex]
    const allChoices = ds.wargearOptions.flatMap((o) => o.choices)
    const enhancement = u.enhancementId ? enhancementById.get(u.enhancementId) : undefined
    let wargearDelta = 0
    const wargearNames: string[] = []
    for (const choiceIds of Object.values(u.wargearSelections)) {
      for (const choiceId of choiceIds) {
        const choice = allChoices.find((c) => c.id === choiceId)
        if (!choice) continue
        wargearNames.push(choice.name)
        wargearDelta += choice.pointsDelta ?? 0
      }
    }
    const pts = (opt?.points ?? 0) + (enhancement?.points ?? 0) + wargearDelta
    total += pts
    const lines = [
      `  ${ds.name} (${opt?.models ?? 1} model${opt && opt.models > 1 ? 's' : ''}) — ${pts} pts`,
    ]
    if (enhancement) lines.push(`    Enhancement: ${enhancement.name} (+${enhancement.points})`)
    if (u.attachedToInstanceId && labelByInstance.has(u.attachedToInstanceId))
      lines.push(`    Leading: ${labelByInstance.get(u.attachedToInstanceId)}`)
    if (wargearNames.length) lines.push(`    Wargear: ${wargearNames.join(', ')}`)
    const key = bucket(ds)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(lines.join('\n'))
  }

  const out: string[] = []
  out.push(`${catalogue.name} — ${state.name.trim() || 'Untitled list'}`)
  out.push(`${size.label} · ${total} / ${size.pointsLimit} pts · ${state.units.length} units`)
  for (const d of detachments)
    out.push(`Detachment: ${d.name} [${d.forceDisposition}] · ${d.detachmentPoints} DP`)
  for (const key of ORDER) {
    const lines = groups.get(key)
    if (!lines?.length) continue
    out.push('', key.toUpperCase(), ...lines.sort())
  }
  return out.join('\n')
}
