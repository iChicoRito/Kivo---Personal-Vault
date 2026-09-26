import { useState } from 'react'
import { Button, Modal, Typography } from '@heroui/react'
import { restoreBackup, type BackupInfo } from '../../data/backup'
import { useLock } from '../../app/lock'

export default function RestoreDialog({ backup, onClose }: { backup: BackupInfo | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lock = useLock()
  async function restore() {
    if (!backup?.valid || busy) return
    setBusy(true)
    try {
      const result = await restoreBackup(backup.path)
      setError(null)
      onClose()
      // Restored vault may have a different Master Password. Never leave old content mounted.
      await lock?.lock()
      window.alert(`Restored ${result.itemCount} items and ${result.fileCount} files. Safety copy: ${result.safetyCopyPath}`)
    } catch { setError('Restore failed. Your current vault should be unchanged. Check your backup and try again.') }
    finally { setBusy(false) }
  }
  return <Modal isOpen={backup !== null} onOpenChange={(open) => { if (!open && !busy) onClose() }}><Modal.Backdrop><Modal.Container><Modal.Dialog>
    <Modal.Header><Modal.Heading>Replace my vault?</Modal.Heading></Modal.Header>
    <Modal.Body className="grid gap-3">
      <Typography type="body">This replaces your current database and managed files, not merges them. A safety copy is made first. You will need the restored vault’s Master Password.</Typography>
      {backup ? <Typography type="body">Backup: {backup.createdAt}, {backup.itemCount} items, {backup.fileCount} files. {backup.path}</Typography> : null}
      {backup?.problems.map((problem) => <Typography key={problem} role="alert" type="body">{problem}</Typography>)}
      {error ? <Typography role="alert" className="text-danger" type="body">{error}</Typography> : null}
    </Modal.Body><Modal.Footer><Button variant="secondary" isDisabled={busy} onPress={onClose}>Cancel</Button><Button variant="danger" isDisabled={!backup?.valid || busy} onPress={() => void restore()}>{busy ? 'Restoring...' : 'Replace my vault'}</Button></Modal.Footer>
  </Modal.Dialog></Modal.Container></Modal.Backdrop></Modal>
}
