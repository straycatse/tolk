import { useEffect, useRef, useState } from 'react'
import type { Row, TranslationDoc } from '../lib/csv'
import { downloadText, exportName } from '../lib/download'
import { copyThemeTranslations, isThemeId, themesInFile } from '../lib/theme'

export function ThemeCopyDialog({
  doc,
  rows,
  fileName,
  onClose,
}: {
  doc: TranslationDoc
  rows: Row[]
  fileName: string
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const themes = themesInFile(rows)
  const [fromId, setFromId] = useState(themes[0]?.id ?? '')
  const [toId, setToId] = useState('')
  const from = themes.find((t) => t.id === fromId)
  const target = toId.trim()
  const invalid = target !== '' && (!isThemeId(target) || target === fromId)

  useEffect(() => ref.current?.showModal(), [])

  const download = () => {
    downloadText(copyThemeTranslations(doc, rows, fromId, target), exportName(fileName, `theme-${target}`))
    ref.current?.close()
  }

  return (
    <dialog ref={ref} className="dialog" aria-labelledby="theme-copy-title" onClose={onClose}>
      <h2 id="theme-copy-title">Copy theme translations to another theme</h2>
      <p className="small muted">
        Theme translations belong to one theme. A new or re-connected theme (for example from GitHub) starts without
        them. This makes an import file that puts this theme&apos;s translations on another theme.
      </p>
      <label className="field">
        <span className="small muted">From theme</span>
        <select value={fromId} onChange={(e) => setFromId(e.target.value)}>
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.id} ({t.translated} of {t.total} translated)
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="small muted">To theme ID</span>
        <input
          inputMode="numeric"
          placeholder="e.g. 208712335692"
          value={toId}
          aria-invalid={invalid}
          onChange={(e) => setToId(e.target.value)}
        />
        <span className="small muted">
          The number in the theme editor URL: admin.shopify.com/store/…/themes/<strong>ID</strong>/editor
        </span>
      </label>
      {invalid && (
        <p className="error small" role="alert">
          {isThemeId(target) ? 'Pick a different theme than the source.' : 'A theme ID is digits only.'}
        </p>
      )}
      <p className="small muted">
        Shopify only applies a translation if the theme&apos;s original text is unchanged. Text that was edited in the
        new theme stays untranslated and needs translating again.
      </p>
      <div className="dialog-actions">
        <button type="button" onClick={() => ref.current?.close()}>
          Cancel
        </button>
        <button
          type="button"
          className="primary"
          disabled={!from || from.translated === 0 || target === '' || invalid}
          onClick={download}
        >
          Download {from?.translated ?? 0} translations
        </button>
      </div>
    </dialog>
  )
}
