import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseTranslationCsv } from '../csv'
import { copyThemeTranslations, isThemeId, themesInFile } from '../theme'

const sample = readFileSync(join(__dirname, '../../../public/sample.csv'), 'utf8')
const HEADER = 'Type,Identification,Field,Locale,Market,Status,Default content,Translated content'

describe('themesInFile', () => {
  it('counts theme rows and translations per theme', () => {
    const doc = parseTranslationCsv(sample)
    expect(themesInFile(doc.rows)).toEqual([{ id: '1612345678901', total: 8, translated: 6 }])
  })

  it('treats apostrophe-prefixed IDs as the same theme', () => {
    const doc = parseTranslationCsv(
      `${HEADER}\nONLINE_STORE_THEME,'111,a,sv,,,A,Å\nONLINE_STORE_THEME,111,b,sv,,,B,\nPRODUCT,'111,title,sv,,,Hat,Hatt\n`,
    )
    expect(themesInFile(doc.rows)).toEqual([{ id: '111', total: 2, translated: 1 }])
  })
})

describe('copyThemeTranslations', () => {
  it('keeps only translated rows of the source theme and rewrites the theme ID', () => {
    const input = [
      HEADER,
      "ONLINE_STORE_THEME,'111,section.product.json.main.title:abc,sv,,,Add to cart,Lägg i varukorg",
      "ONLINE_STORE_THEME,'111,section.product.json.main.note:def,sv,,,Note,",
      "ONLINE_STORE_THEME,'222,section.product.json.main.title:abc,sv,,,Add to cart,Köp",
      "PRODUCT,'111,title,sv,,,Hat,Hatt",
      '',
    ].join('\n')
    const doc = parseTranslationCsv(input)
    expect(copyThemeTranslations(doc, doc.rows, '111', '999')).toBe(
      `${HEADER}\nONLINE_STORE_THEME,'999,section.product.json.main.title:abc,sv,,,Add to cart,Lägg i varukorg\n`,
    )
  })

  it('includes edited translations and keeps quoting', () => {
    const header = HEADER.split(',').map((h) => `"${h}"`).join(',')
    const doc = parseTranslationCsv(`${header}\n"ONLINE_STORE_THEME","111","a","sv","","","Hat",""\n`)
    const rows = [{ ...doc.rows[0], translation: 'Hatt' }]
    expect(copyThemeTranslations(doc, rows, '111', '999')).toBe(
      `${header}\n"ONLINE_STORE_THEME","999","a","sv","","","Hat","Hatt"\n`,
    )
  })
})

describe('isThemeId', () => {
  it('accepts digits only', () => {
    expect(isThemeId('208712335692')).toBe(true)
    expect(isThemeId("'208712335692")).toBe(false)
    expect(isThemeId('')).toBe(false)
  })
})
