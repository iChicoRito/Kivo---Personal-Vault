import { WORDLIST } from './wordlist'

export type PasswordOptions = {
  length: number
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
  excludeSimilar: boolean
}

export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 64

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeSimilar: false,
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const NUMBERS = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?'
const SIMILAR = 'O0oIl1'
const PASSPHRASE_SEPARATOR = '-'
const DEFAULT_WORD_COUNT = 5

/**
 * A uniform integer in [0, max) drawn from the platform CSPRNG. Rejection
 * sampling avoids the modulo bias a plain `getRandomValues() % max` adds.
 */
function randomInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max
  const buffer = new Uint32Array(1)

  crypto.getRandomValues(buffer)
  while (buffer[0] >= limit) crypto.getRandomValues(buffer)

  return buffer[0] % max
}

function withoutSimilar(characters: string): string {
  return [...characters].filter((character) => !SIMILAR.includes(character)).join('')
}

function clampLength(length: number): number {
  if (!Number.isFinite(length)) return MIN_PASSWORD_LENGTH

  return Math.min(MAX_PASSWORD_LENGTH, Math.max(MIN_PASSWORD_LENGTH, Math.floor(length)))
}

function selectedGroups(options: PasswordOptions): string[] {
  const groups: string[] = []

  if (options.uppercase) groups.push(options.excludeSimilar ? withoutSimilar(UPPERCASE) : UPPERCASE)
  if (options.lowercase) groups.push(options.excludeSimilar ? withoutSimilar(LOWERCASE) : LOWERCASE)
  if (options.numbers) groups.push(options.excludeSimilar ? withoutSimilar(NUMBERS) : NUMBERS)
  if (options.symbols) groups.push(options.excludeSimilar ? withoutSimilar(SYMBOLS) : SYMBOLS)

  return groups
}

export function generatePassword(options: PasswordOptions): string {
  const length = clampLength(options.length)
  const hasGroup = options.uppercase || options.lowercase || options.numbers || options.symbols

  // With nothing selected, fall back to lowercase so a password is always produced.
  const active: PasswordOptions = hasGroup
    ? options
    : { ...options, uppercase: false, lowercase: true, numbers: false, symbols: false }

  const groups = selectedGroups(active)
  const pool = groups.join('')
  const characters: string[] = groups.map((group) => group[randomInt(group.length)])

  while (characters.length < length) characters.push(pool[randomInt(pool.length)])

  // Fisher-Yates with the same CSPRNG, so the required picks keep no fixed spot.
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1)
    const current = characters[index]
    characters[index] = characters[swap]
    characters[swap] = current
  }

  return characters.join('')
}

export function generatePassphrase(wordCount: number = DEFAULT_WORD_COUNT): string {
  const count = Number.isFinite(wordCount) ? Math.max(1, Math.floor(wordCount)) : DEFAULT_WORD_COUNT
  const words: string[] = []

  for (let index = 0; index < count; index += 1) {
    words.push(WORDLIST[randomInt(WORDLIST.length)])
  }

  return words.join(PASSPHRASE_SEPARATOR)
}
