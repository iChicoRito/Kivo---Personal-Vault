import type { SetupInput } from '../../data/setup'

export const STARTER_COLLECTIONS = [
  'Personal Documents',
  'Projects',
  'Work',
  'Learning & References',
  'Important Records',
  'Images & Media',
] as const

export const STARTER_COLLECTION_DETAILS: Record<
  (typeof STARTER_COLLECTIONS)[number],
  string
> = {
  'Personal Documents': 'IDs, contracts, and paperwork worth keeping safe',
  Projects: 'Active plans, tasks, and work in progress',
  Work: 'Notes, files, and references for your job',
  'Learning & References': 'Courses, articles, and material you want to study',
  'Important Records': 'Accounts, numbers, and records you rarely change',
  'Images & Media': 'Photos, screenshots, and other visual files',
}

export const ONBOARDING_STEPS = ['welcome', 'profile', 'collections', 'lock', 'complete'] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

export type OnboardingDraft = {
  ownerName: string
  vaultName: string
  starterCollections: string[]
  password: string
  confirmPassword: string
}

export function createOnboardingDraft(): OnboardingDraft {
  return {
    ownerName: '',
    vaultName: '',
    starterCollections: [],
    password: '',
    confirmPassword: '',
  }
}

export function resolveVaultName(draft: Pick<OnboardingDraft, 'ownerName' | 'vaultName'>): string {
  const customName = draft.vaultName.trim()

  if (customName) return customName

  return `${draft.ownerName.trim()}'s Vault`
}

export function validateOwnerName(ownerName: string): string | null {
  if (ownerName.trim()) return null

  return 'Enter the name Kivo should use for you.'
}

export function validateMasterPassword(password: string): string | null {
  return password ? null : 'Enter a master password, or choose Skip for now.'
}

export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string,
): string | null {
  if (password === confirmPassword) return null

  return 'Passwords do not match.'
}

export function toSetupInput(
  draft: OnboardingDraft,
  passwordVerifier: string | null,
): SetupInput {
  return {
    ownerName: draft.ownerName.trim(),
    vaultName: resolveVaultName(draft),
    starterCollections: [...draft.starterCollections],
    passwordVerifier,
  }
}

export function getNextStep(step: OnboardingStep): OnboardingStep | null {
  return ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) + 1] ?? null
}

export function getPreviousStep(step: OnboardingStep): OnboardingStep | null {
  const index = ONBOARDING_STEPS.indexOf(step)

  return index > 0 ? ONBOARDING_STEPS[index - 1] : null
}
