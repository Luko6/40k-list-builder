import type { FactionCatalogue } from '../data/schema'
import type { RosterState, RosterTotals } from '../list/useRoster'

export function RosterPanel({
  catalogue,
  state,
  totals,
  byId,
  onSetDetachment,
  onRemove,
  onSetSize,
}: {
  catalogue: FactionCatalogue
  state: RosterState
  totals: RosterTotals
  byId: Map<string, FactionCatalogue['datasheets'][number]>
  onSetDetachment: (id: string) => void
  onRemove: (instanceId: string) => void
  onSetSize: (instanceId: string, sizeOptionIndex: number) => void
}) {
  const { detachment } = totals
  const datasheetLimit = catalogue.gameSizes[0].datasheetLimit

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
                <span className="roster__unit-pts">{opt?.points ?? 0}</span>
                <button className="btn btn--ghost" onClick={() => onRemove(u.instanceId)} title="Remove">
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
