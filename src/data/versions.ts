import { notifyVaultChanged } from './events'
import type { VaultItem } from './items'
import { invoke } from './runtime'

export type ItemVersion = { id: string; itemId: string; title: string; content: string; createdAt: string }

export async function listItemVersions(itemId: string): Promise<ItemVersion[]> {
  return invoke<ItemVersion[]>('list_item_versions', { itemId })
}

export async function restoreItemVersion(versionId: string): Promise<VaultItem> {
  const item = await invoke<VaultItem>('restore_item_version', { versionId })
  notifyVaultChanged()
  return item
}
