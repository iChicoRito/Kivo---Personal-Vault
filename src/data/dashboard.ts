import { invoke } from './runtime'

export type VaultSummary = {
  itemCount: number
  noteCount: number
  sourceCount: number
  fileCount: number
  favoriteCount: number
  collectionCount: number
  tagCount: number
  trashCount: number
  fileBytes: number
  databaseBytes: number
}

export async function loadVaultSummary(): Promise<VaultSummary> {
  return invoke<VaultSummary>('load_vault_summary')
}
