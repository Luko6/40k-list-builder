import type { Datasheet, WeaponProfile } from '../data/schema'

const isMelee = (w: WeaponProfile) => /melee/i.test(w.range)

function WeaponTable({ title, weapons }: { title: string; weapons: WeaponProfile[] }) {
  if (!weapons.length) return null
  const ranged = title === 'Ranged weapons'
  return (
    <div className="ustats__weapons">
      <table className="ustats__table">
        <thead>
          <tr>
            <th className="ustats__wname">{title}</th>
            <th>{ranged ? 'Range' : 'Rng'}</th>
            <th>A</th>
            <th>{ranged ? 'BS' : 'WS'}</th>
            <th>S</th>
            <th>AP</th>
            <th>D</th>
          </tr>
        </thead>
        <tbody>
          {weapons.map((w) => (
            <tr key={w.id}>
              <td className="ustats__wname">
                {w.name}
                {w.abilities?.length ? (
                  <span className="ustats__wabilities"> [{w.abilities.join(', ')}]</span>
                ) : null}
              </td>
              <td>{ranged ? w.range : '—'}</td>
              <td>{w.attacks}</td>
              <td>{w.skill}</td>
              <td>{w.strength}</td>
              <td>{w.armourPenetration}</td>
              <td>{w.damage}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Combat profile for a datasheet: statline(s) + ranged/melee weapons + keywords. */
export function UnitStats({ ds }: { ds: Datasheet }) {
  const ranged = ds.weapons.filter((w) => !isMelee(w))
  const melee = ds.weapons.filter(isMelee)
  const multi = ds.statlines.length > 1
  return (
    <div className="ustats">
      <table className="ustats__table ustats__statline">
        <thead>
          <tr>
            {multi && <th className="ustats__pname">Profile</th>}
            <th>M</th>
            <th>T</th>
            <th>Sv</th>
            <th>W</th>
            <th>Ld</th>
            <th>OC</th>
          </tr>
        </thead>
        <tbody>
          {ds.statlines.map((s, i) => (
            <tr key={i}>
              {multi && <td className="ustats__pname">{s.name}</td>}
              <td>{s.movement}</td>
              <td>{s.toughness}</td>
              <td>
                {s.save}
                {s.invulnerableSave ? <span className="ustats__inv"> ({s.invulnerableSave}++)</span> : null}
              </td>
              <td>{s.wounds}</td>
              <td>{s.leadership}</td>
              <td>{s.objectiveControl}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <WeaponTable title="Ranged weapons" weapons={ranged} />
      <WeaponTable title="Melee weapons" weapons={melee} />

      {ds.keywords.length > 0 && (
        <p className="ustats__keywords">
          <span className="muted">Keywords:</span> {ds.keywords.join(', ')}
        </p>
      )}
    </div>
  )
}
