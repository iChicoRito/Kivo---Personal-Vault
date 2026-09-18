import { invoke } from './runtime'

export async function pickFile(): Promise<string | null> {
  return invoke<string | null>('pick_file')
}

export async function openItemFile(id: string): Promise<void> {
  return invoke<void>('open_item_file', { id })
}

export async function revealItemFile(id: string): Promise<void> {
  return invoke<void>('reveal_item_file', { id })
}

export async function openSourceUrl(id: string): Promise<void> {
  return invoke<void>('open_source_url', { id })
}
