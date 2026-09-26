import { invoke } from './runtime'

export type StorageReport = {
  totalBytes: number
  databaseBytes: number
  fileBytes: number
  fileCount: number
  groups: Array<{ label: string; count: number; bytes: number }>
  largest: Array<{ itemId: string; title: string; originalName: string; byteSize: number; importedAt: string }>
}

export async function loadStorageReport(): Promise<StorageReport> {
  return invoke<StorageReport>('load_storage_report')
}
