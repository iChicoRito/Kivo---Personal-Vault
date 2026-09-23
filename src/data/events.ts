/** Window event that fires after any vault write that changes items or collections. */
export const VAULT_CHANGED_EVENT = 'kivo:vault-changed'

/**
 * Tells listeners (the collection sidepanel) to reload their data. The panel
 * already works from window events for drag and drop, so writes announce
 * themselves the same way instead of depending on props or a store.
 */
export function notifyVaultChanged(): void {
  window.dispatchEvent(new Event(VAULT_CHANGED_EVENT))
}
