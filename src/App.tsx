import { blackTemplars } from './data/black-templars'
import { useRoster } from './list/useRoster'
import { UnitCatalog } from './components/UnitCatalog'
import { RosterPanel } from './components/RosterPanel'

function App() {
  const cat = blackTemplars
  const { state, dispatch, totals, byId, size } = useRoster(cat)

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Warhammer 40,000 · {cat.edition}</p>
          <h1>Crusade List Builder</h1>
          <p className="subtitle">{cat.name} · {size.label}</p>
        </div>
      </header>

      <div className="builder">
        <UnitCatalog
          datasheets={cat.datasheets}
          perDatasheet={totals.perDatasheet}
          datasheetLimit={size.datasheetLimit}
          onAdd={(datasheetId) => dispatch({ type: 'addUnit', datasheetId })}
        />
        <RosterPanel
          catalogue={cat}
          state={state}
          totals={totals}
          byId={byId}
          onSetDetachment={(detachmentId) => dispatch({ type: 'setDetachment', detachmentId })}
          onRemove={(instanceId) => dispatch({ type: 'removeUnit', instanceId })}
          onSetSize={(instanceId, sizeOptionIndex) =>
            dispatch({ type: 'setSize', instanceId, sizeOptionIndex })
          }
        />
      </div>

      <footer className="app-footer">
        <span>
          {cat.datasheets.length} datasheets · Points: {cat.meta.pointsSource} · Stats:{' '}
          {cat.meta.statsSource}
        </span>
      </footer>
    </div>
  )
}

export default App
