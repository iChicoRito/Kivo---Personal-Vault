import { useEffect, useState } from 'react'
import { Button, Card, Input, Label, TextField, Typography } from '@heroui/react'
import { ConfirmDialog } from '../../components/items/dialogs'
import { disableEncryption, enableEncryption, readProtectionState, type ProtectionState } from '../../data/protection'
import { notifyError, notifySuccess } from '../../lib/feedback'

export default function EncryptionSettings() {
  const [state, setState] = useState<ProtectionState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => { void readProtectionState().then(setState).catch(() => setError('Could not read encryption status. Reopen Settings to try again.')) }, [])
  async function change() {
    if (!password || !state || busy) return
    setBusy(true)
    setError(null)
    try {
      if (state.encryptionEnabled) await disableEncryption(password)
      else await enableEncryption(password)
      setState(await readProtectionState())
      setPassword('')
      setConfirm(false)
      notifySuccess(state.encryptionEnabled ? 'Encryption turned off' : 'Encryption turned on')
    } catch {
      setError('Could not change encryption. Your current setting has not changed. Try again.')
      notifyError('Could not change encryption')
    } finally { setBusy(false) }
  }
  return <Card aria-labelledby="encryption-title"><Card.Content className="grid gap-3">
    <Typography id="encryption-title" type="h2">Content encryption</Typography>
    <Typography color="muted" type="body">App lock only hides Kivo. Encryption protects note details and managed file bytes on disk. Titles, tags, dates, and collections remain readable without a password.</Typography>
    <Typography color="muted" type="body">Opening an encrypted file creates a decrypted temporary copy outside the vault. If you forget your Master Password, Kivo cannot recover encrypted content.</Typography>
    {!state && !error ? <Typography role="status" type="body">Checking encryption...</Typography> : null}
    {state ? <Typography role="status" type="body">Encryption is {state.encryptionEnabled ? 'on' : 'off'}.</Typography> : null}
    {state && !state.lockEnabled ? <Typography type="body">Set a Master Password in App lock first.</Typography> : null}
    {state?.lockEnabled ? <TextField type="password" value={password} onChange={setPassword}><Label>Master Password for encryption</Label><Input fullWidth autoComplete="current-password" variant="secondary" /></TextField> : null}
    {error ? <Typography role="alert" type="body" className="text-danger">{error}</Typography> : null}
    <Button className="justify-self-start" isDisabled={!state?.lockEnabled || busy || !password} onPress={() => state?.encryptionEnabled ? setConfirm(true) : void change()}>{busy ? 'Updating...' : state?.encryptionEnabled ? 'Turn off encryption' : 'Turn on encryption'}</Button>
    <ConfirmDialog open={confirm} title="Turn off encryption?" description="Protected values and managed files will be written back to disk as plaintext. Keep a backup before changing protection." confirmLabel="Turn off encryption" tone="danger" onCancel={() => setConfirm(false)} onConfirm={() => void change()} />
  </Card.Content></Card>
}
