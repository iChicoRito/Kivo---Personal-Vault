import { invoke } from './runtime'

export type ProtectionState = { lockEnabled: boolean; encryptionEnabled: boolean }

export const readProtectionState = () => invoke<ProtectionState>('read_protection_state')
export const unlockVault = (password: string) => invoke<boolean>('unlock_content_vault', { password })
export const lockVault = () => invoke<void>('lock_content_vault')
export const enableEncryption = (password: string) => invoke<void>('enable_encryption', { password })
export const disableEncryption = (password: string) => invoke<void>('disable_encryption', { password })
export const changeMasterPassword = (current: string, next: string) =>
  invoke<void>('change_master_password', { current, next })
