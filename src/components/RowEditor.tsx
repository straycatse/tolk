import { memo, useRef } from 'react'
import { isChanged, type Row } from '../lib/csv'
import { rowStatus, STATUS_LABEL, typeLabel } from '../lib/status'
import { validate } from '../lib/validate'

interface Props {
  row: Row
  onChange: (index: number, translation: string) => void
}

export const RowEditor = memo(function RowEditor({ row, onChange }: Props) {
  const status = rowStatus(row)
  const issues = validate(row.source, row.translation)
  const changed = isChanged(row)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const copySource = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.focus()
    textarea.select()
    // insertText keeps the browser's undo history, so Cmd/Ctrl+Z restores what was there before.
    if (!document.execCommand('insertText', false, row.source)) onChange(row.index, row.source)
    textarea.setSelectionRange(row.source.length, row.source.length)
  }

  return (
    <article className="row" data-status={status}>
      <header className="row-head">
        <span className="row-type">{typeLabel(row.type)}</span>
        <code className="row-field" title={`${row.type} ${row.id}`}>
          {row.field}
        </code>
        <span className="row-locale">{row.locale}{row.market && ` · ${row.market}`}</span>
        <span className="spacer" />
        {changed && <span className="badge badge-changed">Edited</span>}
        <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>
      </header>
      <div className="row-body">
        <div className="source-cell">
          <div className="source" lang="und">
            {row.source || <span className="muted">(empty)</span>}
          </div>
          <button
            type="button"
            className="copy"
            disabled={row.source === '' || row.translation === row.source}
            title="Copy the source text into the translation field to edit it"
            onClick={copySource}
          >
            Copy to translation →
          </button>
        </div>
        <textarea
          ref={textareaRef}
          className="translation"
          value={row.translation}
          lang={row.locale}
          placeholder="Add translation"
          aria-label={`Translation of ${row.field} to ${row.locale}`}
          aria-invalid={issues.length > 0}
          spellCheck
          onChange={(e) => onChange(row.index, e.target.value)}
        />
      </div>
      {(issues.length > 0 || changed) && (
        <footer className="row-foot">
          {issues.map((issue) => (
            <span key={issue.message} className="issue">
              {issue.message}
            </span>
          ))}
          <span className="spacer" />
          {changed && (
            <button type="button" className="link" onClick={() => onChange(row.index, row.original)}>
              Revert
            </button>
          )}
        </footer>
      )}
    </article>
  )
})
