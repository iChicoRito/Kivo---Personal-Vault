import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button, Card, Input, Label, Skeleton, TextField, Typography } from '@heroui/react'

import {
  hasAppLock,
  readAppLockVerifier,
  removeAppLock,
  setAppLock,
  verifyPassword,
} from '../../data/security'

type Mode = 'loading' | 'off' | 'on' | 'error'

const EMPTY_PASSWORD_MESSAGE = 'Enter a Master Password.'
const EMPTY_CURRENT_MESSAGE = 'Enter your current Master Password.'
const MISMATCH_MESSAGE = 'Passwords do not match.'
const WRONG_PASSWORD_MESSAGE = 'That password did not match. Try again.'
const SAVE_ERROR_MESSAGE = 'We could not update app lock. Try again.'
const REMOVE_ERROR_MESSAGE = 'We could not remove app lock. Try again.'
const READ_ERROR_MESSAGE = 'We could not read app lock. Reopen Settings to try again.'

export default function AppLockSettings() {
  const [mode, setMode] = useState<Mode>('loading')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmingRemoval, setConfirmingRemoval] = useState(false)
  const busyRef = useRef(false)

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const enabled = await hasAppLock()
        if (active) setMode(enabled ? 'on' : 'off')
      } catch {
        if (active) setMode('error')
      }
    })()

    return () => {
      active = false
    }
  }, [])

  function resetFields() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  function validateNewPassword() {
    if (!newPassword) return EMPTY_PASSWORD_MESSAGE
    if (newPassword !== confirmPassword) return MISMATCH_MESSAGE
    return null
  }

  async function turnOn(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()

    if (busyRef.current) return

    const validation = validateNewPassword()
    if (validation) {
      setError(validation)
      return
    }

    busyRef.current = true
    setBusy(true)
    setError(null)
    setStatusMessage(null)

    try {
      await setAppLock(newPassword)
      resetFields()
      setMode('on')
      setStatusMessage('App lock is on. Kivo will ask for your Master Password when it opens.')
    } catch {
      setError(SAVE_ERROR_MESSAGE)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  async function changePassword(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()

    if (busyRef.current) return

    const validation = validateNewPassword()
    if (validation) {
      setError(validation)
      return
    }

    if (!currentPassword) {
      setError(EMPTY_CURRENT_MESSAGE)
      return
    }

    busyRef.current = true
    setBusy(true)
    setError(null)
    setStatusMessage(null)

    try {
      const verifier = await readAppLockVerifier()
      const matched = verifier !== null && (await verifyPassword(currentPassword, verifier))

      if (!matched) {
        setError(WRONG_PASSWORD_MESSAGE)
        return
      }

      await setAppLock(newPassword)
      resetFields()
      setStatusMessage('Your Master Password was changed.')
    } catch {
      setError(SAVE_ERROR_MESSAGE)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  function beginRemoval() {
    setError(null)
    setRemoveError(null)
    setStatusMessage(null)
    setConfirmingRemoval(true)
  }

  function cancelRemoval() {
    setRemoveError(null)
    setConfirmingRemoval(false)
  }

  async function confirmRemove(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()

    if (busyRef.current) return

    if (!currentPassword) {
      setRemoveError(EMPTY_CURRENT_MESSAGE)
      return
    }

    busyRef.current = true
    setBusy(true)
    setRemoveError(null)
    setStatusMessage(null)

    try {
      const verifier = await readAppLockVerifier()
      const matched = verifier !== null && (await verifyPassword(currentPassword, verifier))

      if (!matched) {
        setRemoveError(WRONG_PASSWORD_MESSAGE)
        return
      }

      await removeAppLock()
      resetFields()
      setConfirmingRemoval(false)
      setMode('off')
      setStatusMessage('App lock is off. Kivo will open without a password.')
    } catch {
      setRemoveError(REMOVE_ERROR_MESSAGE)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <Card aria-labelledby="app-lock-title">
      <Card.Content className="grid gap-3">
        <Typography id="app-lock-title" type="h2">
          App lock
        </Typography>
        <Typography color="muted" type="body">
          App lock keeps Kivo closed to other people. It does not encrypt your files.
        </Typography>

        {statusMessage ? (
          <Typography role="status" type="body">
            {statusMessage}
          </Typography>
        ) : null}

        <div>
          {mode === 'loading' && (
            <div className="flex items-center gap-2">
              <Typography color="muted" role="status" type="body">
                Checking app lock...
              </Typography>
              <Skeleton aria-hidden="true" className="h-4 w-20 rounded" />
            </div>
          )}

          {mode === 'error' && (
            <Typography className="font-semibold text-danger" role="alert" type="body">
              {READ_ERROR_MESSAGE}
            </Typography>
          )}

          {mode === 'off' && (
            <div className="flex flex-col gap-5">
              <Typography type="h3">App lock is off.</Typography>
              <Typography color="muted" type="body">
                Turn on app lock to ask for a Master Password when Kivo opens.
              </Typography>

              <form className="flex flex-col gap-4" noValidate onSubmit={(event) => void turnOn(event)}>
                <TextField
                  isInvalid={error !== null}
                  type="password"
                  value={newPassword}
                  onChange={setNewPassword}
                >
                  <Label>Master Password</Label>
                  <Input fullWidth autoComplete="new-password" variant="secondary" />
                </TextField>

                <TextField
                  isInvalid={error !== null}
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                >
                  <Label>Confirm Master Password</Label>
                  <Input fullWidth autoComplete="new-password" variant="secondary" />
                </TextField>

                {error ? (
                  <Typography className="font-semibold text-danger" role="alert" type="body">
                    {error}
                  </Typography>
                ) : null}

                <div className="flex justify-end">
                  <Button isDisabled={busy} type="submit" onPress={() => void turnOn()}>
                    {busy ? 'Saving...' : 'Turn on app lock'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {mode === 'on' && (
            <div className="flex flex-col gap-6">
              <Typography type="h3">App lock is on.</Typography>

              <form
                className="flex flex-col gap-4"
                noValidate
                onSubmit={(event) => void changePassword(event)}
              >
                <TextField
                  isInvalid={error !== null}
                  type="password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                >
                  <Label>Current Master Password</Label>
                  <Input fullWidth autoComplete="current-password" variant="secondary" />
                </TextField>

                <TextField
                  isInvalid={error !== null}
                  type="password"
                  value={newPassword}
                  onChange={setNewPassword}
                >
                  <Label>New Master Password</Label>
                  <Input fullWidth autoComplete="new-password" variant="secondary" />
                </TextField>

                <TextField
                  isInvalid={error !== null}
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                >
                  <Label>Confirm New Master Password</Label>
                  <Input fullWidth autoComplete="new-password" variant="secondary" />
                </TextField>

                {error ? (
                  <Typography className="font-semibold text-danger" role="alert" type="body">
                    {error}
                  </Typography>
                ) : null}

                <div className="flex justify-end">
                  <Button isDisabled={busy} type="submit" onPress={() => void changePassword()}>
                    {busy ? 'Saving...' : 'Change password'}
                  </Button>
                </div>
              </form>

              <div className="flex flex-col gap-3 border-t border-border pt-6">
                <Typography className="uppercase" color="muted" type="body-xs" weight="bold">
                  Remove app lock
                </Typography>
                <Typography color="muted" type="body">
                  Removing app lock means Kivo opens without asking for a password. Your files stay on
                  this device.
                </Typography>

                {confirmingRemoval ? (
                  <form
                    className="flex flex-col gap-3"
                    noValidate
                    onSubmit={(event) => void confirmRemove(event)}
                  >
                    <Typography type="body">
                      Remove app lock? Your files stay on this device.
                    </Typography>
                    <Typography color="muted" type="body">
                      Enter your current Master Password to confirm.
                    </Typography>

                    <TextField
                      isInvalid={removeError !== null}
                      type="password"
                      value={currentPassword}
                      onChange={setCurrentPassword}
                    >
                      <Label>Master Password to remove app lock</Label>
                      <Input fullWidth autoComplete="current-password" variant="secondary" />
                    </TextField>

                    {removeError ? (
                      <Typography className="font-semibold text-danger" role="alert" type="body">
                        {removeError}
                      </Typography>
                    ) : null}

                    <div className="flex flex-wrap gap-3">
                      <Button variant="secondary" type="button" isDisabled={busy} onPress={cancelRemoval}>
                        Cancel
                      </Button>
                      <Button isDisabled={busy} type="submit" onPress={() => void confirmRemove()}>
                        {busy ? 'Removing...' : 'Yes, remove app lock'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <Button variant="secondary" onPress={beginRemoval}>
                      Remove app lock
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card.Content>
    </Card>
  )
}
