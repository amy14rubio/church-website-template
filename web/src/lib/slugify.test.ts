import { describe, expect, it } from 'vitest'
import { slugify } from './slugify'

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('Ministerio de Ayuda')).toBe('ministerio-de-ayuda')
  })

  it('strips accents', () => {
    expect(slugify('Jóvenes')).toBe('jovenes')
    expect(slugify('Niños')).toBe('ninos')
  })

  it('strips punctuation', () => {
    expect(slugify('Alabanza & Adoración!')).toBe('alabanza-adoracion')
  })

  it('trims stray leading/trailing hyphens', () => {
    expect(slugify('  Evangelismo  ')).toBe('evangelismo')
  })
})
