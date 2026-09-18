import { beforeEach, describe, expect, it } from 'vitest'

import { browserInvoke, BROWSER_PREVIEW_STORAGE_KEY } from '../data/browser'

describe('browser preview runtime', () => {
  beforeEach(() => {
    localStorage.removeItem(BROWSER_PREVIEW_STORAGE_KEY)
  })

  it('boots onboarding and persists setup state without Tauri', async () => {
    await browserInvoke('initialize_database')

    expect(await browserInvoke('load_boot_state')).toBe('onboarding')

    await browserInvoke('complete_setup', {
      input: {
        ownerName: 'Ada',
        vaultName: "Ada's Vault",
        starterCollections: [],
        passwordVerifier: null,
      },
    })

    expect(await browserInvoke('load_boot_state')).toBe('ready')
    expect(await browserInvoke('load_profile')).toMatchObject({
      ownerName: 'Ada',
      vaultName: "Ada's Vault",
    })
  })

  it('hashes and verifies preview passwords without returning the password', async () => {
    const password = 'preview password'
    const verifier = await browserInvoke<string>('hash_password', { password })

    expect(verifier).not.toContain(password)
    expect(await browserInvoke('verify_password', { password, verifier })).toBe(true)
    expect(await browserInvoke('verify_password', { password: 'wrong', verifier })).toBe(false)
  })
})
