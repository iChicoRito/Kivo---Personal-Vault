# Kivo Phase 6 — Protection and Portability

> **Visual review:** [Open interactive plan](https://plan.agent-native.com/_agent-native/open?app=plan&view=plan&to=%2Fplans%2Fplan-5f30225d34934ee0&planId=plan-5f30225d34934ee0&agentSidebar=closed) (plan-5f30225d34934ee0)

**Status: planned on 24 September 2026. Not implemented. Phase 5 runs first and owns migration `0010`; this phase takes `0011`. If the execution order changes, use the next free number.**

Planning session: `commandcode/deepseek-v4.1-flash#max` (Max Reasoning). Exploration sub-agents: `commandcode/deepseek-v4.1-flash#high` (High Effort). Execution must use `commandcode/deepseek-v4.1-flash` (Default Reasoning) only.

> **Ground truth:** the app lock, the Argon2id verifier, boot classification, `UnlockPage`, and the Settings security card already exist from Phase 1. This plan fills the gaps and does not rebuild them. No `aes-gcm`, `zip`, or SQLCipher crate exists today, and `sha2` is already in `Cargo.lock` through the existing tree. `VACUUM INTO` and the dialog plugin are available.

---

## Goal

Phase 6 protects the vault and makes it portable. The owner can lock the app, turn on field encryption, create a backup, restore it safely, and move supported content in and out. All of it stays on this device. No cloud service joins the flow.

**Done when:** the owner can lock and unlock Kivo by hand and after inactivity; encryption is opt-in and off by default, and protected values are unreadable at rest without the Master Password; a backup returns a validated copy of the database and managed files; restore validates before it changes anything and refuses a corrupted backup with the current vault untouched; import and export move supported content, name every loss, and never delete source data; and the written encryption design passes an external security review before release claims.

## Scope decisions

- **Finish the lock, do not rebuild it.** Phase 1 built set, change, disable, the verifier, the unlock screen, and the Settings card. Phase 6 adds manual lock, the inactivity timer, and one shared lock state for the shell.
- **Lock is interface protection, not encryption (R-137).** Locking hides screens and drops the in-memory key. It does not change files at rest. The Settings copy keeps the two separate.
- **One new crate: `aes-gcm`.** Field encryption needs an audited AEAD (authenticated encryption: one step that hides data and detects tampering), and no crate in the tree provides one. `sha2` also becomes a direct dependency for backup hashes, but it already sits in `Cargo.lock`, so only `aes-gcm` enters the build. Everything else uses what is present: `argon2` 0.6 for key derivation, `rusqlite` 0.40 for `VACUUM INTO`, the dialog plugin for pickers, and std file I/O.
- **Backup is a folder, not a single file.** A backup folder holds `manifest.json`, the SQLite snapshot, and a `files/` copy. This needs no archive crate and the owner can inspect it. This overrides the single-file example in Q-09 because no `zip` crate exists and the plan adds no archive crate.
- **Restore replaces, never merges (Q-10).** Validation runs first, then a safety copy of the current vault, then the swap.
- **Encryption is opt-in and off by default (Q-07).** Protected values are `description`, `content`, `url`, and managed file bytes. Trashed rows and their file bytes are protected too, so a deleted-but-recoverable item does not leak plaintext. `title`, tags, kind, timestamps, collection, and favorite state stay plaintext, so lists and plaintext search keep working.
- **One vault key wrapped by the password.** A random 32-byte vault key encrypts values. An Argon2id key-encryption key (KEK: the key that wraps another key) from the Master Password wraps the vault key. A password change updates the verifier and re-wraps the vault key in one command and one transaction, so a half-applied change cannot lock the owner out (R-142). The protected values stay readable.
- **No base64 or hex layer.** The salt, wrapped key, nonce (a number used once for one encryption), and ciphertext (the hidden bytes) live in BLOB columns. SQLite stores bytes natively, so no encoding crate is needed. The wrapped key stores its nonce first, `nonce || wrapped key`, the same convention as managed file bytes.
- **Phase 5 index contract.** The full-text index holds plaintext only. Write paths skip the `item_search` row for protected items, and enabling encryption deletes the `item_search` rows already written. `index_state.status` drives the rebuild after an unlock, and `needs_index` stays the dirty flag. When encryption turns off, protected items become dirty and the rebuild runs.
- **Markdown and JSON only (Q-11).** No PDF or DOCX import. Export reads only; it never deletes source data (R-162).
- **No recovery path (Q-06).** The verifier is one-way. A forgotten Master Password leaves encrypted content unreadable. Both the set form and the encryption card warn plainly.

**Not built:** automatic backup schedules (R-150 stays off), cloud or network destinations, merge restore, multi-vault, secrets manager, and every Phase 7 module.

## Capability coverage

| Capability | What Phase 6 adds | Proof |
|---|---|---|
| R-133 Set/change/disable | Keeps the Phase 1 card. Adds: refuse to turn lock off while encryption is on, and one `change_master_password` command that updates the verifier and re-wraps the vault key in one transaction | `AppLockSettings` tests; `change_master_password` tests |
| R-134 Manual lock/unlock | `LockProvider` in `src/app/lock.tsx`, a navbar lock button, routes unmount, `lock_vault` drops the key | Lock provider tests; unlock flow test |
| R-135 Inactivity lock | `autoLockMinutes` preference (0 = off) and an activity listener in `LockProvider` | Timer tests with fake timers |
| R-136 No raw password | Already true: Argon2id PHC verifier only (PHC is the standard password-hash text format). Phase 6 stores no password and no key on disk | `database.rs` tests for verifier storage and boot classification (`completed_setup_with_verifier_reads_locked`, `corrupted_password_verifier_does_not_lock_the_app`, `database_state_sets_and_removes_the_verifier_for_boot_states`); `security.rs` hash tests |
| R-137 Lock is not encryption | Copy in `AppLockSettings`, `UnlockPage`, and the encryption card; separate modules and tests | Copy checks in tests |
| R-138 Settings security area | Auto-lock, encryption, backup, restore, and import/export cards in `SettingsPage.tsx` | Settings page tests |
| R-139 Encrypt sensitive data | AES-256-GCM over `description`, `content`, `url`, and file bytes, including trashed items; `item_secrets` table | Encryption round-trip tests; at-rest inspection of live and trashed rows |
| R-140 Keys from the password | Argon2id KEK wraps a random vault key; salt and wrapped key in `security` | Key derivation tests; no raw password at rest |
| R-141 Decrypt only unlocked | The key lives in `VaultKeyState` memory only; `lock_vault` clears it best effort; reads fail without it | Lock/unlock round-trip command tests |
| R-142 Safe key change | `change_master_password` updates the verifier and re-wraps the vault key in one transaction; content stays readable after a password change | Change-then-read test; a forced mid-way failure leaves the old password valid |
| R-143 No plaintext in logs | Commands never log values. Errors name fields, never content. A review pass checks this | Log review checklist in the gate evidence |
| R-144 Audited crypto and review | `aes-gcm` and `argon2` are established crates. A written design and an external review come before release claims | Design note and review record in the gate; work plan step 6 |
| R-145 Manual backup | "Create backup" in `BackupSettings.tsx`, backed by `create_backup` | Backup command tests |
| R-146 Choose destination | Folder picker through the dialog plugin already used in `vault.rs` | Destination conflict and picker tests |
| R-147 SQLite and files | `VACUUM INTO` snapshot plus a copy of the managed files | Round-trip test reads rows and bytes |
| R-148 Date and status | The manifest holds date, counts, versions, and file hashes. Create returns `BackupInfo`. "Check a backup" re-validates any folder | Manifest validation tests |
| R-149 No silent replacement | An existing target needs a confirmation and `replace = true`; otherwise the command returns a conflict | Conflict tests |
| R-150 Automatic backups | Not built. Stays off by default. The card says automatic backups are not available yet. No scheduler | Card copy test |
| R-151 Select and validate | `pick_backup_source` plus `inspect_backup` show date, versions, counts, and every problem | Inspect tests: good, older, newer, corrupt |
| R-152 Restore stores | `restore_backup` swaps the database and files, then reopens and migrates the restored database | Round-trip test: items and file bytes return |
| R-153 Protect current data | Replace-only flow, explicit "Replace my vault" dialog, safety copy first, a non-empty vault always asks | Restore dialog tests; safety-copy test |
| R-154 Reject corruption | Manifest, version, `PRAGMA integrity_check`, file count, sizes, and SHA-256 hashes are checked before any change. Failure changes nothing | Corrupt-input tests |
| R-155 Explicit confirmation | No restore runs without the confirmation result | Restore dialog tests |
| R-156 Confirm success | Success toast shows restored counts and the safety-copy path; the restored vault opens | Round-trip test opens a restored note |
| R-157 Import | Markdown notes and Kivo JSON. The existing file import covers supported files | Import tests for each input |
| R-158 Export items | One note to Markdown, one item or one collection to JSON | Export tests |
| R-159 Full-vault export | `kivo-vault.json` plus a `files/` folder of originals | Full export test |
| R-160 Preserve metadata | JSON keeps tags, collection name, favorite, pinned, and dates. Markdown uses front matter and documents every loss | Mapping tests; loss list shown in the UI |
| R-161 Explain unsupported | The import report names each skipped file with a reason. Unsupported input returns a clear error, never partial success | Report tests |
| R-162 Never delete source | Export opens sources read-only; tests assert the source item and files are unchanged | Export immutability test |
| R-029 Round trip | The R-145 and R-152 pair returns file rows and the available managed bytes | Round-trip test with a real file |

## Backend contract

Migration `0011_phase_six_protection.sql` (Phase 6 owns it; see the status line). Register it in `src-tauri/src/database.rs` with an `include_str!` constant and a `Migration { version: 11, sql: ... }` entry in `MIGRATIONS`, like the existing entries:

```sql
ALTER TABLE preferences ADD COLUMN auto_lock_minutes INTEGER NOT NULL DEFAULT 0
  CHECK (auto_lock_minutes >= 0);
ALTER TABLE files ADD COLUMN encrypted INTEGER NOT NULL DEFAULT 0
  CHECK (encrypted IN (0, 1));
ALTER TABLE security ADD COLUMN encryption_enabled INTEGER NOT NULL DEFAULT 0
  CHECK (encryption_enabled IN (0, 1));
ALTER TABLE security ADD COLUMN encryption_salt BLOB;
ALTER TABLE security ADD COLUMN wrapped_key BLOB;

-- One row per protected item is the protection mark.
CREATE TABLE IF NOT EXISTS item_secrets (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  nonce BLOB NOT NULL,
  ciphertext BLOB NOT NULL
);
```

`items` keeps its shape. Protected values move into `item_secrets` as one JSON object `{ description, content, url }`, and those three item columns become empty or NULL while protection is on. The manifest shape:

```json
{ "format": 1, "appVersion": "0.1.0", "schemaVersion": 11, "createdAt": "<ISO date>",
  "counts": { "items": 0, "files": 0 }, "databaseSha256": "...",
  "files": [{ "storedName": "...", "originalName": "...", "byteSize": 0, "encrypted": false, "sha256": "..." }] }
```

`byteSize` records the plaintext size, the same value the `files` table keeps, even when the stored bytes are encrypted. Every file entry and the snapshot get a SHA-256 hash from `sha2`.

Commands, registered in the `generate_handler!` list in `lib.rs`:

| Command | Module | Contract |
|---|---|---|
| `read_protection_state()` | `encryption.rs` | `{ lockEnabled, encryptionEnabled }`. Lock reuses `has_stored_password_lock`. |
| `unlock_vault(password)` | `encryption.rs` | Derives the KEK, unwraps the vault key, keeps it in memory. Returns `false` on a wrong password. Never returns key bytes. |
| `lock_vault()` | `encryption.rs` | Overwrites the bytes, then drops the in-memory key. This is best effort: copies can remain until the process ends, and no `zeroize` crate is added. |
| `enable_encryption(password)` | `encryption.rs` | Requires app lock to be on, because the Master Password is the only key source. No lock returns a clear error, and the card asks the owner to set a Master Password first. Verifies the password, creates the salt and vault key, protects every item including trashed rows and every managed file in a retry-safe pass, then writes the flag and the wrapped key. Returns counts. |
| `disable_encryption(password)` | `encryption.rs` | Pre-checks every protected value and file, including trashed items, then decrypts all of them and clears the key material. A failed pre-check changes nothing. |
| `change_master_password(current, next)` | `encryption.rs` | Verifies the current password, hashes the new one, and, when encryption is on, unwraps the vault key and re-wraps it with a fresh salt and the new KEK. The verifier, salt, and wrapped key are written in one transaction. Ciphertext stays as it is. |
| `pick_backup_destination()` | `backup.rs` | Folder picker. Returns `Option<String>`. |
| `create_backup(destination, replace)` | `backup.rs` | Refuses a destination inside the app data folder, so a backup cannot copy itself. Writes a `*.partial` staging folder, hashes every file, validates the snapshot, then renames it to `Kivo-Backup-<date>`. An existing target needs `replace = true`; otherwise returns a conflict. Returns `BackupInfo`. |
| `pick_backup_source()` | `backup.rs` | Folder picker. Returns `Option<String>`. |
| `inspect_backup(path)` | `backup.rs` | Reads the manifest, opens the snapshot read-only, runs `PRAGMA integrity_check`, checks versions and counts, and re-hashes every file against its SHA-256. Returns `BackupInfo` with problems. Changes nothing. |
| `restore_backup(path)` | `backup.rs` | Validates again, writes a safety copy, clears the in-memory key, closes the connection, swaps the database and files, then reopens and migrates the restored database. The app locks, and the owner unlocks with the restored vault's Master Password. Returns `RestoreSummary`. |
| `export_note_markdown(id, path)`, `export_items_json(ids, path)`, `export_vault_json(path)` | `portability.rs` | Write the chosen output. Read-only on vault data. |
| `import_json(path)`, `import_markdown(paths)` | `portability.rs` | Create new items with new ids. Never merge and never overwrite. Return an `ImportReport`. |
| `pick_folder_destination()`, `pick_save_file(default_name)` | `portability.rs` | Dialog pickers for export destinations. |

Modified commands:

| Command | Change |
|---|---|
| `save_item` | When encryption is on, encrypt the three protected fields into the item's `item_secrets` row inside the same transaction, and skip or clear the item's `item_search` row, so no plaintext reaches the index. |
| `load_item`, `list_items` | Decrypt in memory when the row exists and the key is present. A missing key returns a clear "Vault is locked" error. |
| `import_file` | When encryption is on, write bytes as `nonce \|\| ciphertext` and set `files.encrypted = 1`. `byte_size` keeps the plaintext size. |
| `open_item_file`, `reveal_item_file` | When the file is encrypted, decrypt to a temp file and open that copy. A missing key returns an error. |

The import flows select input with the existing `pick_file` and `pick_files` commands from `vault.rs`; no new picker is added.

Key Rust shapes:

```rust
// Cleared on lock and exit. Best effort: buffer copies can remain in memory
// until the process ends. No `zeroize` crate is added, so the plan claims no
// guaranteed erasure.
pub struct VaultKeyState(Mutex<Option<[u8; 32]>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupInfo {
    pub path: String, pub created_at: String, pub app_version: String,
    pub schema_version: i64, pub item_count: i64, pub file_count: i64,
    pub valid: bool, pub problems: Vec<String>,
}
```

Frontend data contract:

```ts
// protection.ts (new)
export async function readProtectionState(): Promise<ProtectionState>
export async function unlockVault(password: string): Promise<boolean>
export async function lockVault(): Promise<void>
export async function enableEncryption(password: string): Promise<void>
export async function disableEncryption(password: string): Promise<void>
export async function changeMasterPassword(current: string, next: string): Promise<void>

// backup.ts (new)
export async function createBackup(destination: string, replace: boolean): Promise<BackupInfo>
export async function inspectBackup(path: string): Promise<BackupInfo>
export async function restoreBackup(path: string): Promise<RestoreSummary>

// portability.ts (new)
export async function exportNoteMarkdown(id: string, path: string): Promise<void>
export async function exportItemsJson(ids: string[], path: string): Promise<void>
export async function exportVaultJson(path: string): Promise<void>
export async function importJson(path: string): Promise<ImportReport>
export async function importMarkdown(paths: string[]): Promise<ImportReport>

// settings.ts (changed)
export type Preferences = { ...; autoLockMinutes: number }
```

## Frontend changes

- `src/app/lock.tsx` (new): `LockProvider` and `useLock`. It owns the unlocked state, listens for activity, and locks after `autoLockMinutes`. On lock it calls `lockVault()`. While locked it renders `UnlockPage` instead of the shell. The database connection stays open (R-137).
- `src/App.tsx` (modified): the `locked` boot state becomes the provider's initial state. `enteredApp` moves into the provider.
- `src/features/security/UnlockPage.tsx` (modified): when encryption is on, unlock through `unlockVault`; otherwise keep the existing `verifyPassword` path.
- `src/features/security/AppLockSettings.tsx` (modified): add an auto-lock `RadioGroup` (Off, 5, 15, 30, 60 minutes) that saves `autoLockMinutes`. A password change calls `changeMasterPassword`, which updates the verifier and re-wraps the vault key in one transaction. When encryption is on, turning the lock off is refused with a clear message. Keep the existing forms, wording, and toasts.
- `src/features/security/EncryptionSettings.tsx` (new): a `Card` in the existing Settings card pattern. Status line, turn on with password and confirmation, turn off with password and `ConfirmDialog`, the Q-06 warning, and the "lock is not encryption" line. When no lock exists, the card disables turn-on and asks the owner to set a Master Password in the App lock card first.
- `src/features/backup/BackupSettings.tsx` (new): `Card` with Create backup, Check a backup, the last result (date, path, validated), and the automatic-backup note.
- `src/features/backup/RestoreDialog.tsx` (new): shows `BackupInfo`, lists problems, requires the explicit "Replace my vault" confirmation, and shows the success summary. After success the app locks, and the owner unlocks with the restored vault's Master Password.
- `src/features/portability/PortabilitySettings.tsx` (new): Import Markdown, Import Kivo JSON, Export full vault, and the loss list. Import picks input with the existing `pick_file` and `pick_files` commands.
- `src/app/AppShell.tsx` (modified): a lock `Button` beside `ThemeToggle` that calls `useLock().lock`.
- `src/features/notes/NoteEditor.tsx` (modified): "Export as Markdown" action.
- `src/features/items/ItemDetailsDialog.tsx` (modified): "Export as JSON" action for one item.
- `src/features/collections/CollectionsPage.tsx` (modified): "Export collection" action in the existing row menu.
- `src/features/settings/SettingsPage.tsx` (modified): mount the new cards after `AppLockSettings`. Use only existing HeroUI v3 parts: `Card`, `Button`, `Switch`, `RadioGroup`, `TextField`, `Modal`, `ConfirmDialog` from `src/components/items/dialogs.tsx`, and the shared toast helpers.

## Work plan

1. Freeze the contract: command names, `BackupInfo`, manifest fields, `Preferences.autoLockMinutes`, and the Phase 5 index rule.
2. Add migration `0011` and the `VaultKeyState` module with key-wrap tests.
3. Build the lock gaps: `lock_vault`, `LockProvider`, the navbar button, the auto-lock setting and timer, and the single-command password change.
4. Build field and file encryption: enable, disable, read and write paths, the `item_secrets` join, trashed-row coverage, and the rule that enable needs a stored lock.
5. Write Rust tests for lock, key change, encryption round trips, and at-rest inspection of live and trashed rows.
6. Write the encryption design note (key wrap, nonce rules, index rule, temp-file limit) and complete the external security review before the gate.
7. Build backup: staging, manifest with SHA-256 hashes, `VACUUM INTO`, the conflict rule, and `inspect_backup`.
8. Build restore: validation, safety copy, key reset, connection swap, reopen, rollback, and `RestoreSummary`.
9. Write Rust tests for backup, inspect, restore, corruption, and the R-029 round trip.
10. Build the Settings cards, the restore dialog, and the lock UI on existing HeroUI parts.
11. Build import and export with the metadata mapping and the loss list.
12. Wire the Phase 5 index rule: delete `item_search` rows on enable, mark protected items dirty on disable, and let `index_state.status` drive the rebuild.
13. Run the automated gates and the manual desktop round trip.
14. Write the gate evidence and update the roadmap statuses R-133 to R-162 and R-029.

## Verification

| Check | Command | Pass condition |
|---|---|---|
| Rust tests | `cargo test` in `src-tauri` | Existing tests plus lock, key, encryption, backup, restore, corruption, export, and import tests pass |
| Rust lint and format | `cargo clippy --all-targets -- -D warnings`; `cargo fmt --check` | No warnings; clean formatting |
| Types | `pnpm typecheck` | No errors |
| Frontend tests | `pnpm test --run` | Existing tests plus lock provider, Settings cards, restore dialog, and import/export tests pass |
| Build | `pnpm build` | Production build succeeds |
| Desktop round trip | `pnpm tauri dev` | Lock and unlock by hand; auto-lock fires; turn encryption on, edit, reopen, unlock; create a backup; restore it; export and import |
| At-rest check | Read `kivo.db` and `files/` with a SQLite browser and a hex viewer | Protected fields and file bytes show no plaintext while encryption is on; the raw Master Password appears nowhere |
| Upgrade check | Start over a version 10 database | Migration `0011` runs, existing content stays readable, and no lock or encryption turns itself on |

## Risks

- Lock is interface-level. Rust commands stay callable while the app is locked; encrypted reads fail without the key, plain fields do not. The plan states this boundary (R-137) and does not claim full protection.
- Restore swaps the live database. The safety copy, the close path, and a rollback when the swap fails mid-way must be tested on Windows.
- Enabling encryption touches every file. The pass is retry-safe, but a crash leaves staging state. The UI must report the last successful step.
- Auto-lock and autostart can open a locked window. This is acceptable and matches the lock design.
- Opening an encrypted file writes a decrypted temp copy for the OS opener. That copy sits outside the vault. The encryption card names this.
- SHA-256 hashes detect corruption, not tampering. A backup folder is plain, so anyone who can rewrite it can rewrite the manifest too. The plan claims corruption detection only.
- Markdown loses rich formatting, file bytes, and exact timestamps. The export UI must list these losses (R-161).
- The plain-browser preview cannot call the new commands. Acceptance is `pnpm tauri dev`.

## Open questions (recommended answers)

1. **What happens when the owner forgets the Master Password (Q-06)?** Recommended: no recovery. The verifier is one-way, and encrypted content stays unreadable. Warn plainly when setting a password and on the encryption card.
2. **Which data is encrypted (Q-07)?** Recommended: opt-in, off by default. Protect `description`, `content`, `url`, and managed file bytes. Keep `title`, tags, kind, dates, collection, and favorite state plaintext, so lists and the full-text index keep working.
3. **Which library and key design (Q-08)?** Recommended: reuse `argon2` (Argon2id) for the KEK; add one crate, `aes-gcm`, for AES-256-GCM; use `sha2` for manifest hashes, since it is already in `Cargo.lock`; wrap one random vault key; use a fresh random nonce per value; write the design and get an external review before release.
4. **Backup format, destination, and schedule (Q-09)?** Recommended: a folder with `manifest.json`, the `VACUUM INTO` snapshot, and `files/`; the owner chooses the destination; manual only, automatic off and not built.
5. **How are restore conflicts shown (Q-10)?** Recommended: replace, never merge. Validate first. When the current vault has data, require "Replace my vault" and write a safety copy first.
6. **Which formats first (Q-11)?** Recommended: import Markdown notes and Kivo JSON; export a note to Markdown, an item or collection to JSON, and the full vault to JSON plus a `files/` folder. Document every loss.
7. **Q-05 note:** Windows stays the first target; paths, dialogs, and temp files use OS-safe APIs.

## Execution workflow (after approval)

- Model: `commandcode/deepseek-v4.1-flash` (Default Reasoning) for all execution agents. Max Reasoning is not used after planning.
- Wait for Phase 5, or move this phase to the next free migration number. Phase 5 owns `0010`; this phase writes `0011`.
- Parallel workstreams: (A) lock gaps and encryption commands with tests, (B) backup and restore commands with tests, (C) Settings cards and lock UI, (D) import and export commands and UI, (E) a testing sub-agent writing data and page tests while the others work.
- One compile-and-check pass after the streams merge, then the manual desktop round trip on Windows.
- Gate evidence: `docs/verification/phase-6-protection-and-portability-gate.md`.
- Roadmap updates: R-133 to R-162 statuses and the R-029 completion in `docs/Kivo-Workflow/05 - ROADMAP.md`.
