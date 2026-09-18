import { invoke } from './runtime'

export type SetupInput = {
  ownerName: string
  vaultName: string
  starterCollections: string[]
  passwordVerifier: string | null
}

export type BootState = 'onboarding' | 'ready' | 'locked'

export async function loadBootState(): Promise<BootState> {
  return invoke<BootState>('load_boot_state')
}

export async function completeSetup(input: SetupInput): Promise<void> {
  if (!input.ownerName.trim()) {
    throw new Error('Owner name is required')
  }

  await invoke<void>('complete_setup', { input })
}
