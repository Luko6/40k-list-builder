import type { Datasheet, FactionCatalogue } from '../data/schema'
import type { RosterState, RosterTotals, RosterUnit } from '../list/useRoster'

/** Enhancements go on CHARACTERs that aren't Epic Heroes (e.g. not Helbrecht). */
function canTakeEnhancement(ds: Datasheet): boolean {
  return ds.keywords.includes('Character') && !ds.keywords.includes('Epic Hero')
}

export function RosterPanel({
  catalogue,
  state,
  totals,
  byId,
  onSetDetachment,
  onRemove,
  onSetSize,
  onSetWargear,
  onSetEnhancement,
}: {
  catalogue: FactionCatalogue
  state: RosterState
  totals: RosterTotals
  byId: Map<string, FactionCatalogue['datasheets'][number]>
  onSetDetachment: (id: string) => void
  onRemove: (instanceId: string) => void
  onSetSize: (instanceId: string, sizeOptionIndex: number) => void
  onSetWargear: (instanceId: string, optionId: string, choiceIds: string[]) => void
  onSetEnhancement: (instanceId: string, enhancementId?: string) => void
}) {
  const { detachment } = totals
  const datasheetLimit = catalogue.gameSizes[0].datasheetLimit
  const enhancements = detachment?.enhancements ?? []
  // Each enhancement may only be taken once across the army.
  const usedEnhancementIds = new Set(
    state.units.map((u) => u.enhancementId).filter(Boolean) as string[],
  )

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
      {totals.overLimit && (
        <p className="warn">Over the {totals.pointsLimit} pts limit by {totals.points - totals.pointsLimit}.</p>
      )}
      {totals.enhancementOverLimit && (
        <p className="warn">
          {totals.enhancementsUsed} enhancements assigned — max {totals.enhancementLimit}.
        </p>
      )}

      <label className="field">
        <span className="muted">Detachment</span>
        <select value={state.detachmentId} onChange={(e) => onSetDetachment(e.target.value)}>
          {catalogue.detachments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} · {d.detachmentPoints} DP
            </option>
          ))}
        </select>
      </label>
      {detachment && (
        <p className="muted roster__disposition">
          Force disposition: <strong>{detachment.forceDisposition}</strong>
        </p>
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
            const overCount = (totals.perDatasheet.get(u.datasheetId) ?? 0) > datasheetLimit
            const enhancement = enhancements.find((e) => e.id === u.enhancementId)
            const eligible = canTakeEnhancement(ds) && enhancements.length > 0
            const enhPts = enhancement?.points ?? 0
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
                </div>
                <span className="roster__unit-pts">{(opt?.points ?? 0) + enhPts}</span>
                <button className="btn btn--ghost" onClick={() => onRemove(u.instanceId)} title="Remove">
                  ✕
                </button>

                {(eligible || ds.wargearOptions.length > 0) && (
                  <div className="roster__unit-options">
                    {eligible && (
                      <label className="field roster__enhancement">
                        <span className="muted">Enhancement</span>
                        <select
                          value={u.enhancementId ?? ''}
                          onChange={(e) => onSetEnhancement(u.instanceId, e.target.value)}
                        >
                          <option value="">— none —</option>
                          {enhancements.map((e) => (
                            <option
                              key={e.id}
                              value={e.id}
                              disabled={e.id !== u.enhancementId && usedEnhancementIds.has(e.id)}
                            >
                              {e.name} (+{e.points})
                              {e.id !== u.enhancementId && usedEnhancementIds.has(e.id)
                                ? ' — taken'
                                : ''}
                            </option>
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
