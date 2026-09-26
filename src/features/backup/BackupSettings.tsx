import { useState } from 'react'
import { Button, Card, Typography } from '@heroui/react'
import { createBackup, inspectBackup, pickBackupDestination, pickBackupSource, type BackupInfo } from '../../data/backup'
import RestoreDialog from './RestoreDialog'

export default function BackupSettings() {
  const [result, setResult] = useState<BackupInfo | null>(null)
  const [restore, setRestore] = useState<BackupInfo | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  async function create(destination?: string, replace = false) {
    setBusy(true); setError(null)
    try {
      const path = destination ?? await pickBackupDestination()
      if (!path) return
      setResult(await createBackup(path, replace)); setConflict(null)
    } catch (reason) {
      if (!replace && String(reason).toLowerCase().includes('exist')) setConflict(destination ?? null)
      else setError('Could not create backup. Check destination and try again.')
    } finally { setBusy(false) }
  }
  async function check() {
    setBusy(true); setError(null)
    try {
      const path = await pickBackupSource()
      if (path) { const inspected = await inspectBackup(path); setResult(inspected); setRestore(inspected) }
    } catch { setError('Could not inspect this backup. No data was changed.') }
    finally { setBusy(false) }
  }
  return <Card aria-labelledby="backup-title"><Card.Content className="grid gap-3">
    <Typography id="backup-title" type="h2">Backup and restore</Typography>
    <Typography color="muted" type="body">Backups copy your database and managed files to a folder you choose. Automatic backups are not available. Keep a copy outside this device.</Typography>
    <div className="flex flex-wrap gap-2"><Button isDisabled={busy} onPress={() => void create()}>Create backup</Button><Button isDisabled={busy} variant="secondary" onPress={() => void check()}>Check a backup</Button></div>
    {busy ? <Typography role="status" type="body">Working with backup...</Typography> : null}
    {result ? <Typography role="status" type="body">{result.valid ? 'Validated' : 'Invalid'} backup from {result.createdAt}. {result.itemCount} items, {result.fileCount} files. {result.path}</Typography> : null}
    {result?.problems.map((problem) => <Typography role="alert" key={problem} type="body">{problem}</Typography>)}
    {conflict ? <div role="alert"><Typography type="body">A backup already exists at this destination. Replace it?</Typography><Button variant="danger" onPress={() => void create(conflict, true)}>Replace backup</Button><Button variant="secondary" onPress={() => setConflict(null)}>Cancel</Button></div> : null}
    {error ? <Typography role="alert" className="text-danger" type="body">{error}</Typography> : null}
    <RestoreDialog backup={restore} onClose={() => setRestore(null)} />
  </Card.Content></Card>
}
