import type { Datasheet, FactionCatalogue } from '../data/schema'
import type { RosterState, RosterTotals, RosterUnit } from '../list/useRoster'

/** Enhancements go on CHARACTERs that aren't Epic Heroes (e.g. not Helbrecht). */
function canTakeEnhancement(ds: Datasheet): boolean {
  return ds.keywords.includes('Character') && !ds.keywords.includes('Epic Hero')
}

/** canLead carries some slugified rule-text fragments from compilation; keep
 *  only ids that resolve to a real datasheet in the catalogue. */
function realCanLead(ds: Datasheet, byId: Map<string, Datasheet>): string[] {
  return (ds.canLead ?? []).filter((id) => byId.has(id))
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
  const datasheetLimit = catalogue.gameSizes[0].datasheetLimit
  // Enhancement pool = union across all selected detachments.
  const enhancementById = new Map(
    totals.detachments.flatMap((d) => d.enhancements.map((e) => [e.id, e] as const)),
  )
  const hasEnhancements = enhancementById.size > 0
  // Each enhancement may only be taken once across the army.
  const usedEnhancementIds = new Set(
    state.units.map((u) => u.enhancementId).filter(Boolean) as string[],
  )
  // Detachments that can still be added within the remaining DP budget.
  const remainingDP = totals.detachmentPointsBudget - totals.detachmentPointsUsed
  const addableDetachments = catalogue.detachments.filter(
    (d) => !state.detachmentIds.includes(d.id) && d.detachmentPoints <= remainingDP,
  )

  const labels = buildInstanceLabels(state.units, byId)
  // bodyguard instanceId -> leader units attached to it.
  const leadersByBodyguard = new Map<string, RosterUnit[]>()
  for (const u of state.units) {
    if (!u.attachedToInstanceId) continue
    const list = leadersByBodyguard.get(u.attachedToInstanceId) ?? []
    list.push(u)
    leadersByBodyguard.set(u.attachedToInstanceId, list)
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
          <select
            value=""
            onChange={(e) => e.target.value && onAddDetachment(e.target.value)}
          >
            <option value="">— add a detachment —</option>
            {addableDetachments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · {d.detachmentPoints} DP · {d.forceDisposition}
              </option>
            ))}
          </select>
        </label>
      )}

      <h3>Units</h3>
      {state.units.length === 0 ? (
        <p className="muted">No units yet — add some from the left.</p>
      ) : (
        <ul className="roster__units">
          {state.units.map((u) => {
            const ds = byId.get(u.datasheetId)
            if (!ds) return null
            const opt = ds.sizeOptions[u.sizeOptionIndex]
            const overCount =
              !ds.isDedicatedTransport &&
              (totals.perDatasheet.get(u.datasheetId) ?? 0) > datasheetLimit
            const enhancement = u.enhancementId ? enhancementById.get(u.enhancementId) : undefined
            const eligible = canTakeEnhancement(ds) && hasEnhancements
            const enhPts = enhancement?.points ?? 0

            const leads = realCanLead(ds, byId)
            const isLeader = leads.length > 0
            const eligibleBodyguards = isLeader
              ? state.units.filter(
                  (v) => v.instanceId !== u.instanceId && leads.includes(v.datasheetId),
                )
              : []
            const attachedLeaders = leadersByBodyguard.get(u.instanceId) ?? []

            const hasOptions = eligible || isLeader || ds.wargearOptions.length > 0
            return (
              <li key={u.instanceId} className="roster__unit">
                <div className="roster__unit-main">
                  <span className="roster__unit-name">
                    {ds.name}
                    {overCount && <span className="warn-inline" title={`Max ${datasheetLimit} allowed`}> ⚠</span>}
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
                    <span className="muted">{opt?.models} model{opt && opt.models > 1 ? 's' : ''}</span>
                  )}
                  {u.attachedToInstanceId && (
                    <span className="roster__attached-note muted">
                      ↳ leading {labels.get(u.attachedToInstanceId) ?? 'unit'}
                    </span>
                  )}
                  {attachedLeaders.length > 0 && (
                    <span className="roster__attached-note muted">
                      led by {attachedLeaders.map((l) => labels.get(l.instanceId)).join(', ')}
                    </span>
                  )}
                </div>
                <span className="roster__unit-pts">{(opt?.points ?? 0) + enhPts}</span>
                <button className="btn btn--ghost" onClick={() => onRemove(u.instanceId)} title="Remove">
                  ✕
                </button>

                {hasOptions && (
                  <div className="roster__unit-options">
                    {isLeader && (
                      <label className="field roster__attach">
                        <span className="muted">Attach to</span>
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
                                const taken =
                                  e.id !== u.enhancementId && usedEnhancementIds.has(e.id)
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
              </li>
            )
          })}
        </ul>
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
