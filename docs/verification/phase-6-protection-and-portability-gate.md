# Phase 6 protection and portability gate

This gate is open. The commands, vault read/write paths, backup/restore, and import/export are connected and the automated suites pass. The design in `docs/security/phase-6-encryption-design.md` still needs independent security review, and the Windows desktop round trip has not run.

Migration `0010` belongs to Password Manager. Phase 5 uses `0011`, and Phase 6 uses `0012_phase_six_protection.sql`. The existing Password Manager password stays separate from app lock.

## Evidence recorded so far

| Check | Result |
|---|---|
| Commands wired | `lib.rs` registers the six encryption commands (`read_protection_state`, `unlock_content_vault`, `lock_content_vault`, `enable_encryption`, `disable_encryption`, `change_master_password`), the five backup commands, and the seven portability commands. `DatabaseState` owns the in-memory content key and the close/reopen path used by restore. |
| Vault integration | `save_item`/`load_item`/`list_items` encrypt and decrypt `description`, `content`, and `url` through `item_secrets`; note saves skip `item_search` and mark the index pending; versions store `encrypted_content`; `import_file` encrypts bytes and sets `files.encrypted=1`; previews decrypt in memory; open/reveal write a temp decrypted copy; PDF text indexing is refused while encryption is on. A missing key returns "Vault is locked". |
| `enable_encryption` index rule | Enabling clears `item_search` and `item_vectors` (related-search vectors are derived from plaintext) inside the retry-safe pass. |
| `cargo test --test phase6_crypto` | 44 tests passed. Key wrap, wrong password, tampering, record binding, memory-key clearing, and migration defaults run in isolation. |
| `cargo test --test phase6_backup` | 44 tests passed. The round trip includes database rows and managed files. A corrupt backup did not replace the live test vault. Versions 12 and 13 are accepted; a newer version is rejected. `create_backup` refuses a destination inside app data; restore clears the key and reopens. |
| `cargo test --test phase6_portability` | 43 tests passed. Markdown and JSON formats, omitted credentials, unsafe file paths, protected imports, and skipped-item reporting. |
| `cargo test` (full) | All targets pass: lib 113, phase5_csp 1, phase6_backup 44, phase6_commands 43, phase6_crypto 44, phase6_migration 1, phase6_portability 43, phase7_commands 103, phase7_insights 104, phase7_migration 1. 0 failed. |
| `cargo clippy --all-targets -- -D warnings` | Exit 0. `cargo fmt --check` exit 0. |
| `pnpm test --run` | 47 files and 543 tests passed, including Phase 6 lock, data, and Settings-card suites. `pnpm typecheck` exit 0; `pnpm build` exit 0. |

## Required before release

1. Make sure that app lock and Password Manager lock clear their separate keys. Test manual lock, auto-lock, and unlock in the desktop app.
2. Inspect live and trashed notes, versions, files, and search tables while encryption is on. Make sure that protected content is not readable in a fresh database or managed file.
3. Interrupt enable, disable, backup, and restore at controlled points. Make sure that each path either recovers or leaves the old vault usable. In-crate tests cover journal recovery and restore rollback with a safety copy, but not a real process kill.
4. Full Rust and frontend gates after commands and Settings screens are connected. Done on the final tree; see the evidence table.
5. Run a Windows desktop round trip for encrypted reads and writes, backup, validated restore, Markdown import, JSON import, and export.
6. Obtain an independent security review. Record its findings and limits here. Until then, make no release claim about field encryption.
