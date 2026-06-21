import { useMemo, useState } from 'react'
import type { Datasheet } from '../data/schema'
import { CATEGORY_ORDER, unitCategory } from '../list/categories'
import type { Selection } from './DetailPanel'

function cheapest(unit: Datasheet) {
  return Math.min(...unit.sizeOptions.map((o) => o.points))
}

/** Left pane: searchable, category-grouped catalogue. Clicking a row adds the
 *  unit; the ⓘ button previews its stats in the right pane without adding. */
export function UnitCatalog({
  datasheets,
  perDatasheet,
  datasheetLimit,
  selection,
  onAdd,
  onPreview,
}: {
  datasheets: Datasheet[]
  perDatasheet: Map<string, number>
  datasheetLimit: number
  selection: Selection
  onAdd: (datasheetId: string) => void
  onPreview: (datasheetId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())
  const toggleCat = (cat: string) =>
    setCollapsedCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })

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
        <h2>Units</h2>
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
        CATEGORY_ORDER.filter((cat) => groups.has(cat)).map((cat) => {
          const catCollapsed = collapsedCats.has(cat)
          return (
            <div key={cat} className="catalog__group">
              <button
                className="catalog__group-head"
                aria-expanded={!catCollapsed}
                onClick={() => toggleCat(cat)}
              >
                <span className="group-chevron">{catCollapsed ? '▸' : '▾'}</span>
                {cat} <span className="muted">({groups.get(cat)!.length})</span>
              </button>
              {!catCollapsed && (
                <ul className="catalog__list">
                  {groups.get(cat)!.map((d) => {
                    const count = perDatasheet.get(d.id) ?? 0
                    const atLimit = count >= datasheetLimit && !d.isDedicatedTransport
                    const previewing = selection?.kind === 'preview' && selection.datasheetId === d.id
                    return (
                      <li key={d.id} className="catalog__row">
                        <button
                          className={`catalog__add${atLimit ? ' is-limit' : ''}`}
                          title={atLimit ? `Max ${datasheetLimit} — adding anyway is allowed` : 'Add to list'}
                          onClick={() => onAdd(d.id)}
                        >
                          <span className="catalog__name">{d.name}</span>
                          <span className="catalog__meta">
                            {d.role && <span className={`tag tag--${d.role}`}>{d.role}</span>}
                            <span className="muted">from {cheapest(d)} pts</span>
                            {count > 0 && <span className="muted">· ×{count}</span>}
                          </span>
                        </button>
                        <button
                          className={`catalog__info${previewing ? ' is-active' : ''}`}
                          title="View stats"
                          aria-label={`View ${d.name} stats`}
                          onClick={() => onPreview(d.id)}
                        >
                          ⓘ
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })
      )}
    </section>
  )
}
