import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const settingsMock = vi.hoisted(() => ({
  loadProfile: vi.fn(),
  saveProfile: vi.fn(),
  loadPreferences: vi.fn(),
  savePreferences: vi.fn(),
  saveStartAtLogin: vi.fn(),
}))

const autostartMock = vi.hoisted(() => ({
  enable: vi.fn(),
  disable: vi.fn(),
  isEnabled: vi.fn(),
}))

const appMock = vi.hoisted(() => ({
  getName: vi.fn(),
  getVersion: vi.fn(),
}))

const securityMock = vi.hoisted(() => ({
  hasAppLock: vi.fn(),
  readAppLockVerifier: vi.fn(),
  removeAppLock: vi.fn(),
  setAppLock: vi.fn(),
  verifyPassword: vi.fn(),
}))

vi.mock('../data/settings', () => settingsMock)
vi.mock('../data/security', () => securityMock)
vi.mock('@tauri-apps/plugin-autostart', () => autostartMock)
vi.mock('@tauri-apps/api/app', () => appMock)

import SettingsPage from '../features/settings/SettingsPage'
import { PreferencesProvider } from '../app/preferences'
import { setMediaQueryMatches } from './setup'
import type { Preferences } from '../data/settings'

const PROFILE = {
  ownerName: 'Ada',
  vaultName: "Ada's Vault",
  setupCompletedAt: '2026-01-02T03:04:05Z',
}

const PREFERENCES: Preferences = {
  theme: 'light',
  density: 'comfortable',
  startAtLogin: false,
  notesView: 'grid',
  sourcesView: 'grid',
  collectionsView: 'grid',
}

const RESET_PREFERENCES: Preferences = {
  theme: 'dark',
  density: 'comfortable',
  startAtLogin: false,
  notesView: 'grid',
  sourcesView: 'grid',
  collectionsView: 'grid',
}

const NATIVE_SAVE_ERROR = 'Kivo could not change the start at login setting on this device.'
const AUTOSTART_NOT_SAVED =
  'Start at login changed on this device, but Kivo could not save the change.'
const APPEARANCE_SAVE_ERROR = 'Kivo could not save this appearance change. Your saved settings are unchanged.'

async function renderSettings() {
  render(
    <PreferencesProvider initialPreferences={{ ...PREFERENCES }}>
      <SettingsPage />
    </PreferencesProvider>,
  )

  return screen.findByRole('heading', { level: 1, name: 'Settings', exact: true })
}

beforeEach(() => {
  vi.clearAllMocks()
  setMediaQueryMatches('(prefers-color-scheme: dark)', false)
  settingsMock.loadProfile.mockResolvedValue({ ...PROFILE })
  settingsMock.loadPreferences.mockResolvedValue({ ...PREFERENCES })
  settingsMock.saveProfile.mockResolvedValue(undefined)
  settingsMock.savePreferences.mockResolvedValue(undefined)
  settingsMock.saveStartAtLogin.mockResolvedValue(undefined)
  autostartMock.isEnabled.mockResolvedValue(false)
  autostartMock.enable.mockResolvedValue(undefined)
  autostartMock.disable.mockResolvedValue(undefined)
  appMock.getName.mockResolvedValue('Kivo')
  appMock.getVersion.mockResolvedValue('0.1.0')
  securityMock.hasAppLock.mockResolvedValue(false)
  securityMock.readAppLockVerifier.mockResolvedValue(null)
  securityMock.removeAppLock.mockResolvedValue(undefined)
  securityMock.setAppLock.mockResolvedValue(undefined)
  securityMock.verifyPassword.mockResolvedValue(false)
})

afterEach(() => {
  const root = document.documentElement
  delete root.dataset.theme
  delete root.dataset.density
})

