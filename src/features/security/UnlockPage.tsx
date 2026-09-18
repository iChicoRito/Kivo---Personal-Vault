import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button, Card, FieldError, Input, Label, TextField, Typography } from '@heroui/react'

import PageHeader from '../../app/PageHeader'
import { readAppLockVerifier, verifyPassword } from '../../data/security'

export type UnlockPageProps = {
  onUnlocked?: () => void
}

const WRONG_PASSWORD_MESSAGE = 'That password did not match. Try again.'
const CHECK_ERROR_MESSAGE = 'We could not check the password. Try again.'

export default function UnlockPage({ onUnlocked }: UnlockPageProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)
  const busyRef = useRef(false)

  useEffect(() => {
    passwordRef.current?.focus()
  }, [])

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()

    if (busyRef.current) return

    busyRef.current = true
    setChecking(true)
    setError(null)

    try {
      const verifier = await readAppLockVerifier()

      if (verifier === null) {
        onUnlocked?.()
        return
      }

      const matched = await verifyPassword(password, verifier)

      if (matched) {
        setPassword('')
        onUnlocked?.()
      } else {
        setError(WRONG_PASSWORD_MESSAGE)
      }
    } catch {
      setError(CHECK_ERROR_MESSAGE)
    } finally {
      busyRef.current = false
      setChecking(false)
    }
  }

  return (
    <section
      aria-busy={checking}
      aria-labelledby="unlock-title"
      className="min-h-screen bg-background px-6 py-12 text-foreground sm:px-10"
    >
      <div className="mx-auto grid max-w-xl gap-8">
        <PageHeader
          description="Enter your Master Password to open Kivo on this device."
          eyebrow="KIVO"
          title="Unlock your vault"
          titleId="unlock-title"
        />

        <Card>
          <Card.Content>
            <form className="grid gap-5" noValidate onSubmit={(event) => void submit(event)}>
              <TextField
                isRequired
                isInvalid={error !== null}
                type="password"
                value={password}
                onChange={setPassword}
              >
                <Label>Master Password</Label>
                <Input fullWidth ref={passwordRef} autoComplete="current-password" variant="secondary" />
                {error ? <FieldError>{error}</FieldError> : null}
              </TextField>

              <Typography color="muted" type="body">
                App lock keeps Kivo closed to other people. It does not encrypt your files.
              </Typography>

              <div className="flex justify-end">
                <Button isDisabled={checking} type="submit" onPress={() => void submit()}>
                  {checking ? 'Checking password...' : 'Unlock Kivo'}
                </Button>
              </div>
            </form>
          </Card.Content>
        </Card>
      </div>
    </section>
  )
}
