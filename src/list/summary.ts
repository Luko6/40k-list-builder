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
  const detachment = catalogue.detachments.find((d) => d.id === state.detachmentId)
  const groups = new Map<string, string[]>()
  let total = 0

  for (const u of state.units) {
    const ds = byId.get(u.datasheetId)
    if (!ds) continue
    const opt = ds.sizeOptions[u.sizeOptionIndex]
    const allChoices = ds.wargearOptions.flatMap((o) => o.choices)
    const enhancement = detachment?.enhancements.find((e) => e.id === u.enhancementId)
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
    if (wargearNames.length) lines.push(`    Wargear: ${wargearNames.join(', ')}`)
    const key = bucket(ds)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(lines.join('\n'))
  }

  const out: string[] = []
  out.push(`${catalogue.name} — ${state.name.trim() || 'Untitled list'}`)
  if (detachment) out.push(`${size.label} · ${detachment.name} [${detachment.forceDisposition}]`)
  out.push(`${total} / ${size.pointsLimit} pts · ${state.units.length} units`)
  for (const key of ORDER) {
    const lines = groups.get(key)
    if (!lines?.length) continue
    out.push('', key.toUpperCase(), ...lines.sort())
  }
  return out.join('\n')
}
