import { useEffect, useRef, useState } from 'react'
import {
  Button,
  Card,
  FieldError,
  Input,
  Label,
  Modal,
  Radio,
  RadioGroup,
  Switch,
  TextField,
  Typography,
  useOverlayState,
} from '@heroui/react'
import { getName, getVersion } from '@tauri-apps/api/app'
import {
  disable as disableAutostart,
  enable as enableAutostart,
  isEnabled as isAutostartEnabled,
} from '@tauri-apps/plugin-autostart'

import {
  loadProfile,
  saveProfile,
  saveStartAtLogin,
  type Density,
  type Preferences,
  type Theme,
} from '../../data/settings'
import { usePreferences } from '../../app/preferences'
import PageHeader from '../../app/PageHeader'
import AppLockSettings from '../security/AppLockSettings'

type LoadState = 'loading' | 'ready' | 'error'

const stateLabelClass = 'uppercase'

type Choice<Value extends string> = { value: Value; label: string }

const THEME_OPTIONS: Choice<Theme>[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

const DENSITY_OPTIONS: Choice<Density>[] = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
]

const RESET_PREFERENCES: Preferences = {
  theme: 'dark',
  density: 'comfortable',
  startAtLogin: false,
}

const OWNER_REQUIRED_ERROR = 'Owner name is required.'
const PROFILE_SAVED_MESSAGE = 'Profile saved.'
const PROFILE_SAVE_ERROR = 'Kivo could not save your profile. Your changes are still here. Try again.'
const APPEARANCE_SAVE_ERROR =
  'Kivo could not save this appearance change. Your saved settings are unchanged.'
const NATIVE_SAVE_ERROR = 'Kivo could not change the start at login setting on this device.'
const AUTOSTART_NOT_SAVED =
  'Start at login changed on this device, but Kivo could not save the change.'
const RESET_SAVE_ERROR = 'Kivo could not reset your preferences. Your saved settings are unchanged.'

