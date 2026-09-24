import { describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_PASSWORD_OPTIONS,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  generatePassphrase,
  generatePassword,
  type PasswordOptions,
} from '../features/passwords/generate'
import { WORDLIST } from '../features/passwords/wordlist'

const ALL_GROUPS: PasswordOptions = { ...DEFAULT_PASSWORD_OPTIONS }

describe('generatePassword', () => {
  it('generates the requested length', () => {
    for (const length of [8, 12, 16, 24, 40, 64]) {
      expect(generatePassword({ ...ALL_GROUPS, length })).toHaveLength(length)
    }
  })

  it('clamps the length to the 8..64 range', () => {
    expect(generatePassword({ ...ALL_GROUPS, length: 1 })).toHaveLength(MIN_PASSWORD_LENGTH)
    expect(generatePassword({ ...ALL_GROUPS, length: 0 })).toHaveLength(MIN_PASSWORD_LENGTH)
    expect(generatePassword({ ...ALL_GROUPS, length: -20 })).toHaveLength(MIN_PASSWORD_LENGTH)
    expect(generatePassword({ ...ALL_GROUPS, length: 200 })).toHaveLength(MAX_PASSWORD_LENGTH)
  })

  it('uses only the selected character groups', () => {
    const numbersOnly: PasswordOptions = {
      length: 20,
      uppercase: false,
      lowercase: false,
      numbers: true,
      symbols: false,
      excludeSimilar: false,
    }

    for (let run = 0; run < 50; run += 1) {
      expect(generatePassword(numbersOnly)).toMatch(/^[0-9]+$/)
    }

    const lowercaseOnly: PasswordOptions = { ...numbersOnly, numbers: false, lowercase: true }

    for (let run = 0; run < 50; run += 1) {
      expect(generatePassword(lowercaseOnly)).toMatch(/^[a-z]+$/)
    }
  })

  it('leaves symbols out when the symbols option is off', () => {
    const options: PasswordOptions = { ...ALL_GROUPS, length: 32, symbols: false }

    for (let run = 0; run < 50; run += 1) {
      expect(generatePassword(options)).not.toMatch(/[^A-Za-z0-9]/)
    }
  })

  it('falls back to lowercase when no group is selected', () => {
    const options: PasswordOptions = {
      length: 16,
      uppercase: false,
      lowercase: false,
      numbers: false,
      symbols: false,
      excludeSimilar: false,
    }

    for (let run = 0; run < 20; run += 1) {
      expect(generatePassword(options)).toMatch(/^[a-z]+$/)
    }
  })

  it('removes every similar character when excludeSimilar is on', () => {
    const options: PasswordOptions = { ...ALL_GROUPS, length: 64, excludeSimilar: true }

    for (let run = 0; run < 200; run += 1) {
      expect(generatePassword(options)).not.toMatch(/[O0oIl1]/)
    }
  })

  it('takes at least one character from every selected group', () => {
    const options: PasswordOptions = { ...ALL_GROUPS, length: 8, excludeSimilar: true }

    for (let run = 0; run < 300; run += 1) {
      const value = generatePassword(options)

      expect(value).toMatch(/[A-Z]/)
      expect(value).toMatch(/[a-z]/)
      expect(value).toMatch(/[0-9]/)
      expect(value).toMatch(/[^A-Za-z0-9]/)
    }
  })

  it('never calls Math.random', () => {
    const spy = vi.spyOn(Math, 'random')

    generatePassword(ALL_GROUPS)
    generatePassword({ ...ALL_GROUPS, length: 64, excludeSimilar: true })
    generatePassphrase()
    generatePassphrase(8)

    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('does not produce the same value over and over', () => {
    const values = new Set<string>()

    for (let run = 0; run < 100; run += 1) {
      values.add(generatePassword({ ...ALL_GROUPS, length: 20 }))
    }

    expect(values.size).toBeGreaterThan(95)
  })
})

describe('generatePassphrase', () => {
  it('joins five words from the wordlist with dashes', () => {
    const words = generatePassphrase().split('-')

    expect(words).toHaveLength(5)
    for (const word of words) expect(WORDLIST).toContain(word)
  })

  it('honours a custom word count', () => {
    expect(generatePassphrase(8).split('-')).toHaveLength(8)
    expect(generatePassphrase(3).split('-')).toHaveLength(3)
  })
})

describe('WORDLIST', () => {
  it('ships at least 1024 unique lowercase words', () => {
    expect(WORDLIST.length).toBeGreaterThanOrEqual(1024)
    expect(new Set(WORDLIST).size).toBe(WORDLIST.length)
  })

  it('holds only plain 4..9 letter words', () => {
    for (const word of WORDLIST) {
      expect(word).toMatch(/^[a-z]{4,9}$/)
    }
  })
})
