import { invoke } from './runtime'

export type BackupInfo = {
  path: string
  createdAt: string
  appVersion: string
  schemaVersion: number
  itemCount: number
  fileCount: number
  valid: boolean
  problems: string[]
}

export type RestoreSummary = { itemCount: number; fileCount: number; safetyCopyPath: string }

export const pickBackupDestination = () => invoke<string | null>('pick_backup_destination')
export const createBackup = (destination: string, replace: boolean) =>
  invoke<BackupInfo>('create_backup', { destination, replace })
export const pickBackupSource = () => invoke<string | null>('pick_backup_source')
export const inspectBackup = (path: string) => invoke<BackupInfo>('inspect_backup', { path })
export const restoreBackup = (path: string) => invoke<RestoreSummary>('restore_backup', { path })
