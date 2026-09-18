import { describe, expect, it } from 'vitest'

import {
  ONBOARDING_STEPS,
  STARTER_COLLECTIONS,
  createOnboardingDraft,
  getNextStep,
  getPreviousStep,
  resolveVaultName,
  toSetupInput,
  validateOwnerName,
  validatePasswordConfirmation,
} from './onboarding'

describe('onboarding draft', () => {
  it('starts empty with no starter collection selected', () => {
    const draft = createOnboardingDraft()

    expect(draft).toEqual({
      ownerName: '',
      vaultName: '',
      starterCollections: [],
      password: '',
      confirmPassword: '',
    })
  })

  it('documents the six starter collections in order', () => {
    expect(STARTER_COLLECTIONS).toEqual([
      'Personal Documents',
      'Projects',
      'Work',
      'Learning & References',
      'Important Records',
      'Images & Media',
    ])
  })

  it('keeps the five onboarding steps in order', () => {
    expect(ONBOARDING_STEPS).toEqual(['welcome', 'profile', 'collections', 'lock', 'complete'])
  })
})

describe('resolveVaultName', () => {
  it('uses a custom vault name when one is given', () => {
    expect(resolveVaultName({ ownerName: 'Ada', vaultName: 'Reading Room' })).toBe('Reading Room')
  })

  it('trims a custom vault name', () => {
    expect(resolveVaultName({ ownerName: 'Ada', vaultName: '  Reading Room  ' })).toBe('Reading Room')
  })

  it('generates the vault name from the trimmed owner name when empty', () => {
    expect(resolveVaultName({ ownerName: '  Ada  ', vaultName: '' })).toBe("Ada's Vault")
  })

  it('generates the vault name when the vault field is only whitespace', () => {
    expect(resolveVaultName({ ownerName: 'Ada', vaultName: '   ' })).toBe("Ada's Vault")
  })
})

describe('validateOwnerName', () => {
  it('rejects an empty or whitespace-only name', () => {
    expect(validateOwnerName('')).not.toBeNull()
    expect(validateOwnerName('   ')).not.toBeNull()
  })

  it('accepts a name that trims to content', () => {
    expect(validateOwnerName('  Ada  ')).toBeNull()
  })
})

describe('validatePasswordConfirmation', () => {
  it('accepts equal passwords', () => {
    expect(validatePasswordConfirmation('hunter two', 'hunter two')).toBeNull()
  })

  it('accepts two empty passwords as the skip path', () => {
    expect(validatePasswordConfirmation('', '')).toBeNull()
  })

  it('rejects a mismatch', () => {
    expect(validatePasswordConfirmation('hunter two', 'hunter three')).not.toBeNull()
  })

  it('rejects a confirmation without a password', () => {
    expect(validatePasswordConfirmation('', 'hunter two')).not.toBeNull()
  })
})

describe('toSetupInput', () => {
  it('trims the owner, resolves the vault name, copies collections, and passes the verifier', () => {
    const draft = {
      ownerName: '  Ada  ',
      vaultName: '  ',
      starterCollections: ['Projects', 'Work'],
      password: 'hunter two',
      confirmPassword: 'hunter two',
    }

    const input = toSetupInput(draft, 'encoded-verifier')

    expect(input).toEqual({
      ownerName: 'Ada',
      vaultName: "Ada's Vault",
      starterCollections: ['Projects', 'Work'],
      passwordVerifier: 'encoded-verifier',
    })
    expect(input.starterCollections).not.toBe(draft.starterCollections)
  })

  it('passes a null verifier when the password is skipped', () => {
    const input = toSetupInput(createOnboardingDraft(), null)

    expect(input.passwordVerifier).toBeNull()
  })
})

describe('step transitions', () => {
  it('walks forward through every step and stops at the end', () => {
    expect(getNextStep('welcome')).toBe('profile')
    expect(getNextStep('profile')).toBe('collections')
    expect(getNextStep('collections')).toBe('lock')
    expect(getNextStep('lock')).toBe('complete')
    expect(getNextStep('complete')).toBeNull()
  })

  it('walks back through every step and stops at the start', () => {
    expect(getPreviousStep('complete')).toBe('lock')
    expect(getPreviousStep('lock')).toBe('collections')
    expect(getPreviousStep('collections')).toBe('profile')
    expect(getPreviousStep('profile')).toBe('welcome')
    expect(getPreviousStep('welcome')).toBeNull()
  })
})
