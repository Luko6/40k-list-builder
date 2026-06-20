import { useMemo, useState } from 'react'
import type { Datasheet } from '../data/schema'
import { CATEGORY_ORDER, unitCategory } from '../list/categories'
import { UnitStats } from './UnitStats'

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
  const [expanded, setExpanded] = useState<string | null>(null)

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? datasheets.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            d.keywords.some((k) => k.toLowerCase().includes(q)),
        )
      : datasheets
    const byCat = new Map<string, Datasheet[]>()
    for (const d of [...list].sort((a, b) => a.name.localeCompare(b.name))) {
      const cat = unitCategory(d)
      if (!byCat.has(cat)) byCat.set(cat, [])
      byCat.get(cat)!.push(d)
    }
    return byCat
  }, [datasheets, query])

  const total = [...groups.values()].reduce((n, g) => n + g.length, 0)

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
      {total === 0 ? (
        <p className="muted">No units match “{query}”.</p>
      ) : (
        CATEGORY_ORDER.filter((cat) => groups.has(cat)).map((cat) => (
          <div key={cat} className="catalog__group">
            <h4 className="catalog__group-head">
              {cat} <span className="muted">({groups.get(cat)!.length})</span>
            </h4>
            <ul className="catalog__list">
              {groups.get(cat)!.map((d) => {
                const count = perDatasheet.get(d.id) ?? 0
                const atLimit = count >= datasheetLimit && !d.isDedicatedTransport
                const isOpen = expanded === d.id
                return (
                  <li key={d.id} className="catalog__row">
                    <div className="catalog__row-main">
                      <button
                        className="catalog__expand"
                        aria-expanded={isOpen}
                        onClick={() => setExpanded(isOpen ? null : d.id)}
                        title="View stats"
                      >
                        {isOpen ? '▾' : '▸'}
                      </button>
                      <div className="catalog__main">
                        <span className="catalog__name">{d.name}</span>
                        <span className="catalog__meta">
                          {d.role && <span className={`tag tag--${d.role}`}>{d.role}</span>}
                          <span className="muted">from {cheapest(d)} pts</span>
                          {count > 0 && <span className="muted">· in list ×{count}</span>}
                        </span>
                      </div>
                      <button
                        className="btn btn--sm"
                        disabled={atLimit}
                        title={atLimit ? `Max ${datasheetLimit} of this datasheet` : 'Add to list'}
                        onClick={() => onAdd(d.id)}
                      >
                        Add
                      </button>
                    </div>
                    {isOpen && (
                      <div className="catalog__stats">
                        <UnitStats ds={d} />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))
      )}
    </section>
  )
}
