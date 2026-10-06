import { isChanged, type Row } from './csv'
import { rowStatus, type RowStatus } from './status'
import { validate } from './validate'

export type StatusFilter = 'all' | RowStatus | 'changed' | 'issues'

export interface Filters {
  locale: string
  type: string
  status: StatusFilter
  query: string
}

export const ALL = ''

export function matches(row: Row, f: Filters): boolean {
  if (f.locale !== ALL && row.locale !== f.locale) return false
  if (f.type !== ALL && row.type !== f.type) return false
  if (!matchesStatus(row, f.status)) return false
  if (f.query) {
    const q = f.query.toLowerCase()
    const haystack = `${row.field}\n${row.id}\n${row.source}\n${row.translation}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}

function matchesStatus(row: Row, status: StatusFilter): boolean {
  switch (status) {
    case 'all':
      return true
    case 'changed':
      return isChanged(row)
    case 'issues':
      return validate(row.source, row.translation).length > 0
    default:
      return rowStatus(row) === status
  }
}
