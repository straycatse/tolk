/** Column names used by Shopify's translation export. Other columns are preserved as-is. */
export const COL = {
  type: 'Type',
  id: 'Identification',
  field: 'Field',
  locale: 'Locale',
  market: 'Market',
  source: 'Default content',
  translation: 'Translated content',
} as const

const REQUIRED = [COL.type, COL.id, COL.field, COL.locale, COL.source, COL.translation]

export interface Row {
  /** Position in the original file, stable across edits. */
  index: number
  type: string
  id: string
  field: string
  locale: string
  market: string
  source: string
  /** Translation as loaded from the file. */
  original: string
  /** Current (possibly edited) translation. */
  translation: string
  /** Every cell exactly as written in the file, quotes included. Unedited cells are written back from here. */
  raw: string[]
}

export interface TranslationDoc {
  header: string[]
  rawHeader: string[]
  rows: Row[]
  /** Formatting detected on load, reused on export so the file round-trips byte for byte. */
  format: {
    bom: boolean
    newline: '\r\n' | '\n'
    quoteAll: boolean
    trailingNewline: boolean
  }
}

export class CsvFormatError extends Error {}

interface Cell {
  value: string
  raw: string
}

/** RFC 4180 parser that keeps the raw text of every cell so unchanged cells can be written back untouched. */
function parseRecords(text: string): Cell[][] {
  const records: Cell[][] = []
  let record: Cell[] = []
  let i = 0
  let line = 1

  while (i <= text.length) {
    const start = i
    let value: string

    if (text[i] === '"') {
      const startLine = line
      i++
      let buf = ''
      for (;;) {
        if (i >= text.length) throw new CsvFormatError(`Unclosed quote in the cell starting on line ${startLine}.`)
        const ch = text[i]
        if (ch === '"') {
          if (text[i + 1] === '"') {
            buf += '"'
            i += 2
            continue
          }
          i++
          break
        }
        if (ch === '\n') line++
        buf += ch
        i++
      }
      if (i < text.length && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
        throw new CsvFormatError(`Unexpected text after a closing quote on line ${line}.`)
      }
      value = buf
    } else {
      while (i < text.length && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') i++
      value = text.slice(start, i)
    }

    record.push({ value, raw: text.slice(start, i) })

    if (text[i] === ',') {
      i++
      continue
    }
    // End of record: newline or end of input.
    if (text[i] === '\r' && text[i + 1] === '\n') i += 2
    else i++
    line++
    const blank = record.length === 1 && record[0].raw === ''
    if (!blank) records.push(record)
    record = []
  }

  return records
}

export function parseTranslationCsv(input: string): TranslationDoc {
  const bom = input.charCodeAt(0) === 0xfeff
  const text = bom ? input.slice(1) : input
  const newline = /\r\n/.test(text) ? '\r\n' : '\n'
  const trailingNewline = text.endsWith('\n')

  const [headerCells, ...records] = parseRecords(text)
  if (!headerCells) throw new CsvFormatError('The file is empty.')

  const header = headerCells.map((c) => c.value)
  const rawHeader = headerCells.map((c) => c.raw)
  const quoteAll = rawHeader.every((raw) => raw.startsWith('"'))

  const missing = REQUIRED.filter((name) => !header.includes(name))
  if (missing.length > 0) {
    throw new CsvFormatError(
      `This does not look like a Shopify translation export. Missing column(s): ${missing.join(', ')}.`,
    )
  }

  const col = (name: string) => header.indexOf(name)
  const at = (cells: Cell[], name: string) => (col(name) === -1 ? '' : (cells[col(name)]?.value ?? ''))

  const rows = records.map((cells, index): Row => {
    const translation = at(cells, COL.translation)
    return {
      index,
      type: at(cells, COL.type),
      id: at(cells, COL.id),
      field: at(cells, COL.field),
      locale: at(cells, COL.locale),
      market: at(cells, COL.market),
      source: at(cells, COL.source),
      original: translation,
      translation,
      raw: cells.map((c) => c.raw),
    }
  })

  return { header, rawHeader, rows, format: { bom, newline, quoteAll, trailingNewline } }
}

function encodeCell(value: string, quoteAll: boolean): string {
  if (quoteAll || /[",\r\n]/.test(value) || value !== value.trim()) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

export interface SerializeOptions {
  /** Only include rows whose translation was edited. */
  changedOnly?: boolean
}

export function serializeTranslationCsv(doc: TranslationDoc, options: SerializeOptions = {}): string {
  const { bom, newline, quoteAll, trailingNewline } = doc.format
  const translationCol = doc.header.indexOf(COL.translation)
  const rows = options.changedOnly ? doc.rows.filter(isChanged) : doc.rows

  const lines = [
    doc.rawHeader.join(','),
    ...rows.map((row) => {
      if (!isChanged(row)) return row.raw.join(',')
      const cells = [...row.raw]
      while (cells.length <= translationCol) cells.push('')
      cells[translationCol] = encodeCell(row.translation, quoteAll)
      return cells.join(',')
    }),
  ]

  return (bom ? '﻿' : '') + lines.join(newline) + (trailingNewline ? newline : '')
}

export function isChanged(row: Row): boolean {
  return row.translation !== row.original
}
