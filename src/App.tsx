import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DropZone } from './components/DropZone'
import { RowEditor } from './components/RowEditor'
import {
  CsvFormatError,
  isChanged,
  parseTranslationCsv,
  serializeTranslationCsv,
  type Row,
  type TranslationDoc,
} from './lib/csv'
import { downloadText, exportName } from './lib/download'
import { ALL, matches, type Filters, type StatusFilter } from './lib/filter'
import { rowStatus, typeLabel } from './lib/status'

interface Loaded {
  doc: TranslationDoc
  fileName: string
  /** Increments on every load so the filtered list is rebuilt for a new file. */
  id: number
}

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'missing', label: 'Missing' },
  { value: 'same', label: 'Same as source' },
  { value: 'translated', label: 'Translated' },
  { value: 'issues', label: 'Issues' },
  { value: 'changed', label: 'Edited' },
]

export default function App() {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({ locale: ALL, type: ALL, status: 'all', query: '' })

  const load = useCallback((text: string, fileName: string) => {
    try {
      const doc = parseTranslationCsv(text)
      setLoaded((prev) => ({ doc, fileName, id: (prev?.id ?? 0) + 1 }))
      setRows(doc.rows)
      const locales = [...new Set(doc.rows.map((r) => r.locale))]
      setFilters({ locale: locales.length === 1 ? locales[0] : ALL, type: ALL, status: 'all', query: '' })
      setError(
        text.includes('�')
          ? 'Some characters could not be read. The file may have been saved in a non-UTF-8 encoding (Excel does this). Re-export from Shopify if letters look wrong.'
          : null,
      )
    } catch (e) {
      setError(e instanceof CsvFormatError ? e.message : 'Could not read the file.')
    }
  }, [])

  const onFile = useCallback(async (file: File) => load(await file.text(), file.name), [load])

  const onSample = useCallback(async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}sample.csv`)
    load(await res.text(), 'sample.csv')
  }, [load])

  const onChange = useCallback((index: number, translation: string) => {
    setRows((prev) => {
      const next = prev.slice()
      next[index] = { ...prev[index], translation }
      return next
    })
  }, [])

  const changedCount = useMemo(() => rows.filter(isChanged).length, [rows])

  useEffect(() => {
    if (changedCount === 0) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [changedCount])

  // The visible list is rebuilt when filters change, not on every keystroke, so a row
  // doesn't vanish from "Missing" the moment you start typing in it.
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const visible = useMemo(
    () => rowsRef.current.filter((r) => matches(r, filters)).map((r) => r.index),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, loaded?.id],
  )

  if (!loaded) return <DropZone error={error} onFile={onFile} onSample={onSample} />

  const exportFile = (changedOnly: boolean) => {
    const doc = { ...loaded.doc, rows }
    downloadText(
      serializeTranslationCsv(doc, { changedOnly }),
      exportName(loaded.fileName, changedOnly ? 'changes' : 'tolk'),
    )
  }

  const close = () => {
    if (changedCount > 0 && !window.confirm('Discard your unsaved edits?')) return
    setLoaded(null)
    setRows([])
    setError(null)
  }

  return (
    <div className="app">
      <header className="topbar">
        <strong className="brand">Tolk</strong>
        <span className="file-name" title={loaded.fileName}>
          {loaded.fileName}
        </span>
        <span className="spacer" />
        <span className="muted small">{changedCount} edited</span>
        <button type="button" className="primary" disabled={changedCount === 0} onClick={() => exportFile(true)}>
          Export changes
        </button>
        <button type="button" onClick={() => exportFile(false)}>
          Export full file
        </button>
        <button type="button" className="link" onClick={close}>
          Close
        </button>
      </header>
      {error && (
        <p className="error banner" role="alert">
          {error}
        </p>
      )}
      <div className="workspace">
        <Sidebar rows={rows} filters={filters} setFilters={setFilters} />
        <section className="main">
          <div className="toolbar">
            <input
              type="search"
              placeholder="Search keys, source or translation"
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            />
            <div className="chips" role="radiogroup" aria-label="Status">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={filters.status === s.value}
                  className="chip"
                  onClick={() => setFilters({ ...filters, status: s.value })}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <RowList key={`${loaded.id}:${JSON.stringify(filters)}`} indices={visible} rows={rows} onChange={onChange} />
        </section>
      </div>
    </div>
  )
}

function Sidebar({
  rows,
  filters,
  setFilters,
}: {
  rows: Row[]
  filters: Filters
  setFilters: (f: Filters) => void
}) {
  const locales = useMemo(() => [...new Set(rows.map((r) => r.locale))].sort(), [rows])
  const inLocale = useMemo(
    () => (filters.locale === ALL ? rows : rows.filter((r) => r.locale === filters.locale)),
    [rows, filters.locale],
  )
  const types = useMemo(() => {
    const counts = new Map<string, { total: number; done: number }>()
    for (const r of inLocale) {
      const c = counts.get(r.type) ?? { total: 0, done: 0 }
      c.total++
      if (rowStatus(r) === 'translated') c.done++
      counts.set(r.type, c)
    }
    return [...counts].sort((a, b) => typeLabel(a[0]).localeCompare(typeLabel(b[0])))
  }, [inLocale])
  const done = inLocale.filter((r) => rowStatus(r) === 'translated').length
  const pct = inLocale.length ? Math.round((done / inLocale.length) * 100) : 0

  return (
    <nav className="sidebar" aria-label="Filters">
      <label className="field">
        <span className="small muted">Language</span>
        <select value={filters.locale} onChange={(e) => setFilters({ ...filters, locale: e.target.value })}>
          <option value={ALL}>All languages</option>
          {locales.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <div className="progress" aria-label={`${pct}% translated`}>
        <div className="progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <p className="small muted">
        {done} of {inLocale.length} translated ({pct}%)
      </p>
      <ul className="types">
        <li>
          <button
            type="button"
            aria-current={filters.type === ALL}
            onClick={() => setFilters({ ...filters, type: ALL })}
          >
            <span>Everything</span>
            <span className="count">{inLocale.length}</span>
          </button>
        </li>
        {types.map(([type, c]) => (
          <li key={type}>
            <button
              type="button"
              aria-current={filters.type === type}
              title={type}
              onClick={() => setFilters({ ...filters, type })}
            >
              <span>{typeLabel(type)}</span>
              <span className="count">
                {c.done}/{c.total}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function RowList({
  indices,
  rows,
  onChange,
}: {
  indices: number[]
  rows: Row[]
  onChange: (index: number, translation: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: indices.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 150,
    overscan: 6,
  })

  if (indices.length === 0) {
    return <p className="empty muted">No rows match these filters.</p>
  }

  return (
    <div ref={scrollRef} className="list">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            ref={virtualizer.measureElement}
            data-index={item.index}
            className="list-item"
            style={{ transform: `translateY(${item.start}px)` }}
          >
            <RowEditor row={rows[indices[item.index]]} onChange={onChange} />
          </div>
        ))}
      </div>
    </div>
  )
}
