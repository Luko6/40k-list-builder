import { useEffect, useState } from 'react'
import { blackTemplars } from './data/black-templars'
import { useRoster } from './list/useRoster'
import {
  deleteSavedList,
  downloadJson,
  fromSavedList,
  getSavedLists,
  readListFile,
  saveCurrent,
  toSavedList,
  upsertSavedList,
} from './list/storage'
import { buildSummaryText } from './list/summary'
import { UnitCatalog } from './components/UnitCatalog'
import { RosterPanel } from './components/RosterPanel'
import { Toolbar } from './components/Toolbar'

function App() {
  const cat = blackTemplars
  const { state, dispatch, totals, byId, size } = useRoster(cat)
  const [savedLists, setSavedLists] = useState(() => getSavedLists())

  // Autosave the working list to localStorage on every change.
  useEffect(() => {
    saveCurrent(toSavedList(state, size.id))
  }, [state, size.id])

  const summaryText = buildSummaryText(cat, size, state, byId)

  const handleSave = () => {
    upsertSavedList(toSavedList(state, size.id))
    setSavedLists(getSavedLists())
  }
  const handleLoad = (id: string) => {
    const sl = savedLists.find((l) => l.id === id)
    if (sl) dispatch({ type: 'load', state: fromSavedList(sl) })
  }
  const handleDelete = (id: string) => {
    deleteSavedList(id)
    setSavedLists(getSavedLists())
  }
  const handleImport = async (file: File) => {
    try {
      const sl = await readListFile(file)
      dispatch({ type: 'load', state: fromSavedList(sl) })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not import that file.')
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Warhammer 40,000 · {cat.edition}</p>
        <h1>Crusade List Builder</h1>
        <p className="subtitle">
          {cat.name} · {size.label}
        </p>
      </header>

      <Toolbar
        name={state.name}
        savedLists={savedLists}
        currentId={state.id}
        onRename={(name) => dispatch({ type: 'rename', name })}
        onNew={() => dispatch({ type: 'new', detachmentId: cat.detachments[0]?.id ?? '' })}
        onSave={handleSave}
        onLoad={handleLoad}
        onDelete={handleDelete}
        onExport={() => downloadJson(toSavedList(state, size.id))}
        onImportFile={handleImport}
        onPrint={() => window.print()}
        onCopy={() => navigator.clipboard?.writeText(summaryText)}
      />

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
          onSetWargear={(instanceId, optionId, choiceIds) =>
            dispatch({ type: 'setWargear', instanceId, optionId, choiceIds })
          }
          onSetEnhancement={(instanceId, enhancementId) =>
            dispatch({ type: 'setEnhancement', instanceId, enhancementId })
          }
        />
      </div>

      {/* Shown only when printing. */}
      <pre className="print-summary">{summaryText}</pre>

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
