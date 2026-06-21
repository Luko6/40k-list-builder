import { useState } from 'react'
import type { Datasheet, Enhancement, FactionCatalogue } from '../data/schema'
import type { RosterState, RosterTotals, RosterUnit } from '../list/useRoster'
import { CATEGORY_ORDER, unitCategory, type Category } from '../list/categories'
import { UnitStats } from './UnitStats'

/** Enhancements go on CHARACTERs that aren't Epic Heroes (e.g. not Helbrecht). */
function canTakeEnhancement(ds: Datasheet): boolean {
  return ds.keywords.includes('Character') && !ds.keywords.includes('Epic Hero')
}

/** canLead carries some slugified rule-text fragments from compilation; keep
 *  only ids that resolve to a real datasheet in the catalogue. */
function realCanLead(ds: Datasheet, byId: Map<string, Datasheet>): string[] {
  return (ds.canLead ?? []).filter((id) => byId.has(id))
}

/** Which attach slot a character occupies. A bodyguard unit may hold at most
 *  one LEADER and one SUPPORT character at a time. Attachable characters with
 *  no explicit role are treated as leaders. */
function attachSlot(ds?: Datasheet): 'leader' | 'support' {
  return ds?.role === 'support' ? 'support' : 'leader'
}

/** Label each instance, disambiguating duplicates of the same datasheet. */
function buildInstanceLabels(
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

function unitPoints(ds: Datasheet, u: RosterUnit, enhancement?: Enhancement): number {
  return (ds.sizeOptions[u.sizeOptionIndex]?.points ?? 0) + (enhancement?.points ?? 0)
}

export function RosterPanel({
  catalogue,
  state,
  totals,
  byId,
  onAddDetachment,
  onRemoveDetachment,
  onRemove,
  onSetSize,
  onSetWargear,
  onSetEnhancement,
  onSetAttachment,
}: {
  catalogue: FactionCatalogue
  state: RosterState
  totals: RosterTotals
  byId: Map<string, FactionCatalogue['datasheets'][number]>
  onAddDetachment: (id: string) => void
  onRemoveDetachment: (id: string) => void
  onRemove: (instanceId: string) => void
  onSetSize: (instanceId: string, sizeOptionIndex: number) => void
  onSetWargear: (instanceId: string, optionId: string, choiceIds: string[]) => void
  onSetEnhancement: (instanceId: string, enhancementId?: string) => void
  onSetAttachment: (instanceId: string, attachedToInstanceId?: string) => void
}) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())
  const toggleCat = (cat: string) =>
    setCollapsedCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })

  const datasheetLimit = catalogue.gameSizes[0].datasheetLimit
  // Enhancement pool = union across all selected detachments.
  const enhancementById = new Map(
    totals.detachments.flatMap((d) => d.enhancements.map((e) => [e.id, e] as const)),
  )
  const hasEnhancements = enhancementById.size > 0
  const enhOf = (u: RosterUnit) => (u.enhancementId ? enhancementById.get(u.enhancementId) : undefined)
  // Each enhancement may only be taken once across the army.
  const usedEnhancementIds = new Set(
    state.units.map((u) => u.enhancementId).filter(Boolean) as string[],
  )
  // Detachments that can still be added within the remaining DP budget.
  const remainingDP = totals.detachmentPointsBudget - totals.detachmentPointsUsed
  const addableDetachments = catalogue.detachments.filter(
    (d) => !state.detachmentIds.includes(d.id) && d.detachmentPoints <= remainingDP,
  )
  // Distinct DP tiers present, ascending — used to group the add dropdown.
  const dpTiers = [...new Set(addableDetachments.map((d) => d.detachmentPoints))].sort(
    (a, b) => a - b,
  )

  const labels = buildInstanceLabels(state.units, byId)
  const instanceIds = new Set(state.units.map((u) => u.instanceId))
  // A leader nests only when its bodyguard is actually present; otherwise (e.g.
  // a stale id from a hand-edited import) it renders top-level so it can't vanish.
  const isNestedLeader = (u: RosterUnit) =>
    Boolean(u.attachedToInstanceId && instanceIds.has(u.attachedToInstanceId))
  // bodyguard instanceId -> leader units attached to it (rendered nested below it).
  const leadersByBodyguard = new Map<string, RosterUnit[]>()
  for (const u of state.units) {
    if (!isNestedLeader(u)) continue
    const list = leadersByBodyguard.get(u.attachedToInstanceId!) ?? []
    list.push(u)
    leadersByBodyguard.set(u.attachedToInstanceId!, list)
  }

  // Group the units that render at top level; nested leaders appear under their
  // bodyguard's card rather than in their own section.
  const grouped = new Map<Category, RosterUnit[]>()
  for (const u of state.units) {
    if (isNestedLeader(u)) continue
    const ds = byId.get(u.datasheetId)
    if (!ds) continue
    const cat = unitCategory(ds)
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(u)
  }

  // Points / card count for a unit including any leaders nested under it.
  const attachedOf = (u: RosterUnit) => leadersByBodyguard.get(u.instanceId) ?? []
  const pointsWithLeaders = (u: RosterUnit): number => {
    const ds = byId.get(u.datasheetId)
    let p = ds ? unitPoints(ds, u, enhOf(u)) : 0
    for (const l of attachedOf(u)) {
      const lds = byId.get(l.datasheetId)
      if (lds) p += unitPoints(lds, l, enhOf(l))
    }
    return p
  }

  const renderUnit = (u: RosterUnit, nested = false) => {
    const ds = byId.get(u.datasheetId)
    if (!ds) return null
    const opt = ds.sizeOptions[u.sizeOptionIndex]
    const overCount =
      !ds.isDedicatedTransport && (totals.perDatasheet.get(u.datasheetId) ?? 0) > datasheetLimit
    const enhancement = enhOf(u)
    const eligible = canTakeEnhancement(ds) && hasEnhancements

    const leads = realCanLead(ds, byId)
    const isAttachable = leads.length > 0
    const mySlot = attachSlot(ds)
    // A bodyguard is eligible if this character can lead it AND that unit's
    // matching slot (leader/support) isn't already filled by a different one.
    const eligibleBodyguards = isAttachable
      ? state.units.filter((v) => {
          if (v.instanceId === u.instanceId || !leads.includes(v.datasheetId)) return false
          return !attachedOf(v).some(
            (c) => c.instanceId !== u.instanceId && attachSlot(byId.get(c.datasheetId)) === mySlot,
          )
        })
      : []
    const attachedLeaders = nested ? [] : attachedOf(u)
    const isOpen = open.has(u.instanceId)
    const hasOptions = eligible || isAttachable || ds.wargearOptions.length > 0

    return (
      <li
        key={u.instanceId}
        className={nested ? 'roster__unit roster__unit--nested' : 'roster__unit'}
        data-open={isOpen}
      >
        <div className="roster__unit-head">
          <button
            className="roster__expand"
            aria-expanded={isOpen}
            onClick={() => toggle(u.instanceId)}
            title="View stats & options"
          >
            {isOpen ? '▾' : '▸'}
          </button>
          <div className="roster__unit-main">
            <span className="roster__unit-name">
              {nested && <span className="roster__lead-arrow">↳ </span>}
              {ds.name}
              {overCount && (
                <span className="warn-inline" title={`Max ${datasheetLimit} allowed`}>
                  {' '}
                  ⚠
                </span>
              )}
            </span>
            {ds.sizeOptions.length > 1 ? (
              <select
                value={u.sizeOptionIndex}
                onChange={(e) => onSetSize(u.instanceId, Number(e.target.value))}
              >
                {ds.sizeOptions.map((o, i) => (
                  <option key={i} value={i}>
                    {o.models} models — {o.points} pts
                  </option>
                ))}
              </select>
            ) : (
              <span className="muted">
                {opt?.models} model{opt && opt.models > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <span className="roster__unit-pts">{unitPoints(ds, u, enhancement)}</span>
          <button className="btn btn--ghost" onClick={() => onRemove(u.instanceId)} title="Remove">
            ✕
          </button>
        </div>

        {isOpen && (
          <div className="roster__unit-body">
            <UnitStats
              ds={ds}
              canLeadNames={leads.map((id) => byId.get(id)!.name)}
            />
            {hasOptions && (
              <div className="roster__unit-options">
                {isAttachable && (
                  <label className="field roster__attach">
                    <span className="muted">Attach to ({mySlot} slot)</span>
                    {eligibleBodyguards.length > 0 ? (
                      <select
                        value={u.attachedToInstanceId ?? ''}
                        onChange={(e) => onSetAttachment(u.instanceId, e.target.value)}
                      >
                        <option value="">— not attached —</option>
                        {eligibleBodyguards.map((v) => (
                          <option key={v.instanceId} value={v.instanceId}>
                            {labels.get(v.instanceId)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="muted roster__attach-empty">
                        No eligible unit in the roster yet.
                      </span>
                    )}
                  </label>
                )}
                {eligible && (
                  <label className="field roster__enhancement">
                    <span className="muted">Enhancement</span>
                    <select
                      value={u.enhancementId ?? ''}
                      onChange={(e) => onSetEnhancement(u.instanceId, e.target.value)}
                    >
                      <option value="">— none —</option>
                      {totals.detachments.map((d) => (
                        <optgroup key={d.id} label={d.name}>
                          {d.enhancements.map((e) => {
                            const taken = e.id !== u.enhancementId && usedEnhancementIds.has(e.id)
                            return (
                              <option key={e.id} value={e.id} disabled={taken}>
                                {e.name} (+{e.points}){taken ? ' — taken' : ''}
                              </option>
                            )
                          })}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                )}
                {ds.wargearOptions.length > 0 && (
                  <WargearOptions unit={u} ds={ds} onSetWargear={onSetWargear} />
                )}
              </div>
            )}
          </div>
        )}

        {attachedLeaders.length > 0 && (
          <ul className="roster__units roster__nested">
            {attachedLeaders.map((l) => renderUnit(l, true))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <section className="roster panel">
      <div className="roster__totals">
        <div>
          <span className="roster__points" data-over={totals.overLimit}>
            {totals.points}
          </span>
          <span className="muted"> / {totals.pointsLimit} pts</span>
        </div>
        <div className="muted">
          {totals.unitCount} unit{totals.unitCount === 1 ? '' : 's'}
        </div>
      </div>
      {totals.problems.length > 0 && (
        <ul className="roster__problems">
          {totals.problems.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}

      <div className="roster__detach-head">
        <h3>Detachments</h3>
        <span className="muted" data-over={totals.dpOverBudget}>
          {totals.detachmentPointsUsed} / {totals.detachmentPointsBudget} DP
        </span>
      </div>
      {totals.detachments.length === 0 ? (
        <p className="muted">No detachment selected — add one below.</p>
      ) : (
        <ul className="roster__detachments">
          {totals.detachments.map((d) => (
            <li key={d.id} className="roster__detachment">
              <span className="roster__detachment-main">
                <span className="roster__detachment-name">{d.name}</span>
                <span className="tag tag--disposition">{d.forceDisposition}</span>
              </span>
              <span className="muted">{d.detachmentPoints} DP</span>
              <button
                className="btn btn--ghost"
                onClick={() => onRemoveDetachment(d.id)}
                title="Remove detachment"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {addableDetachments.length > 0 && (
        <label className="field">
          <span className="muted">Add detachment</span>
          <select value="" onChange={(e) => e.target.value && onAddDetachment(e.target.value)}>
            <option value="">— add a detachment —</option>
            {dpTiers.flatMap((dp) => [
              <option key={`tier-${dp}`} disabled>
                {`──── ${dp} DP ────`}
              </option>,
              ...addableDetachments
                .filter((d) => d.detachmentPoints === dp)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.forceDisposition}
                  </option>
                )),
            ])}
          </select>
        </label>
      )}

      {state.units.length === 0 ? (
        <>
          <h3>Units</h3>
          <p className="muted">No units yet — add some from the left.</p>
        </>
      ) : (
        CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((cat) => {
          const units = grouped.get(cat)!
          const subtotal = units.reduce((n, u) => n + pointsWithLeaders(u), 0)
          const cardCount = units.reduce((n, u) => n + 1 + attachedOf(u).length, 0)
          const catCollapsed = collapsedCats.has(cat)
          return (
            <div key={cat} className="roster__group">
              <button
                className="roster__group-head"
                aria-expanded={!catCollapsed}
                onClick={() => toggleCat(cat)}
              >
                <span className="roster__group-title">
                  <span className="group-chevron">{catCollapsed ? '▸' : '▾'}</span>
                  {cat}
                </span>
                <span className="muted">
                  {cardCount} · {subtotal} pts
                </span>
              </button>
              {!catCollapsed && (
                <ul className="roster__units">{units.map((u) => renderUnit(u))}</ul>
              )}
            </div>
          )
        })
      )}
    </section>
  )
}

/** Per-unit weapon/loadout choices. Single-pick options render as a dropdown;
 *  multi-pick options as checkboxes capped at the option's max. */
function WargearOptions({
  unit,
  ds,
  onSetWargear,
}: {
  unit: RosterUnit
  ds: Datasheet
  onSetWargear: (instanceId: string, optionId: string, choiceIds: string[]) => void
}) {
  return (
    <details className="wargear-opts">
      <summary className="muted">Wargear ({ds.wargearOptions.length})</summary>
      {ds.wargearOptions.map((option) => {
        const selected = unit.wargearSelections[option.id] ?? []
        const single = option.min === 1 && option.max === 1
        if (single) {
          return (
            <label key={option.id} className="field wargear-opt">
              <span className="muted">{option.description}</span>
              <select
                value={selected[0] ?? ''}
                onChange={(e) =>
                  onSetWargear(unit.instanceId, option.id, e.target.value ? [e.target.value] : [])
                }
              >
                <option value="">— choose —</option>
                {option.choices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.pointsDelta ? ` (${c.pointsDelta > 0 ? '+' : ''}${c.pointsDelta})` : ''}
                  </option>
                ))}
              </select>
            </label>
          )
        }
        const atMax = selected.length >= option.max
        return (
          <fieldset key={option.id} className="wargear-opt wargear-opt--multi">
            <legend className="muted">
              {option.description} <span className="wargear-opt__minmax">(max {option.max})</span>
            </legend>
            {option.choices.map((c) => {
              const checked = selected.includes(c.id)
              return (
                <label key={c.id} className="wargear-check">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && atMax}
                    onChange={() => {
                      const next = checked
                        ? selected.filter((id) => id !== c.id)
                        : [...selected, c.id]
                      onSetWargear(unit.instanceId, option.id, next)
                    }}
                  />
                  <span>
                    {c.name}
                    {c.pointsDelta ? ` (${c.pointsDelta > 0 ? '+' : ''}${c.pointsDelta})` : ''}
                  </span>
                </label>
              )
            })}
          </fieldset>
        )
      })}
    </details>
  )
}
