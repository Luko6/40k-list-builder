import { blackTemplars } from './data/black-templars'
import type { Datasheet } from './data/schema'

function pointsSummary(unit: Datasheet) {
  return unit.sizeOptions
    .map((o) => `${o.models} model${o.models > 1 ? 's' : ''} · ${o.points} pts`)
    .join('  |  ')
}

function UnitCard({ unit }: { unit: Datasheet }) {
  const primary = unit.statlines[0]
  return (
    <article className="unit-card">
      <div className="unit-card__head">
        <h3>{unit.name}</h3>
        {unit.role && <span className={`tag tag--${unit.role}`}>{unit.role}</span>}
      </div>
      <p className="unit-card__points">{pointsSummary(unit)}</p>

      <table className="statline">
        <thead>
          <tr>
            <th>M</th>
            <th>T</th>
            <th>Sv</th>
            <th>W</th>
            <th>Ld</th>
            <th>OC</th>
            {primary.invulnerableSave && <th>Inv</th>}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{primary.movement}</td>
            <td>{primary.toughness}</td>
            <td>{primary.save}</td>
            <td>{primary.wounds}</td>
            <td>{primary.leadership}</td>
            <td>{primary.objectiveControl}</td>
            {primary.invulnerableSave && <td>{primary.invulnerableSave}</td>}
          </tr>
        </tbody>
      </table>

      {unit.wargearOptions.length > 0 && (
        <ul className="wargear">
          {unit.wargearOptions.map((opt) => (
            <li key={opt.id}>{opt.description}</li>
          ))}
        </ul>
      )}
    </article>
  )
}

function App() {
  const cat = blackTemplars
  const detachment = cat.detachments[0]
  const size = cat.gameSizes[0]

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Warhammer 40,000 · {cat.edition}</p>
        <h1>Crusade List Builder</h1>
        <p className="subtitle">{cat.name}</p>
      </header>

      <section className="panel">
        <h2>{size.label}</h2>
        <p className="muted">
          {size.detachmentPoints} DP · {size.enhancementLimit} enhancements ·
          max {size.datasheetLimit} of each datasheet
        </p>
      </section>

      <section className="panel">
        <div className="unit-card__head">
          <h2>{detachment.name}</h2>
          <span className="tag">{detachment.detachmentPoints} DP</span>
          <span className="tag tag--disposition">{detachment.forceDisposition}</span>
        </div>
        <h4>Enhancements</h4>
        <ul className="enhancements">
          {detachment.enhancements.map((e) => (
            <li key={e.id}>
              <span>{e.name}</span>
              <span className="muted">{e.points} pts</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Datasheets ({cat.datasheets.length})</h2>
        <div className="unit-grid">
          {cat.datasheets.map((u) => (
            <UnitCard key={u.id} unit={u} />
          ))}
        </div>
      </section>

      <footer className="app-footer">
        <span>
          Points: {cat.meta.pointsSource} · Stats: {cat.meta.statsSource}
        </span>
      </footer>
    </main>
  )
}

export default App
