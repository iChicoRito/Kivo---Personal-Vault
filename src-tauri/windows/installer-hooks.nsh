; Included by Tauri's NSIS template (bundle.windows.nsis.installerHooks) before
; the installer pages, so these defines reach the license page.

; Replace the "I Agree" button with an "I accept" checkbox. Next stays disabled
; until the user ticks it.
!define MUI_LICENSEPAGE_CHECKBOX
