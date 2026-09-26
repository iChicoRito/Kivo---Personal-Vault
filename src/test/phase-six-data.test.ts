import { beforeEach, expect, it } from 'vitest'
import { getTauriInvoke } from './setup'
import { readProtectionState, unlockVault, lockVault, enableEncryption, disableEncryption, changeMasterPassword } from '../data/protection'
import { pickBackupDestination, createBackup, pickBackupSource, inspectBackup, restoreBackup } from '../data/backup'
import { pickSaveFile, pickFolderDestination, exportNoteMarkdown, exportItemsJson, exportVaultJson, importJson, importMarkdown } from '../data/portability'

beforeEach(() => getTauriInvoke().mockReset())

it('uses content-vault commands without touching password manager unlock', async () => {
  getTauriInvoke().mockResolvedValue(undefined)
  await readProtectionState()
  await unlockVault('secret')
  await lockVault()
  await enableEncryption('secret')
  await disableEncryption('secret')
  await changeMasterPassword('old', 'new')
  expect(getTauriInvoke().mock.calls).toEqual([
    ['read_protection_state'], ['unlock_content_vault', { password: 'secret' }],
    ['lock_content_vault'], ['enable_encryption', { password: 'secret' }],
    ['disable_encryption', { password: 'secret' }],
    ['change_master_password', { current: 'old', next: 'new' }],
  ])
})

it('passes backup paths and replace explicitly', async () => {
  getTauriInvoke().mockResolvedValue(undefined)
  await pickBackupDestination()
  await createBackup('C:/backups', false)
  await pickBackupSource()
  await inspectBackup('C:/backups/Kivo')
  await restoreBackup('C:/backups/Kivo')
  expect(getTauriInvoke().mock.calls).toEqual([
    ['pick_backup_destination'], ['create_backup', { destination: 'C:/backups', replace: false }],
    ['pick_backup_source'], ['inspect_backup', { path: 'C:/backups/Kivo' }],
    ['restore_backup', { path: 'C:/backups/Kivo' }],
  ])
})

it('passes picker and import/export args unchanged', async () => {
  getTauriInvoke().mockResolvedValue(undefined)
  await pickSaveFile('note.md')
  await pickFolderDestination()
  await exportNoteMarkdown('note-1', 'note.md')
  await exportItemsJson(['item-1'], 'item.json')
  await exportVaultJson('C:/export')
  await importJson('C:/items.json')
  await importMarkdown(['C:/one.md'])
  expect(getTauriInvoke().mock.calls).toEqual([
    ['pick_save_file', { defaultName: 'note.md' }], ['pick_folder_destination'],
    ['export_note_markdown', { id: 'note-1', path: 'note.md' }],
    ['export_items_json', { ids: ['item-1'], path: 'item.json' }],
    ['export_vault_json', { path: 'C:/export' }], ['import_json', { path: 'C:/items.json' }],
    ['import_markdown', { paths: ['C:/one.md'] }],
  ])
})
