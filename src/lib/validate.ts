export interface Issue {
  kind: 'placeholder-missing' | 'placeholder-extra' | 'html-unbalanced'
  message: string
}

const PLACEHOLDER = /\{\{-?\s*([^}]*?)\s*-?\}\}/g

function placeholders(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((m) => m[1])
}

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
])

const TAG = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g
const HAS_TAG = /<\/?[a-zA-Z][a-zA-Z0-9-]*\b[^>]*>/

/** Returns the first problem found in the tag structure, or null if tags are balanced. */
function htmlProblem(text: string): string | null {
  const stack: string[] = []
  for (const match of text.matchAll(TAG)) {
    const [raw, rawName, selfClosing] = match
    const name = rawName.toLowerCase()
    if (VOID_TAGS.has(name) || selfClosing) continue
    if (raw.startsWith('</')) {
      const open = stack.pop()
      if (open !== name) return open ? `<${open}> is closed by </${name}>` : `</${name}> has no opening tag`
    } else {
      stack.push(name)
    }
  }
  return stack.length > 0 ? `<${stack[stack.length - 1]}> is never closed` : null
}

/** Checks a translation against its source for problems that would break the storefront after import. */
export function validate(source: string, translation: string): Issue[] {
  if (translation.trim() === '') return []
  const issues: Issue[] = []

  const sourceVars = placeholders(source)
  const translationVars = placeholders(translation)
  for (const name of new Set(sourceVars)) {
    if (!translationVars.includes(name)) {
      issues.push({ kind: 'placeholder-missing', message: `Missing placeholder {{ ${name} }}` })
    }
  }
  for (const name of new Set(translationVars)) {
    if (!sourceVars.includes(name)) {
      issues.push({ kind: 'placeholder-extra', message: `Unknown placeholder {{ ${name} }}` })
    }
  }

  // Only check HTML when the source has tags, so plain text containing "<" isn't flagged.
  if (HAS_TAG.test(source)) {
    const problem = htmlProblem(translation)
    if (problem) issues.push({ kind: 'html-unbalanced', message: `Broken HTML: ${problem}` })
  }

  return issues
}
