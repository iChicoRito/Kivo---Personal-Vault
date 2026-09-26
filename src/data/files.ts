import { invoke } from './runtime'

export type ItemFilePreview = {
  preview: 'image' | 'pdf' | 'text' | 'unsupported'
  mime: string | null
  text: string | null
  payloadBase64: string | null
  byteSize: number
  originalName: string
  importedAt: string
  truncated: boolean
}

export async function readItemFile(id: string): Promise<ItemFilePreview> {
  return invoke<ItemFilePreview>('read_item_file', { id })
}

export async function pickFile(): Promise<string | null> {
  return invoke<string | null>('pick_file')
}

export async function pickFiles(): Promise<string[] | null> {
  return invoke<string[] | null>('pick_files')
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
