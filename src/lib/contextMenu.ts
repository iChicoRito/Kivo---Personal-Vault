const NATIVE_MENU_SELECTOR =
  'input, textarea, [contenteditable="true"], [contenteditable=""], [role="textbox"]'

export function keepsNativeContextMenu(target: EventTarget | null) {
  return target instanceof Element && target.closest(NATIVE_MENU_SELECTOR) !== null
}

export function installContextMenuGuard() {
  document.addEventListener(
    'contextmenu',
    (event) => {
      if (keepsNativeContextMenu(event.target)) return

      event.preventDefault()
    },
    { capture: true },
  )
}
