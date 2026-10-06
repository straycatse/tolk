import { useState } from 'react'

/** Opens the languages settings of the store the user is currently signed in to. */
const SHOPIFY_LANGUAGES_URL = 'https://admin.shopify.com/settings/languages'

interface Props {
  error: string | null
  onFile: (file: File) => void
  onSample: () => void
}

export function DropZone({ error, onFile, onSample }: Props) {
  const [dragging, setDragging] = useState(false)

  return (
    <main className="landing">
      <h1>
        Tolk <span className="muted">- translation CSV editor for Shopify</span>
      </h1>
      <p className="lead">
        Edit the translation file from{' '}
        <a href={SHOPIFY_LANGUAGES_URL} target="_blank" rel="noopener noreferrer">
          <strong>Settings → Languages → Export</strong>
        </a>{' '}
        without breaking it. Filter by
        resource, find what's missing, catch broken placeholders and HTML, and export only the rows you changed.
      </p>
      <label
        className={`drop${dragging ? ' dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) onFile(file)
        }}
      >
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onFile(file)
            e.target.value = ''
          }}
        />
        <strong>Drop your exported CSV here</strong>
        <span className="muted">or click to choose a file</span>
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p>
        <button type="button" className="link" onClick={onSample}>
          No file at hand? Try it with a sample export.
        </button>
      </p>
      <p className="muted small">
        Your file never leaves your browser. Tolk has no server and stores nothing. Not affiliated with or endorsed by
        Shopify Inc.
      </p>
    </main>
  )
}
