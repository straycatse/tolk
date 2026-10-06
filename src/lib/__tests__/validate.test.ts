import { describe, expect, it } from 'vitest'
import { validate } from '../validate'

const kinds = (source: string, translation: string) => validate(source, translation).map((i) => i.kind)

describe('validate', () => {
  it('accepts a correct translation', () => {
    expect(kinds('{{ count }} items', '{{ count }} varor')).toEqual([])
  })

  it('ignores empty translations', () => {
    expect(kinds('{{ count }} items', '')).toEqual([])
  })

  it('flags missing and unknown placeholders', () => {
    expect(kinds('{{ count }} items', 'varor')).toEqual(['placeholder-missing'])
    expect(kinds('{{ count }} items', '{{ antal }} varor')).toEqual(['placeholder-missing', 'placeholder-extra'])
  })

  it('treats whitespace-trimmed Liquid tags as the same placeholder', () => {
    expect(kinds('{{ count }} items', '{{count}} varor')).toEqual([])
    expect(kinds('{{- count -}} items', '{{ count }} varor')).toEqual([])
  })

  it('flags unbalanced HTML', () => {
    expect(kinds('<p>Hi</p>', '<p>Hej')).toEqual(['html-unbalanced'])
    expect(kinds('<p><strong>Hi</strong></p>', '<p><strong>Hej</p></strong>')).toEqual(['html-unbalanced'])
  })

  it('allows void and self-closing tags', () => {
    expect(kinds('<p>Hi<br>there</p>', '<p>Hej<br/>där<img src="x"></p>')).toEqual([])
  })

  it('does not check HTML when the source is plain text', () => {
    expect(kinds('Size < 10', 'Storlek < 10 <b')).toEqual([])
  })
})
