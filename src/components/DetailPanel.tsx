import type { Datasheet, Detachment, FactionCatalogue } from '../data/schema'
import type { RosterState, RosterTotals, RosterUnit } from '../list/useRoster'
import {
  attachSlot,
  buildInstanceLabels,
  canTakeEnhancementOf,
  realCanLead,
  unitPoints,
} from '../list/units'
import { UnitStats } from './UnitStats'

/** What the right-hand detail pane is currently showing. */
export type Selection =
  | { kind: 'unit'; instanceId: string }
  | { kind: 'preview'; datasheetId: string }
  | { kind: 'detachment'; detachmentId: string }
  | null

export function DetailPanel({
  catalogue,
  state,
  totals,
  byId,
  selection,
  onAdd,
  onSetSize,
  onSetWargear,
  onSetEnhancement,
  onSetAttachment,
}: {
  catalogue: FactionCatalogue
  state: RosterState
  totals: RosterTotals
  byId: Map<string, Datasheet>
  selection: Selection
  onAdd: (datasheetId: string) => void
  onSetSize: (instanceId: string, sizeOptionIndex: number) => void
  onSetWargear: (instanceId: string, optionId: string, choiceIds: string[]) => void
  onSetEnhancement: (instanceId: string, enhancementId?: string) => void
  onSetAttachment: (instanceId: string, attachedToInstanceId?: string) => void
}) {
  let body: React.ReactNode = (
    <p className="muted detail__empty">
      Select a unit or detachment to see its details. Click a unit on the left to add it.
    </p>
  )

  if (selection?.kind === 'preview') {
    const ds = byId.get(selection.datasheetId)
    if (ds) {
      body = (
        <>
          <div className="detail__head">
            <h2>{ds.name}</h2>
            <button className="btn" onClick={() => onAdd(ds.id)}>
              + Add to list
            </button>
          </div>
          <p className="muted">
            from {Math.min(...ds.sizeOptions.map((o) => o.points))} pts
            {ds.role ? ` · ${ds.role}` : ''}
          </p>
          <UnitStats ds={ds} canLeadNames={canLeadNames(ds, byId)} />
        </>
      )
    }
  } else if (selection?.kind === 'detachment') {
    const d = catalogue.detachments.find((x) => x.id === selection.detachmentId)
    if (d) {
      body = (
        <>
          <div className="detail__head">
            <h2>{d.name}</h2>
            <span className="tag tag--disposition">{d.forceDisposition}</span>
          </div>
          <p className="muted">{d.detachmentPoints} DP</p>
          <DetachmentDetail d={d} />
        </>
      )
    }
  } else if (selection?.kind === 'unit') {
    const u = state.units.find((x) => x.instanceId === selection.instanceId)
    const ds = u && byId.get(u.datasheetId)
    if (u && ds) body = <UnitDetail {...{ u, ds, state, totals, byId, onSetSize, onSetWargear, onSetEnhancement, onSetAttachment }} />
  }

  return <aside className="detail panel">{body}</aside>
}

function canLeadNames(ds: Datasheet, byId: Map<string, Datasheet>): string[] {
  return realCanLead(ds, byId).map((id) => byId.get(id)!.name)
}

