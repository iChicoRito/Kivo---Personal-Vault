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
      else setError('Could not make the backup. Pick another folder and try again.')
    } finally { setBusy(false) }
  }
  async function check() {
    setBusy(true); setError(null)
    try {
      const path = await pickBackupSource()
      if (path) { const inspected = await inspectBackup(path); setResult(inspected); setRestore(inspected) }
    } catch { setError('Could not open this backup. Nothing was changed.') }
    finally { setBusy(false) }
  }
  return <Card aria-labelledby="backup-title"><Card.Content className="grid gap-4">
    <div className="grid gap-1">
      <Typography className="text-lg font-semibold" id="backup-title" type="h2">Backup and restore</Typography>
      <Typography color="muted" type="body-sm">Save a copy of everything to a folder you choose, or bring one back. Kivo does not make backups automatically, so keep a copy on another drive.</Typography>
    </div>
    <div className="flex flex-wrap gap-3"><Button isDisabled={busy} onPress={() => void create()}>Create backup</Button><Button isDisabled={busy} variant="secondary" onPress={() => void check()}>Restore from backup</Button></div>
    {busy ? <Typography role="status" type="body-sm">Working on your backup...</Typography> : null}
    {result ? <div className="grid gap-0.5 rounded-xl bg-(--default) px-4 py-3" role="status">
      <Typography type="body-sm" weight="medium">{result.valid ? 'This backup looks good.' : 'This backup has problems.'} {result.itemCount} items and {result.fileCount} files, made {result.createdAt}.</Typography>
      <Typography className="break-all" color="muted" type="body-xs">{result.path}</Typography>
    </div> : null}
    {result?.problems.map((problem) => <Typography role="alert" className="text-danger" key={problem} type="body-sm">{problem}</Typography>)}
    {conflict ? <div className="grid gap-3" role="alert"><Typography type="body-sm">There is already a backup in this folder. Replace it?</Typography><div className="flex flex-wrap gap-3"><Button variant="danger" onPress={() => void create(conflict, true)}>Replace backup</Button><Button variant="secondary" onPress={() => setConflict(null)}>Cancel</Button></div></div> : null}
    {error ? <Typography role="alert" className="text-danger" type="body-sm">{error}</Typography> : null}
    <RestoreDialog backup={restore} onClose={() => setRestore(null)} />
  </Card.Content></Card>
}
