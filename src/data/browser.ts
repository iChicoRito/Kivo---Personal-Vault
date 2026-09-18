import type { BootState, SetupInput } from './setup'
import type { Preferences, Profile } from './settings'

export const BROWSER_PREVIEW_STORAGE_KEY = 'kivo.browser-preview.v1'

type BrowserPreviewState = {
  profile: Profile
  preferences: Preferences
  passwordVerifier: string | null
}

type InvokeArgs = Record<string, unknown>

const DEFAULT_PREFERENCES: Preferences = {
  theme: 'dark',
  density: 'comfortable',
  startAtLogin: false,
}

function createDefaultState(): BrowserPreviewState {
  return {
    profile: {
      ownerName: '',
      vaultName: '',
      setupCompletedAt: null,
    },
    preferences: { ...DEFAULT_PREFERENCES },
    passwordVerifier: null,
  }
}

function readState(): BrowserPreviewState {
  try {
    const stored = localStorage.getItem(BROWSER_PREVIEW_STORAGE_KEY)
    if (stored) return { ...createDefaultState(), ...JSON.parse(stored) }
  } catch {
    // Browser preview can continue with in-memory defaults when storage is unavailable.
  }

  return createDefaultState()
}

function writeState(state: BrowserPreviewState) {
  try {
    localStorage.setItem(BROWSER_PREVIEW_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Browser preview remains usable without persistent storage.
  }
}

function hashPreviewPassword(password: string): string {
  let hash = 2166136261

  for (let index = 0; index < password.length; index += 1) {
    hash ^= password.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return `browser-preview:${(hash >>> 0).toString(16)}`
}

function getBootState(state: BrowserPreviewState): BootState {
  if (!state.profile.setupCompletedAt) return 'onboarding'
  return state.passwordVerifier ? 'locked' : 'ready'
}

export async function browserInvoke<T>(command: string, args: InvokeArgs = {}): Promise<T> {
  const state = readState()

  switch (command) {
    case 'initialize_database':
      return undefined as T
    case 'load_boot_state':
      return getBootState(state) as T
    case 'complete_setup': {
      const input = args.input as SetupInput

      if (!input.ownerName.trim()) throw new Error('Owner name is required')

      writeState({
        ...state,
        profile: {
          ownerName: input.ownerName.trim(),
          vaultName: input.vaultName,
          setupCompletedAt: new Date().toISOString(),
        },
        passwordVerifier: input.passwordVerifier,
      })
      return undefined as T
    }
    case 'load_profile':
      return state.profile as T
    case 'save_profile': {
      const profile = args.profile as Pick<Profile, 'ownerName' | 'vaultName'>

      if (!profile.ownerName.trim()) throw new Error('Owner name is required')

      writeState({
        ...state,
        profile: { ...state.profile, ...profile, ownerName: profile.ownerName.trim() },
      })
      return undefined as T
    }
    case 'load_preferences':
      return state.preferences as T
    case 'save_preferences':
      writeState({ ...state, preferences: args.preferences as Preferences })
      return undefined as T
    case 'hash_password':
      return hashPreviewPassword(String(args.password ?? '')) as unknown as T
    case 'verify_password':
      return (hashPreviewPassword(String(args.password ?? '')) === String(args.verifier ?? '')) as unknown as T
    case 'load_password_verifier':
      return state.passwordVerifier as T
    case 'has_password_verifier':
      return Boolean(state.passwordVerifier) as T
    case 'set_password_verifier':
      writeState({ ...state, passwordVerifier: String(args.verifier ?? '') })
      return undefined as T
    case 'remove_password_verifier':
      writeState({ ...state, passwordVerifier: null })
      return undefined as T
    default:
      throw new Error(`Unsupported browser preview command: ${command}`)
  }
}
