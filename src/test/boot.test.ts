import { createElement } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StatusScreen from '../app/StatusScreen'
import type { BootState, SetupInput } from '../data/setup'
import { getTauriInvoke } from './setup'

const tauriInvoke = getTauriInvoke()

async function loadDataModules() {
  const database = await import('../data/database')
  const setup = await import('../data/setup')

  return { ...database, ...setup }
}

const setupInput: SetupInput = {
  ownerName: 'Ada',
  vaultName: "Ada's Vault",
  starterCollections: ['Projects'],
  passwordVerifier: null,
}

describe('database boot contract', () => {
  beforeEach(() => {
    vi.resetModules()
    tauriInvoke.mockReset()
  })

  it('initializes through one Rust invoke and reuses the cached promise', async () => {
    const { initializeDatabase } = await loadDataModules()
    tauriInvoke.mockResolvedValue(undefined)

    const first = initializeDatabase()
    const second = initializeDatabase()

    expect(second).toBe(first)
    await expect(first).resolves.toBeUndefined()
    expect(tauriInvoke).toHaveBeenCalledTimes(1)
    expect(tauriInvoke).toHaveBeenCalledWith('initialize_database')
  })

  it('propagates initialization errors and retries with a fresh invoke after rejection', async () => {
    const { initializeDatabase } = await loadDataModules()
    const startupError = new Error('Database initialization failed')
    tauriInvoke.mockRejectedValueOnce(startupError).mockResolvedValueOnce(undefined)

    const first = initializeDatabase()

    await expect(first).rejects.toBe(startupError)
    expect(tauriInvoke).toHaveBeenCalledTimes(1)

    const retry = initializeDatabase()

    expect(retry).not.toBe(first)
    await expect(retry).resolves.toBeUndefined()
    expect(tauriInvoke).toHaveBeenCalledTimes(2)
    expect(tauriInvoke).toHaveBeenNthCalledWith(1, 'initialize_database')
    expect(tauriInvoke).toHaveBeenNthCalledWith(2, 'initialize_database')
  })

  it('classifies a fresh install as onboarding when Rust reports onboarding', async () => {
    const { loadBootState } = await loadDataModules()
    tauriInvoke.mockResolvedValue('onboarding' satisfies BootState)

    const state: BootState = await loadBootState()

    expect(state).toBe('onboarding')
    expect(tauriInvoke).toHaveBeenCalledTimes(1)
    expect(tauriInvoke).toHaveBeenCalledWith('load_boot_state')
  })

  it.each(['ready', 'locked'] as const)('returns %s when Rust reports completed boot state', async (bootState) => {
    const { loadBootState } = await loadDataModules()
    tauriInvoke.mockResolvedValue(bootState)

    const state: BootState = await loadBootState()

    expect(state).toBe(bootState)
    expect(tauriInvoke).toHaveBeenCalledTimes(1)
    expect(tauriInvoke).toHaveBeenCalledWith('load_boot_state')
  })

  it('propagates the Rust boot-state error unchanged', async () => {
    const { loadBootState } = await loadDataModules()
    const bootError = new Error('Unable to read startup state')
    tauriInvoke.mockRejectedValue(bootError)

    await expect(loadBootState()).rejects.toBe(bootError)

    expect(tauriInvoke).toHaveBeenCalledTimes(1)
    expect(tauriInvoke).toHaveBeenCalledWith('load_boot_state')
  })

  it('validates required owner name before invoking Rust setup', async () => {
    const { completeSetup } = await loadDataModules()
    const invalidInput: SetupInput = {
      ...setupInput,
      ownerName: '   ',
    }

    await expect(completeSetup(invalidInput)).rejects.toThrow('Owner name is required')
    expect(tauriInvoke).not.toHaveBeenCalled()
  })

  it('completes setup through one Rust invoke with the exact input payload', async () => {
    const { completeSetup } = await loadDataModules()
    tauriInvoke.mockResolvedValue(undefined)

    await completeSetup(setupInput)

    expect(tauriInvoke).toHaveBeenCalledTimes(1)
    expect(tauriInvoke).toHaveBeenCalledWith('complete_setup', { input: setupInput })
  })

  it('propagates the Rust setup error without a second invoke', async () => {
    const { completeSetup } = await loadDataModules()
    const setupError = new Error('Setup transaction failed')
    tauriInvoke.mockRejectedValue(setupError)

    await expect(completeSetup(setupInput)).rejects.toBe(setupError)
    expect(tauriInvoke).toHaveBeenCalledTimes(1)
    expect(tauriInvoke).toHaveBeenCalledWith('complete_setup', { input: setupInput })
  })
})

describe('StatusScreen diagnostic copy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderErrorScreen() {
    render(
      createElement(StatusScreen, {
        status: 'error',
        error: new Error('SQLite startup failed'),
        onRetry: () => undefined,
      }),
    )
  }

  it('copies the diagnostic text through the clipboard when it is available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })

    renderErrorScreen()
    fireEvent.click(screen.getByRole('button', { name: 'Copy diagnostic' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('SQLite startup failed'))
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('reports copied and selects the diagnostic when the clipboard is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })

    renderErrorScreen()
    fireEvent.click(screen.getByRole('button', { name: 'Copy diagnostic' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument())
    expect(screen.getByLabelText('Diagnostic details')).toHaveFocus()
  })

  it('reports copied and selects the diagnostic when the clipboard write rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('permission denied'))
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })

    renderErrorScreen()
    fireEvent.click(screen.getByRole('button', { name: 'Copy diagnostic' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument())
    expect(writeText).toHaveBeenCalledWith('SQLite startup failed')
    expect(screen.getByLabelText('Diagnostic details')).toHaveFocus()
  })
})
