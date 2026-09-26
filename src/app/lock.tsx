import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { lockVault as lockContentVault } from '../data/protection'
import { lockVault as lockPasswordVault } from '../data/passwords'
import UnlockPage from '../features/security/UnlockPage'
import { usePreferences } from './preferences'

type LockContextValue = { locked: boolean; lock: () => Promise<void>; unlock: () => void }
const LockContext = createContext<LockContextValue | null>(null)

export function useLock() {
  return useContext(LockContext)
}

export function LockProvider({ children, initialLocked = false, autoLockMinutes }: {
  children: ReactNode
  initialLocked?: boolean
  autoLockMinutes?: number
}) {
  const [locked, setLocked] = useState(initialLocked)
  const { preferences } = usePreferences()
  const minutes = autoLockMinutes ?? preferences.autoLockMinutes

  const lock = useCallback(async () => {
    setLocked(true)
    await Promise.allSettled([lockContentVault(), lockPasswordVault()])
  }, [])

  useEffect(() => {
    if (locked || !minutes) return
    let timeout: ReturnType<typeof setTimeout>
    const reset = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => void lock(), minutes * 60_000)
    }
    reset()
    for (const name of ['pointerdown', 'keydown', 'focus', 'scroll']) window.addEventListener(name, reset, true)
    return () => {
      clearTimeout(timeout)
      for (const name of ['pointerdown', 'keydown', 'focus', 'scroll']) window.removeEventListener(name, reset, true)
    }
  }, [locked, minutes, lock])

  return <LockContext.Provider value={{ locked, lock, unlock: () => setLocked(false) }}>
    {locked ? <main aria-label="Kivo application" className="min-h-screen bg-background text-foreground"><UnlockPage onUnlocked={() => setLocked(false)} /></main> : children}
  </LockContext.Provider>
}