describe('settings profile', () => {
  it('shows settings-shaped placeholders while the saved profile loads', async () => {
    let resolveProfile!: (profile: typeof PROFILE) => void
    settingsMock.loadProfile.mockReturnValue(
      new Promise<typeof PROFILE>((resolve) => {
        resolveProfile = resolve
      }),
    )

    await renderSettings()

    const loadingStatus = screen.getByRole('status', { name: 'Loading settings' })
    expect(loadingStatus).toBeInTheDocument()
    for (const title of ['Profile', 'Appearance', 'Start at login', 'Storage', 'App information']) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument()
    }
    expect(loadingStatus.querySelector('.skeleton')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Owner name' })).not.toBeInTheDocument()

    await act(async () => resolveProfile({ ...PROFILE }))

    expect(await screen.findByRole('textbox', { name: 'Owner name' })).toHaveValue('Ada')
  })

  it('shows the saved owner and vault names', async () => {
    await renderSettings()

    expect(screen.getByRole('textbox', { name: 'Owner name' })).toHaveValue('Ada')
    expect(screen.getByRole('textbox', { name: 'Vault name' })).toHaveValue("Ada's Vault")
  })

  it('requires a trimmed owner name and does not save', async () => {
    await renderSettings()

    fireEvent.change(screen.getByRole('textbox', { name: 'Owner name' }), {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByText('Owner name is required.')).toBeInTheDocument()
    expect(settingsMock.saveProfile).not.toHaveBeenCalled()
  })

  it('persists trimmed profile changes through saveProfile', async () => {
    await renderSettings()

    fireEvent.change(screen.getByRole('textbox', { name: 'Owner name' }), {
      target: { value: '  Grace  ' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Vault name' }), {
      target: { value: '  Archive  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    await waitFor(() =>
      expect(settingsMock.saveProfile).toHaveBeenCalledWith({
        ownerName: 'Grace',
        vaultName: 'Archive',
      }),
    )
    expect(await screen.findByText('Profile saved.')).toBeInTheDocument()
  })
})

describe('appearance preferences', () => {
  it('persists the theme choice and applies it to the document root', async () => {
    await renderSettings()

    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }))

    await waitFor(() =>
      expect(settingsMock.savePreferences).toHaveBeenCalledWith(
        expect.objectContaining({ theme: 'dark' }),
      ),
    )
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('persists the density choice and applies it', async () => {
    await renderSettings()

    fireEvent.click(screen.getByRole('radio', { name: 'Compact' }))

    await waitFor(() =>
      expect(settingsMock.savePreferences).toHaveBeenLastCalledWith({
        ...PREFERENCES,
        density: 'compact',
      }),
    )
    expect(document.documentElement.dataset.density).toBe('compact')
  })

  it('rolls the displayed control back to the saved value when saving fails', async () => {
    settingsMock.savePreferences.mockRejectedValue(new Error('save failed'))
    await renderSettings()

    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }))

    expect(await screen.findByText(APPEARANCE_SAVE_ERROR)).toBeInTheDocument()
    expect(settingsMock.savePreferences).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Dark' })).not.toBeChecked()
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('follows operating system theme changes while set to system', async () => {
    await renderSettings()

    fireEvent.click(screen.getByRole('radio', { name: 'System' }))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'))

    await act(async () => setMediaQueryMatches('(prefers-color-scheme: dark)', true))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'))

    await act(async () => setMediaQueryMatches('(prefers-color-scheme: dark)', false))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'))
  })
})

describe('start at login', () => {
  it('reads the native autostart state on load', async () => {
    autostartMock.isEnabled.mockResolvedValue(true)
    await renderSettings()

    expect(autostartMock.isEnabled).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByRole('switch')).toBeChecked())
  })

  it('persists the native state on load when it differs from the saved preference', async () => {
    autostartMock.isEnabled.mockResolvedValue(true)
    await renderSettings()

    await waitFor(() => expect(settingsMock.saveStartAtLogin).toHaveBeenCalledWith(true))
    expect(screen.getByRole('switch')).toBeChecked()
  })

  it('enables autostart and persists the choice', async () => {
    await renderSettings()

    fireEvent.click(screen.getByRole('switch'))

    await waitFor(() => expect(autostartMock.enable).toHaveBeenCalledTimes(1))
    expect(settingsMock.saveStartAtLogin).toHaveBeenCalledWith(true)
    expect(screen.getByRole('switch')).toBeChecked()
  })

  it('disables autostart and persists the choice', async () => {
    autostartMock.isEnabled.mockResolvedValue(true)
    await renderSettings()

    fireEvent.click(screen.getByRole('switch'))

    await waitFor(() => expect(autostartMock.disable).toHaveBeenCalledTimes(1))
    expect(settingsMock.saveStartAtLogin).toHaveBeenLastCalledWith(false)
    expect(screen.getByRole('switch')).not.toBeChecked()
  })

  it('reconciles the switch with the native state when persistence fails after a native change', async () => {
    autostartMock.isEnabled.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    settingsMock.saveStartAtLogin.mockRejectedValueOnce(new Error('save failed'))
    await renderSettings()

    fireEvent.click(screen.getByRole('switch'))

    expect(await screen.findByText(AUTOSTART_NOT_SAVED)).toBeInTheDocument()
    expect(autostartMock.enable).toHaveBeenCalledTimes(1)
    expect(autostartMock.isEnabled).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('switch')).toBeChecked()
  })

  it('shows a native error without changing the switch when enabling fails', async () => {
    autostartMock.enable.mockRejectedValue(new Error('native failure'))
    await renderSettings()

    fireEvent.click(screen.getByRole('switch'))

    expect(await screen.findByText(NATIVE_SAVE_ERROR)).toBeInTheDocument()
    expect(screen.getByRole('switch')).not.toBeChecked()
    expect(settingsMock.saveStartAtLogin).not.toHaveBeenCalled()
  })
})

