import { COL, serializeTranslationCsv, type Row, type TranslationDoc } from './csv'

/** Theme content rows (ONLINE_STORE_THEME and its sub-types) carry the theme ID in the Identification column. */
export function isThemeRow(row: Row): boolean {
  return row.type.startsWith('ONLINE_STORE_THEME')
}

/** Shopify prefixes numeric IDs with an apostrophe so spreadsheets keep them as text. */
export function plainId(id: string): string {
  return id.replace(/^'/, '')
}

export interface ThemeSummary {
  id: string
  total: number
  translated: number
}

/** Themes found in the file, with how many of their rows have a translation. Most rows first. */
export function themesInFile(rows: Row[]): ThemeSummary[] {
  const byId = new Map<string, ThemeSummary>()
  for (const row of rows) {
    if (!isThemeRow(row)) continue
    const id = plainId(row.id)
    const t = byId.get(id) ?? { id, total: 0, translated: 0 }
    t.total++
    if (row.translation.trim() !== '') t.translated++
    byId.set(id, t)
  }
  return [...byId.values()].sort((a, b) => b.total - a.total)
}

export function isThemeId(value: string): boolean {
  return /^\d+$/.test(value)
}

/**
 * Builds an import file that copies one theme's translations to another theme: only translated
 * theme rows of `fromId`, with the Identification cell rewritten to `toId`. Every other cell is
 * written back as it was, edited translations included.
 */
export function copyThemeTranslations(doc: TranslationDoc, rows: Row[], fromId: string, toId: string): string {
  const idCol = doc.header.indexOf(COL.id)
  const copied = rows
    .filter((r) => isThemeRow(r) && plainId(r.id) === fromId && r.translation.trim() !== '')
    .map((r) => {
      const raw = [...r.raw]
      raw[idCol] = raw[idCol].replace(fromId, toId)
      return { ...r, id: r.id.replace(fromId, toId), raw }
    })
  return serializeTranslationCsv({ ...doc, rows: copied })
}
