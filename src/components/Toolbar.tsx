import { useRef, useState } from 'react'
import type { SavedList } from '../data/schema'

export function Toolbar({
  name,
  savedLists,
  currentId,
  onRename,
  onNew,
  onSave,
  onLoad,
  onDelete,
  onExport,
  onImportFile,
  onPrint,
  onCopy,
}: {
  name: string
  savedLists: SavedList[]
  currentId: string
  onRename: (name: string) => void
  onNew: () => void
  onSave: () => void
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  onExport: () => void
  onImportFile: (file: File) => void
  onPrint: () => void
  onCopy: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="toolbar panel">
      <input
        className="toolbar__name"
        value={name}
        placeholder="List name"
        aria-label="List name"
        onChange={(e) => onRename(e.target.value)}
      />
      <div className="toolbar__actions">
        <button className="btn btn--sm" onClick={onSave} title="Save to this browser">
          Save
        </button>
        <button className="btn btn--sm btn--ghost" onClick={onNew}>
          New
        </button>
        {savedLists.length > 0 && (
          <select
            className="toolbar__select"
            value={savedLists.some((l) => l.id === currentId) ? currentId : ''}
            onChange={(e) => e.target.value && onLoad(e.target.value)}
          >
            <option value="">Load saved…</option>
            {savedLists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        )}
        {savedLists.some((l) => l.id === currentId) && (
          <button className="btn btn--sm btn--ghost" onClick={() => onDelete(currentId)}>
            Delete
          </button>
        )}
        <span className="toolbar__spacer" />
        <button className="btn btn--sm btn--ghost" onClick={onExport}>
          Export
        </button>
        <button className="btn btn--sm btn--ghost" onClick={() => fileRef.current?.click()}>
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onImportFile(f)
            e.target.value = ''
          }}
        />
        <button className="btn btn--sm btn--ghost" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy text'}
        </button>
        <button className="btn btn--sm btn--ghost" onClick={onPrint}>
          Print
        </button>
      </div>
    </div>
  )
}
