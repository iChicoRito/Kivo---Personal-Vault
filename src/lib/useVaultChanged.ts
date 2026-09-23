import { useEffect, useRef } from 'react'

import { VAULT_CHANGED_EVENT } from '../data/events'

/**
 * Runs `onChange` whenever the vault reports a write. The latest callback is
 * held in a ref so the window listener is registered once per mount.
 */
export function useVaultChanged(onChange: () => void) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const handleChange = () => onChangeRef.current()
    window.addEventListener(VAULT_CHANGED_EVENT, handleChange)
    return () => window.removeEventListener(VAULT_CHANGED_EVENT, handleChange)
  }, [])
}
