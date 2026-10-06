export function downloadText(text: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  // Revoke after the click has been handled, some browsers cancel the download otherwise.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function exportName(original: string, suffix: string): string {
  const base = original.replace(/\.csv$/i, '')
  return `${base}-${suffix}.csv`
}
