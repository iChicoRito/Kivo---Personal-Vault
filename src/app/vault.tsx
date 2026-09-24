import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { lockVault, setupVault, unlockVault, vaultStatus } from '../data/passwords'

/** Idle time before the vault locks itself: five minutes. */
export const AUTO_LOCK_MS = 5 * 60 * 1000

export type VaultState = {
  status: 'loading' | 'ready' | 'error'
  configured: boolean
  unlocked: boolean
  setup(masterPassword: string): Promise<void>
  unlock(masterPassword: string): Promise<void>
  lock(): Promise<void>
  refresh(): Promise<void>
}

type VaultSnapshot = {
  configured: boolean
  unlocked: boolean
}

const VaultContext = createContext<VaultState | null>(null)

/**
 * Holds the password vault lock state for the running app. The master key
 * itself lives in Rust memory; this provider only tracks whether the vault is
 * configured and open, and locks it again after five idle minutes.
 */
export function VaultProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VaultState['status']>('loading')
  const [configured, setConfigured] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const idleTimer = useRef<number | null>(null)

  const applySnapshot = useCallback((snapshot: VaultSnapshot) => {
    setConfigured(snapshot.configured)
    setUnlocked(snapshot.unlocked)
    setStatus('ready')
  }, [])

  const refresh = useCallback(async () => {
    try {
      applySnapshot(await vaultStatus())
    } catch {
      setStatus('error')
    }
  }, [applySnapshot])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setup = useCallback(
    async (masterPassword: string) => {
      applySnapshot(await setupVault(masterPassword))
    },
    [applySnapshot],
  )

  const unlock = useCallback(
    async (masterPassword: string) => {
      applySnapshot(await unlockVault(masterPassword))
    },
    [applySnapshot],
  )

  const lock = useCallback(async () => {
    applySnapshot(await lockVault())
  }, [applySnapshot])

  // One idle timer. Any pointer, key, or wheel activity while unlocked pushes
  // the deadline back. When it fires, or when the vault locks or unmounts, the
  // timer clears.
  useEffect(() => {
    if (status !== 'ready' || !unlocked) return

    function resetTimer() {
      if (idleTimer.current !== null) {
        window.clearTimeout(idleTimer.current)
      }
      idleTimer.current = window.setTimeout(() => {
        void lock()
      }, AUTO_LOCK_MS)
    }

    resetTimer()
    window.addEventListener('pointerdown', resetTimer)
    window.addEventListener('keydown', resetTimer)
    window.addEventListener('wheel', resetTimer)

    return () => {
      if (idleTimer.current !== null) {
        window.clearTimeout(idleTimer.current)
      }
      idleTimer.current = null
      window.removeEventListener('pointerdown', resetTimer)
      window.removeEventListener('keydown', resetTimer)
      window.removeEventListener('wheel', resetTimer)
    }
  }, [status, unlocked, lock])

  const value = useMemo<VaultState>(
    () => ({ status, configured, unlocked, setup, unlock, lock, refresh }),
    [status, configured, unlocked, setup, unlock, lock, refresh],
  )

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}

export function useVault(): VaultState {
  const value = useContext(VaultContext)

  if (value === null) {
    throw new Error('useVault must be used inside a VaultProvider.')
  }

  return value
}
