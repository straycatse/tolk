import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CsvFormatError, parseTranslationCsv, serializeTranslationCsv } from '../csv'

const sample = readFileSync(join(__dirname, '../../../public/sample.csv'), 'utf8')
const HEADER = 'Type,Identification,Field,Locale,Market,Status,Default content,Translated content'

describe('parseTranslationCsv', () => {
  it('reads every row of the sample export', () => {
    const doc = parseTranslationCsv(sample)
    expect(doc.rows).toHaveLength(23)
    expect(doc.rows[0]).toMatchObject({ type: 'PRODUCT', field: 'title', locale: 'sv', translation: 'Mössa i ull' })
  })

  it('handles multi-line cells, escaped quotes and commas', () => {
    const doc = parseTranslationCsv(sample)
    expect(doc.rows[1].source).toContain('\n<ul>')
    expect(doc.rows[2].source).toBe('Canvas Tote Bag, Large')
    expect(doc.rows[14].source).toBe('Free shipping over {{ threshold }} - "limited time"')
  })

  it('rejects files that are not translation exports', () => {
    expect(() => parseTranslationCsv('Handle,Title\nbeanie,Beanie\n')).toThrow(CsvFormatError)
  })

  it('reports unclosed quotes with a line number', () => {
    expect(() => parseTranslationCsv(`${HEADER}\nPRODUCT,1,title,sv,,,"Oops,\n`)).toThrow(/line 2/)
  })

  it('ignores blank lines', () => {
    const doc = parseTranslationCsv(`${HEADER}\n\nPRODUCT,1,title,sv,,,Hat,Hatt\n\n`)
    expect(doc.rows).toHaveLength(1)
  })
})

describe('serializeTranslationCsv', () => {
  it('round-trips the sample byte for byte', () => {
    expect(serializeTranslationCsv(parseTranslationCsv(sample))).toBe(sample)
  })

  it('preserves BOM, CRLF line endings and missing trailing newline', () => {
    const input = `﻿${HEADER}\r\nPRODUCT,1,title,sv,,,Hat,Hatt\r\nPRODUCT,2,title,sv,,,"Cap, red",`
    expect(serializeTranslationCsv(parseTranslationCsv(input))).toBe(input)
  })

  it('only re-encodes edited cells', () => {
    const doc = parseTranslationCsv(`${HEADER}\nPRODUCT,1,title,sv,,,"Hat",\n`)
    doc.rows[0].translation = 'Hatt, "röd"'
    expect(serializeTranslationCsv(doc)).toBe(`${HEADER}\nPRODUCT,1,title,sv,,,"Hat","Hatt, ""röd"""\n`)
  })

  it('quotes edited cells when the file quotes everything', () => {
    const header = HEADER.split(',').map((h) => `"${h}"`).join(',')
    const doc = parseTranslationCsv(`${header}\n"PRODUCT","1","title","sv","","","Hat",""\n`)
    doc.rows[0].translation = 'Hatt'
    expect(serializeTranslationCsv(doc)).toBe(`${header}\n"PRODUCT","1","title","sv","","","Hat","Hatt"\n`)
  })

  it('exports only changed rows when asked', () => {
    const doc = parseTranslationCsv(sample)
    doc.rows[2].translation = 'Tygkasse, stor'
    const out = serializeTranslationCsv(doc, { changedOnly: true })
    expect(out).toBe(`${HEADER}\nPRODUCT,8812345678902,title,sv,,,"Canvas Tote Bag, Large","Tygkasse, stor"\n`)
  })

  it('writes changed rows that a re-parse reads back identically', () => {
    const doc = parseTranslationCsv(sample)
    doc.rows[1].translation = '<p>Varm mössa.</p>\n<ul><li>"En storlek"</li></ul>'
    const reparsed = parseTranslationCsv(serializeTranslationCsv(doc))
    expect(reparsed.rows[1].translation).toBe(doc.rows[1].translation)
    expect(reparsed.rows).toHaveLength(doc.rows.length)
  })
})
