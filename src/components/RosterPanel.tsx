import type { Enhancement, FactionCatalogue } from '../data/schema'
import type { RosterState, RosterTotals, RosterUnit } from '../list/useRoster'
import { CATEGORY_ORDER, unitCategory, type Category } from '../list/categories'
import { unitPoints } from '../list/units'
import type { Selection } from './DetailPanel'

/** Middle pane: the army being built. Rows select into the right detail pane;
 *  per-unit editing (size, wargear, enhancements, attachment) lives there. */
export function RosterPanel({
  catalogue,
  state,
  totals,
  byId,
  selection,
  onAddDetachment,
  onRemoveDetachment,
  onSelectDetachment,
  onRemove,
  onSelectUnit,
}: {
  catalogue: FactionCatalogue
  state: RosterState
  totals: RosterTotals
  byId: Map<string, FactionCatalogue['datasheets'][number]>
  selection: Selection
  onAddDetachment: (id: string) => void
  onRemoveDetachment: (id: string) => void
  onSelectDetachment: (id: string) => void
  onRemove: (instanceId: string) => void
  onSelectUnit: (instanceId: string) => void
}) {
  const datasheetLimit = catalogue.gameSizes[0].datasheetLimit
  const enhancementById = new Map(
    totals.detachments.flatMap((d) => d.enhancements.map((e) => [e.id, e] as const)),
  )
  const enhOf = (u: RosterUnit): Enhancement | undefined =>
    u.enhancementId ? enhancementById.get(u.enhancementId) : undefined

  const remainingDP = totals.detachmentPointsBudget - totals.detachmentPointsUsed
  const addableDetachments = catalogue.detachments.filter(
    (d) => !state.detachmentIds.includes(d.id) && d.detachmentPoints <= remainingDP,
  )
  const dpTiers = [...new Set(addableDetachments.map((d) => d.detachmentPoints))].sort((a, b) => a - b)

  const instanceIds = new Set(state.units.map((u) => u.instanceId))
  const isNestedLeader = (u: RosterUnit) =>
    Boolean(u.attachedToInstanceId && instanceIds.has(u.attachedToInstanceId))
  const leadersByBodyguard = new Map<string, RosterUnit[]>()
  for (const u of state.units) {
    if (!isNestedLeader(u)) continue
    const list = leadersByBodyguard.get(u.attachedToInstanceId!) ?? []
    list.push(u)
    leadersByBodyguard.set(u.attachedToInstanceId!, list)
  }
  const attachedOf = (u: RosterUnit) => leadersByBodyguard.get(u.instanceId) ?? []

  const grouped = new Map<Category, RosterUnit[]>()
  for (const u of state.units) {
    if (isNestedLeader(u)) continue
    const ds = byId.get(u.datasheetId)
    if (!ds) continue
    const cat = unitCategory(ds)
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(u)
  }

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
    const selected = selection?.kind === 'unit' && selection.instanceId === u.instanceId
    const attached = nested ? [] : attachedOf(u)
    return (
      <li key={u.instanceId} className={nested ? 'roster__unit roster__unit--nested' : 'roster__unit'}>
        <div
          className={`roster__row${selected ? ' is-selected' : ''}`}
          onClick={() => onSelectUnit(u.instanceId)}
        >
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
          <span className="muted roster__unit-size">
            {opt?.models} mod{opt && opt.models > 1 ? 's' : ''}
          </span>
          <span className="roster__unit-pts">{unitPoints(ds, u, enhOf(u))}</span>
          <button
            className="btn btn--ghost"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(u.instanceId)
            }}
            title="Remove"
          >
            ✕
          </button>
        </div>
        {attached.length > 0 && (
          <ul className="roster__units roster__nested">{attached.map((l) => renderUnit(l, true))}</ul>
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
          {totals.detachments.map((d) => {
            const selected = selection?.kind === 'detachment' && selection.detachmentId === d.id
            return (
              <li key={d.id} className="roster__detachment">
                <div
                  className={`roster__row${selected ? ' is-selected' : ''}`}
                  onClick={() => onSelectDetachment(d.id)}
                >
                  <span className="roster__detachment-name">{d.name}</span>
                  <span className="tag tag--disposition">{d.forceDisposition}</span>
                  <span className="muted">{d.detachmentPoints} DP</span>
                  <button
                    className="btn btn--ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveDetachment(d.id)
                    }}
                    title="Remove detachment"
                  >
                    ✕
                  </button>
                </div>
              </li>
            )
          })}
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
          <p className="muted">No units yet — click a unit on the left to add it.</p>
        </>
      ) : (
        CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((cat) => {
          const units = grouped.get(cat)!
          const subtotal = units.reduce((n, u) => n + pointsWithLeaders(u), 0)
          const cardCount = units.reduce((n, u) => n + 1 + attachedOf(u).length, 0)
          return (
            <div key={cat} className="roster__group">
              <div className="roster__group-head roster__group-head--static">
                <span className="roster__group-title">{cat}</span>
                <span className="muted">
                  {cardCount} · {subtotal} pts
                </span>
              </div>
              <ul className="roster__units">{units.map((u) => renderUnit(u))}</ul>
            </div>
          )
        })
      )}
    </section>
  )
}
