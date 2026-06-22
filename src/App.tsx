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
import { DetailPanel, type Selection } from './components/DetailPanel'
import { Toolbar } from './components/Toolbar'

function App() {
  const cat = blackTemplars
  const { state, dispatch, totals, byId, size } = useRoster(cat)
  const [savedLists, setSavedLists] = useState(() => getSavedLists())
  const [selection, setSelection] = useState<Selection>(null)

  // Autosave the working list to localStorage on every change.
  useEffect(() => {
    saveCurrent(toSavedList(state, size.id, cat))
  }, [state, size.id, cat])

  const summaryText = buildSummaryText(cat, size, state, byId)

  const handleRemoveUnit = (instanceId: string) => {
    if (selection?.kind === 'unit' && selection.instanceId === instanceId) setSelection(null)
    dispatch({ type: 'removeUnit', instanceId })
  }

  // Drop enhancements that only the removed detachment provided.
  const handleRemoveDetachment = (detachmentId: string) => {
    if (selection?.kind === 'detachment' && selection.detachmentId === detachmentId)
      setSelection(null)
    const remainingEnhancementIds = cat.detachments
      .filter((d) => state.detachmentIds.includes(d.id) && d.id !== detachmentId)
      .flatMap((d) => d.enhancements.map((e) => e.id))
    dispatch({ type: 'removeDetachment', detachmentId, remainingEnhancementIds })
  }

  const loadState = (sl: Parameters<typeof fromSavedList>[0]) => {
    dispatch({ type: 'load', state: fromSavedList(sl) })
    setSelection(null)
  }
  const handleSave = () => {
    upsertSavedList(toSavedList(state, size.id, cat))
    setSavedLists(getSavedLists())
  }
  const handleLoad = (id: string) => {
    const sl = savedLists.find((l) => l.id === id)
    if (sl) loadState(sl)
  }
  const handleDelete = (id: string) => {
    deleteSavedList(id)
    setSavedLists(getSavedLists())
  }
  const handleImport = async (file: File) => {
    try {
      loadState(await readListFile(file))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not import that file.')
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Warhammer 40,000 · {cat.edition}</p>
        <h1>Crusade List Builder</h1>
        <div className="app-header__sub">
          <span className="subtitle">{cat.name}</span>
          <span className="subtitle-sep">·</span>
          <select
            className="gamesize-select"
            value={size.id}
            aria-label="Game size"
            onChange={(e) =>
              dispatch({ type: 'setGameSize', gameSizeId: e.target.value as typeof size.id })
            }
          >
            {cat.gameSizes.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <Toolbar
        name={state.name}
        savedLists={savedLists}
        currentId={state.id}
        onRename={(name) => dispatch({ type: 'rename', name })}
        onNew={() => {
          dispatch({
            type: 'new',
            detachmentId: cat.detachments[0]?.id ?? '',
            gameSizeId: state.gameSizeId,
          })
          setSelection(null)
        }}
        onSave={handleSave}
        onLoad={handleLoad}
        onDelete={handleDelete}
        onExport={() => downloadJson(toSavedList(state, size.id, cat))}
        onImportFile={handleImport}
        onPrint={() => window.print()}
        onCopy={() => navigator.clipboard?.writeText(summaryText)}
      />

      <div className="builder builder--3">
        <UnitCatalog
          datasheets={cat.datasheets}
          perDatasheet={totals.perDatasheet}
          datasheetLimit={size.datasheetLimit}
          selection={selection}
          onAdd={(datasheetId) => dispatch({ type: 'addUnit', datasheetId })}
          onPreview={(datasheetId) => setSelection({ kind: 'preview', datasheetId })}
        />
        <RosterPanel
          catalogue={cat}
          state={state}
          totals={totals}
          byId={byId}
          selection={selection}
          onAddDetachment={(detachmentId) => dispatch({ type: 'addDetachment', detachmentId })}
          onRemoveDetachment={handleRemoveDetachment}
          onSelectDetachment={(detachmentId) => setSelection({ kind: 'detachment', detachmentId })}
          onRemove={handleRemoveUnit}
          onSelectUnit={(instanceId) => setSelection({ kind: 'unit', instanceId })}
        />
        <DetailPanel
          catalogue={cat}
          state={state}
          totals={totals}
          byId={byId}
          selection={selection}
          onAdd={(datasheetId) => dispatch({ type: 'addUnit', datasheetId })}
          onSetSize={(instanceId, sizeOptionIndex) =>
            dispatch({ type: 'setSize', instanceId, sizeOptionIndex })
          }
          onSetWargear={(instanceId, optionId, choiceIds) =>
            dispatch({ type: 'setWargear', instanceId, optionId, choiceIds })
          }
          onSetEnhancement={(instanceId, enhancementId) =>
            dispatch({ type: 'setEnhancement', instanceId, enhancementId })
          }
          onSetAttachment={(instanceId, attachedToInstanceId) =>
            dispatch({ type: 'setAttachment', instanceId, attachedToInstanceId })
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
