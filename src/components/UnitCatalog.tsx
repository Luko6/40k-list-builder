import { useMemo, useState } from 'react'
import type { Datasheet } from '../data/schema'

function cheapest(unit: Datasheet) {
  return Math.min(...unit.sizeOptions.map((o) => o.points))
}

export function UnitCatalog({
  datasheets,
  perDatasheet,
  datasheetLimit,
  onAdd,
}: {
  datasheets: Datasheet[]
  perDatasheet: Map<string, number>
  datasheetLimit: number
  onAdd: (datasheetId: string) => void
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? datasheets.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            d.keywords.some((k) => k.toLowerCase().includes(q)),
        )
      : datasheets
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [datasheets, query])

  return (
    <section className="catalog panel">
      <div className="catalog__head">
        <h2>Add units</h2>
        <input
          className="search"
          type="search"
          placeholder="Search name or keyword…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <ul className="catalog__list">
        {filtered.map((d) => {
          const count = perDatasheet.get(d.id) ?? 0
          const atLimit = count >= datasheetLimit
          return (
            <li key={d.id} className="catalog__row">
              <div className="catalog__main">
                <span className="catalog__name">{d.name}</span>
                <span className="catalog__meta">
                  {d.role && <span className={`tag tag--${d.role}`}>{d.role}</span>}
                  <span className="muted">from {cheapest(d)} pts</span>
                  {count > 0 && <span className="muted">· in list ×{count}</span>}
                </span>
              </div>
              <button
                className="btn"
                disabled={atLimit}
                title={atLimit ? `Max ${datasheetLimit} of this datasheet` : 'Add to list'}
                onClick={() => onAdd(d.id)}
              >
                Add
              </button>
            </li>
          )
        })}
        {filtered.length === 0 && <li className="muted">No units match “{query}”.</li>}
      </ul>
    </section>
  )
}