describe('storage and app information', () => {
  it('shows This Device without a technical path', async () => {
    await renderSettings()

    expect(screen.getByText('This Device')).toBeInTheDocument()
    expect(screen.queryByText(/[A-Za-z]:\\/)).not.toBeInTheDocument()
    expect(screen.queryByText(/users\//i)).not.toBeInTheDocument()
  })

  it('shows the app name and version from Tauri metadata', async () => {
    await renderSettings()

    expect(await screen.findByText('Kivo')).toBeInTheDocument()
    expect(screen.getByText('0.1.0')).toBeInTheDocument()
    expect(appMock.getVersion).toHaveBeenCalledTimes(1)
  })
})

describe('reset presentation preferences', () => {
  it('opens a confirmation dialog that closes on Escape and restores focus', async () => {
    await renderSettings()

    const trigger = screen.getByRole('button', { name: 'Reset preferences' })
    trigger.focus()
    await act(async () => {
      fireEvent.click(trigger)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByRole('heading', { name: 'Reset presentation preferences?' }),
    ).toBeInTheDocument()

    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' })

    await act(async () => {})
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('resets only presentation preferences after confirmation', async () => {
    await renderSettings()

    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'))

    fireEvent.click(screen.getByRole('button', { name: 'Reset preferences' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Yes, reset preferences' }))

    await waitFor(() => expect(settingsMock.savePreferences).toHaveBeenLastCalledWith(RESET_PREFERENCES))
    expect(settingsMock.saveProfile).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})

describe('app lock', () => {
  it('shows a lock-status skeleton only during the initial check, not while saving', async () => {
    let resolveLockCheck!: (enabled: boolean) => void
    securityMock.hasAppLock.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveLockCheck = resolve
      }),
    )
    let resolveSave!: () => void
    securityMock.setAppLock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSave = resolve
      }),
    )

    await renderSettings()

    const heading = await screen.findByRole('heading', { level: 2, name: 'App lock', exact: true })
    const section = heading.closest('section') as HTMLElement
    const loadingStatus = within(section).getByRole('status')
    expect(loadingStatus).toHaveTextContent('Checking app lock...')
    expect(section.querySelector('.skeleton')).toBeInTheDocument()

    await act(async () => resolveLockCheck(false))
    expect(await within(section).findByText('App lock is off.')).toBeInTheDocument()
    expect(section.querySelector('.skeleton')).toBeNull()

    fireEvent.change(screen.getByLabelText('Master Password'), {
      target: { value: 'new password' },
    })
    fireEvent.change(screen.getByLabelText('Confirm Master Password'), {
      target: { value: 'new password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Turn on app lock' }))

    expect(await screen.findByRole('button', { name: 'Saving...' })).toBeInTheDocument()
    expect(section.querySelector('.skeleton')).toBeNull()

    await act(async () => resolveSave())
  })

  it('renders the shared app lock section on the settings page', async () => {
    await renderSettings()
    await screen.findByRole('heading', { level: 2, name: 'App lock', exact: true })

    const headings = screen.getAllByRole('heading', { level: 2, name: 'App lock', exact: true })
    expect(headings).toHaveLength(1)

    const section = headings[0].closest('section')
    expect(section).not.toBeNull()
    expect(await within(section as HTMLElement).findByText('App lock is off.')).toBeInTheDocument()
    expect(securityMock.hasAppLock).toHaveBeenCalledTimes(1)
  })

  it('renders the lock controls once without duplicating them', async () => {
    await renderSettings()
    await screen.findByText('App lock is off.')

    expect(screen.getAllByLabelText('Master Password')).toHaveLength(1)
    expect(screen.getAllByLabelText('Confirm Master Password')).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Turn on app lock' })).toHaveLength(1)
  })
})

describe('settings accessibility', () => {
  it('exposes each choice group with an accessible name', async () => {
    await renderSettings()

    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Density' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Start Kivo when you sign in' })).toBeInTheDocument()
  })

  it('keeps exactly one h1 and does not skip heading levels', async () => {
    await renderSettings()
    await screen.findByText('App lock is off.')

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)

    const levels = screen
      .getAllByRole('heading')
      .map((heading) => Number(heading.tagName.slice(1)))

    for (const [index, level] of levels.entries()) {
      if (index === 0) continue
      expect(level - levels[index - 1]).toBeLessThanOrEqual(1)
    }
  })
})