/** Editable detail for a unit instance in the roster. */
function UnitDetail({
  u,
  ds,
  state,
  totals,
  byId,
  onSetSize,
  onSetWargear,
  onSetEnhancement,
  onSetAttachment,
}: {
  u: RosterUnit
  ds: Datasheet
  state: RosterState
  totals: RosterTotals
  byId: Map<string, Datasheet>
  onSetSize: (instanceId: string, sizeOptionIndex: number) => void
  onSetWargear: (instanceId: string, optionId: string, choiceIds: string[]) => void
  onSetEnhancement: (instanceId: string, enhancementId?: string) => void
  onSetAttachment: (instanceId: string, attachedToInstanceId?: string) => void
}) {
  const enhancementById = new Map(
    totals.detachments.flatMap((d) => d.enhancements.map((e) => [e.id, e] as const)),
  )
  const enhancement = u.enhancementId ? enhancementById.get(u.enhancementId) : undefined
  // Enhancements this unit may take (most need a non-Epic character; some are
  // datasheet-restricted, e.g. Marshal's Household → Sword Brethren Squad).
  const eligible = [...enhancementById.values()].some((e) => canTakeEnhancementOf(ds, e))
  const usedEnhancementIds = new Set(
    state.units.map((v) => v.enhancementId).filter(Boolean) as string[],
  )

  const leads = realCanLead(ds, byId)
  const isAttachable = leads.length > 0
  const mySlot = attachSlot(ds)
  const attachedTo = (bgId: string) => state.units.filter((v) => v.attachedToInstanceId === bgId)
  const eligibleBodyguards = isAttachable
    ? state.units.filter((v) => {
        if (v.instanceId === u.instanceId || !leads.includes(v.datasheetId)) return false
        return !attachedTo(v.instanceId).some(
          (c) => c.instanceId !== u.instanceId && attachSlot(byId.get(c.datasheetId)) === mySlot,
        )
      })
    : []
  const labels = buildInstanceLabels(state.units, byId)

  return (
    <>
      <div className="detail__head">
        <h2>{ds.name}</h2>
        <span className="detail__pts">{unitPoints(ds, u, enhancement)} pts</span>
      </div>

      <div className="detail__controls">
        {ds.sizeOptions.length > 1 && (
          <label className="field">
            <span className="muted">Unit size</span>
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
          </label>
        )}

        {isAttachable && (
          <label className="field">
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
              <span className="muted">No eligible unit in the roster yet.</span>
            )}
          </label>
        )}

        {eligible && (
          <label className="field">
            <span className="muted">Enhancement</span>
            <select
              value={u.enhancementId ?? ''}
              onChange={(e) => onSetEnhancement(u.instanceId, e.target.value)}
            >
              <option value="">— none —</option>
              {totals.detachments.map((d) => {
                const opts = d.enhancements.filter((e) => canTakeEnhancementOf(ds, e))
                if (opts.length === 0) return null
                return (
                  <optgroup key={d.id} label={d.name}>
                    {opts.map((e) => {
                      // Upgrades may be taken on multiple units; others are unique.
                      const taken =
                        !e.isUpgrade && e.id !== u.enhancementId && usedEnhancementIds.has(e.id)
                      return (
                        <option key={e.id} value={e.id} disabled={taken}>
                          {e.name} (+{e.points})
                          {e.isUpgrade ? ' — Upgrade' : taken ? ' — taken' : ''}
                        </option>
                      )
                    })}
                  </optgroup>
                )
              })}
            </select>
          </label>
        )}
      </div>

      {enhancement?.description && (
        <p className="detail__enh-desc">
          <strong>{enhancement.name}.</strong> {enhancement.description}
        </p>
      )}

      <UnitStats ds={ds} canLeadNames={canLeadNames(ds, byId)} />

      {ds.wargearOptions.length > 0 && (
        <WargearOptions unit={u} ds={ds} onSetWargear={onSetWargear} />
      )}
    </>
  )
}

/** Detachment rule + stratagems + enhancements (Wahapedia data, where present). */
function DetachmentDetail({ d }: { d: Detachment }) {
  return (
    <div className="detach-detail">
      {d.rule ? (
        <div className="detach-block">
          <h4>Detachment rule</h4>
          <p className="detach-text">{d.rule}</p>
        </div>
      ) : (
        <p className="muted">
          Rule &amp; stratagems aren’t available from Wahapedia for this detachment yet.
        </p>
      )}

      {d.stratagems && d.stratagems.length > 0 && (
        <div className="detach-block">
          <h4>Stratagems</h4>
          {d.stratagems.map((s, i) => (
            <div key={i} className="strat">
              <div className="strat__head">
                <span className="strat__name">{s.name}</span>
                <span className="strat__cp">{s.cp}</span>
              </div>
              {s.category && <div className="strat__cat muted">{s.category}</div>}
              <p className="detach-text">{s.text}</p>
            </div>
          ))}
        </div>
      )}

      {d.enhancements.length > 0 && (
        <div className="detach-block">
          <h4>Enhancements</h4>
          {d.enhancements.map((e) => (
            <div key={e.id} className="enh">
              <div className="enh__head">
                <span className="enh__name">
                  {e.name}
                  {e.isUpgrade && <span className="muted"> (Upgrade)</span>}
                </span>
                <span className="muted">{e.points} pts</span>
              </div>
              {e.description && <p className="detach-text">{e.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
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
    <div className="wargear-opts">
      <h4>Wargear</h4>
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
    </div>
  )
}