export default function SettingsPage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [attempt, setAttempt] = useState(0)

  const [ownerName, setOwnerName] = useState('')
  const [vaultName, setVaultName] = useState('')
  const [ownerError, setOwnerError] = useState<string | null>(null)
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)

  const { preferences, updatePreferences } = usePreferences()
  const [appearanceError, setAppearanceError] = useState<string | null>(null)
  const [startAtLogin, setStartAtLogin] = useState(preferences.startAtLogin)
  const [startAtLoginBusy, setStartAtLoginBusy] = useState(false)
  const [startAtLoginError, setStartAtLoginError] = useState<string | null>(null)

  const [appName, setAppName] = useState<string | null>(null)
  const [appVersion, setAppVersion] = useState<string | null>(null)

  const storedStartAtLogin = useRef(preferences.startAtLogin)
  const resetTriggerRef = useRef<HTMLButtonElement>(null)
  const resetDialog = useOverlayState()
  const resetWasOpen = useRef(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoadState('loading')

    void (async () => {
      try {
        const loadedProfile = await loadProfile()

        if (!loadedProfile) {
          throw new Error('Settings are unavailable')
        }

        if (!active) return

        setOwnerName(loadedProfile.ownerName)
        setVaultName(loadedProfile.vaultName)
        setLoadState('ready')

        let nativeStartAtLogin: boolean | undefined

        try {
          const native = await isAutostartEnabled()
          if (typeof native === 'boolean') nativeStartAtLogin = native
        } catch {
          // Keep the saved preference when the native check is unavailable.
        }

        if (!active || nativeStartAtLogin === undefined) return

        setStartAtLogin(nativeStartAtLogin)

        if (nativeStartAtLogin !== storedStartAtLogin.current) {
          try {
            await saveStartAtLogin(nativeStartAtLogin)
          } catch {
            if (active) setStartAtLoginError(AUTOSTART_NOT_SAVED)
          }
        }
      } catch {
        if (active) setLoadState('error')
      }
    })()

    return () => {
      active = false
    }
  }, [attempt])

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const [name, version] = await Promise.all([getName(), getVersion()])
        if (!active) return

        setAppName(name ?? null)
        setAppVersion(version ?? null)
      } catch {
        // Leave app information empty when Tauri metadata is unavailable.
      }
    })()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (resetWasOpen.current && !resetDialog.isOpen) {
      resetTriggerRef.current?.focus()
    }

    resetWasOpen.current = resetDialog.isOpen
  }, [resetDialog.isOpen])

  async function handleAppearanceChange(patch: Partial<Preferences>) {
    setAppearanceError(null)

    try {
      await updatePreferences({ ...patch, startAtLogin })
    } catch {
      setAppearanceError(APPEARANCE_SAVE_ERROR)
    }
  }

  async function handleSaveProfile() {
    const trimmedOwner = ownerName.trim()
    const trimmedVault = vaultName.trim()

    if (!trimmedOwner) {
      setOwnerError(OWNER_REQUIRED_ERROR)
      return
    }

    setOwnerError(null)
    setProfileSaveError(null)
    setProfileSaved(false)
    setProfileSaving(true)

    const nextVault = trimmedVault || `${trimmedOwner}'s Vault`

    try {
      await saveProfile({ ownerName: trimmedOwner, vaultName: nextVault })

      setOwnerName(trimmedOwner)
      setVaultName(nextVault)
      setProfileSaved(true)
    } catch {
      setProfileSaveError(PROFILE_SAVE_ERROR)
    } finally {
      setProfileSaving(false)
    }
  }

  async function handleStartAtLoginChange(enabled: boolean) {
    const previous = startAtLogin

    setStartAtLogin(enabled)
    setStartAtLoginError(null)
    setStartAtLoginBusy(true)

    try {
      if (enabled) {
        await enableAutostart()
      } else {
        await disableAutostart()
      }
    } catch {
      setStartAtLogin(previous)
      setStartAtLoginError(NATIVE_SAVE_ERROR)
      setStartAtLoginBusy(false)
      return
    }

    try {
      await saveStartAtLogin(enabled)
    } catch {
      let reconciled = enabled

      try {
        const native = await isAutostartEnabled()
        if (typeof native === 'boolean') reconciled = native
      } catch {
        // Fall back to the requested value when the native state cannot be read.
      }

      setStartAtLogin(reconciled)
      setStartAtLoginError(AUTOSTART_NOT_SAVED)
      setStartAtLoginBusy(false)
      return
    }

    setStartAtLoginBusy(false)
  }

  async function handleResetPreferences() {
    setResetBusy(true)
    setResetError(null)

    let nextStartAtLogin = startAtLogin

    if (startAtLogin) {
      try {
        await disableAutostart()
        nextStartAtLogin = false
        setStartAtLogin(false)
      } catch {
        setStartAtLoginError(NATIVE_SAVE_ERROR)
      }
    }

    try {
      await updatePreferences({ ...RESET_PREFERENCES, startAtLogin: nextStartAtLogin })
      setAppearanceError(null)
      resetDialog.close()
    } catch {
      setResetError(RESET_SAVE_ERROR)
    } finally {
      setResetBusy(false)
    }
  }

  const heading = (
    <PageHeader
      description="Manage Kivo presentation and local app preferences."
      title="Settings"
      titleId="settings-title"
    />
  )

  if (loadState === 'loading') {
    return (
      <section aria-labelledby="settings-title" className="grid gap-5">
        {heading}
        <Card aria-labelledby="settings-loading-title" aria-live="polite" role="status">
          <Card.Content className="grid gap-2">
            <Typography className={stateLabelClass} color="muted" type="body-xs" weight="bold">
              LOADING
            </Typography>
            <Typography id="settings-loading-title" type="h2">
              Loading settings
            </Typography>
            <Typography color="muted" type="body">
              Kivo is reading your saved preferences.
            </Typography>
          </Card.Content>
        </Card>
      </section>
    )
  }

  if (loadState === 'error') {
    return (
      <section aria-labelledby="settings-title" className="grid gap-5">
        {heading}
        <Card aria-labelledby="settings-error-title" className="border-danger" role="alert">
          <Card.Content className="grid gap-2">
            <Typography className={stateLabelClass} color="muted" type="body-xs" weight="bold">
              ERROR
            </Typography>
            <Typography id="settings-error-title" type="h2">
              Settings could not load
            </Typography>
            <Typography color="muted" type="body">
              Kivo could not read your preferences. Try again to reload this screen.
            </Typography>
            <Button
              className="justify-self-start"
              variant="secondary"
              onPress={() => setAttempt((value) => value + 1)}
            >
              Try again
            </Button>
          </Card.Content>
        </Card>
      </section>
    )
  }

  return (
    <section aria-labelledby="settings-title" className="grid gap-5">
      {heading}

      <Card aria-labelledby="settings-profile-title">
        <Card.Content className="grid gap-3">
          <Typography id="settings-profile-title" type="h2">
            Profile
          </Typography>
          <Typography color="muted" type="body">
            Your name and vault name appear on the Dashboard and in this vault.
          </Typography>

          <div className="grid max-w-md gap-4">
          <TextField
            isRequired
            isInvalid={ownerError !== null}
            value={ownerName}
            onChange={(value) => {
              setOwnerName(value)
              setOwnerError(null)
              setProfileSaved(false)
            }}
          >
            <Label>Owner name</Label>
            <Input fullWidth autoComplete="name" variant="secondary" />
            {ownerError ? <FieldError>{ownerError}</FieldError> : null}
          </TextField>

          <TextField
            value={vaultName}
            onChange={(value) => {
              setVaultName(value)
              setProfileSaved(false)
            }}
          >
            <Label>Vault name</Label>
            <Input fullWidth variant="secondary" />
          </TextField>
        </div>

        {profileSaveError ? (
          <Typography className="font-semibold text-danger" role="alert" type="body">
            {profileSaveError}
          </Typography>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button isDisabled={profileSaving} onPress={handleSaveProfile}>
            Save profile
          </Button>
          <Typography aria-live="polite" className="font-bold text-accent" type="body">
            {profileSaved ? PROFILE_SAVED_MESSAGE : ''}
          </Typography>
        </div>
        </Card.Content>
      </Card>

      <Card aria-labelledby="settings-appearance-title">
        <Card.Content className="grid gap-3">
          <Typography id="settings-appearance-title" type="h2">
            Appearance
          </Typography>
          <Typography color="muted" type="body">
            These preferences change how Kivo looks on this device.
          </Typography>

          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(13rem,1fr))]">
          <RadioGroup
            name="theme"
            value={preferences.theme}
            onChange={(value) => void handleAppearanceChange({ theme: value as Theme })}
          >
            <Label>Theme</Label>
            <div className="mt-1 grid gap-1">
              {THEME_OPTIONS.map((option) => (
                <Radio key={option.value} className="min-h-11" value={option.value}>
                  <Radio.Content>
                    <Radio.Control>
                      <Radio.Indicator />
                    </Radio.Control>
                    {option.label}
                  </Radio.Content>
                </Radio>
              ))}
            </div>
          </RadioGroup>

          <RadioGroup
            name="density"
            value={preferences.density}
            onChange={(value) => void handleAppearanceChange({ density: value as Density })}
          >
            <Label>Density</Label>
            <div className="mt-1 grid gap-1">
              {DENSITY_OPTIONS.map((option) => (
                <Radio key={option.value} className="min-h-11" value={option.value}>
                  <Radio.Content>
                    <Radio.Control>
                      <Radio.Indicator />
                    </Radio.Control>
                    {option.label}
                  </Radio.Content>
                </Radio>
              ))}
            </div>
          </RadioGroup>
        </div>

        {appearanceError ? (
          <Typography className="font-semibold text-danger" role="alert" type="body">
            {appearanceError}
          </Typography>
        ) : null}
        </Card.Content>
      </Card>

      <Card aria-labelledby="settings-startup-title">
        <Card.Content className="grid gap-3">
          <Typography id="settings-startup-title" type="h2">
            Start at login
          </Typography>
          <Typography color="muted" type="body">
            Choose whether Kivo opens when you sign in to this device.
          </Typography>

          <Switch
          isDisabled={startAtLoginBusy}
          isSelected={startAtLogin}
          onChange={(enabled) => void handleStartAtLoginChange(enabled)}
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Start Kivo when you sign in
          </Switch.Content>
        </Switch>

        {startAtLoginError ? (
          <Typography className="font-semibold text-danger" role="alert" type="body">
            {startAtLoginError}
          </Typography>
        ) : null}
        </Card.Content>
      </Card>

      <AppLockSettings />

      <Card aria-labelledby="settings-storage-title">
        <Card.Content className="grid gap-3">
          <Typography id="settings-storage-title" type="h2">
            Storage
          </Typography>
          <dl className="grid max-w-md gap-2">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted">Storage</dt>
              <dd className="m-0 font-bold">This Device</dd>
            </div>
          </dl>
          <Typography color="muted" type="body">
            Your vault is stored on this device only. Kivo does not send your data anywhere.
          </Typography>
        </Card.Content>
      </Card>

      <Card aria-labelledby="settings-about-title">
        <Card.Content className="grid gap-3">
          <Typography id="settings-about-title" type="h2">
            App information
          </Typography>
          {appName || appVersion ? (
            <dl className="grid max-w-md gap-2">
              {appName ? (
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-muted">App</dt>
                  <dd className="m-0 font-bold">{appName}</dd>
                </div>
              ) : null}
              {appVersion ? (
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-muted">Version</dt>
                  <dd className="m-0 font-bold">{appVersion}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <Typography color="muted" type="body">
              App information is not available in this environment.
            </Typography>
          )}
        </Card.Content>
      </Card>

      <Card aria-labelledby="settings-reset-title">
        <Card.Content className="grid gap-3">
          <Typography id="settings-reset-title" type="h2">
            Reset presentation preferences
          </Typography>
          <Typography color="muted" type="body">
            Reset theme, density, content width, and start at login. Your profile and app
            lock stay the same.
          </Typography>
          <Modal state={resetDialog}>
            <Button ref={resetTriggerRef} className="justify-self-start" variant="secondary">
              Reset preferences
            </Button>
            <Modal.Backdrop>
              <Modal.Container>
                <Modal.Dialog>
                  <Modal.Header>
                    <Modal.Heading>Reset presentation preferences?</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    <Typography type="body">
                      This resets theme, density, content width, and start at login.
                      Your profile and app lock stay the same.
                    </Typography>
                    {resetError ? (
                      <Typography className="font-semibold text-danger" role="alert" type="body">
                        {resetError}
                      </Typography>
                    ) : null}
                  </Modal.Body>
                  <Modal.Footer>
                    <Button isDisabled={resetBusy} variant="secondary" onPress={resetDialog.close}>
                      Cancel
                    </Button>
                    <Button isDisabled={resetBusy} onPress={() => void handleResetPreferences()}>
                      Yes, reset preferences
                    </Button>
                  </Modal.Footer>
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>
        </Card.Content>
      </Card>
    </section>
  )
}
