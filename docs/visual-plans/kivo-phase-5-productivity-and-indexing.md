# Kivo Phase 5 - Productivity and Indexing

> **Visual review:** [Open interactive plan](https://plan.agent-native.com/_agent-native/open?app=plan&view=plan&to=%2Fplans%2Fplan-1ff6d8224be24a8f&planId=plan-1ff6d8224be24a8f&agentSidebar=closed) (plan-1ff6d8224be24a8f)

**Status: planned on 24 September 2026. Not implemented. All work waits for approval. Open questions carry one recommended answer each. Migration `0010` belongs to Phase 5.**

Planning session: `commandcode/deepseek-v4.1-flash#max` (Max Reasoning). Exploration sub-agents: `commandcode/deepseek-v4.1-flash#high` (High Effort). Execution must use `commandcode/deepseek-v4.1-flash` (Default Reasoning) only.

---

## Goal

Phase 5 adds the productivity and indexing surfaces that earlier phases left out. The owner can preview managed files, read a storage report, search note bodies and PDF text, drive the vault from the keyboard, review activity history, and recover earlier note versions. Every path stays local. No network call joins the flow.

**Done when:** Images, PDFs, Markdown, and text files preview inside Kivo. Unsupported types show a clear fallback and an external-open action. The storage manager reports total use, database size, file size, file count, type groups, and the largest files. Search returns indexed note and PDF matches with highlighted terms through the navbar surface. The palette and the fixed shortcut set run the named actions. Activity History shows dated local rows and clears on confirmation. Note versions snapshot, list, restore, and prune. Migration `0010` applies cleanly over a version 9 vault.

## Scope decisions

- **One migration, `0010_phase_five.sql`.** It adds the FTS5 table `item_search`, the `item_versions` table, one `status` column on `index_state`, and the index for `item_versions`. The inline `items.tags` array from migration `0009` stays as it is. The removed `tags` and `item_tags` tables do not return.
- **Search keeps one entry point.** `list_items(filter)` stays the single search command. When a query is present, Rust merges FTS5 matches for note bodies and indexed PDF text with the existing `LIKE` matches, and it ranks FTS matches first when the caller keeps the default relevance order. An explicit sort keeps its chosen order. The navbar search dialog adds the type filter and shows match snippets.
- **Preview is read-only.** A new `read_item_file(id)` command reads the managed copy. It never writes bytes, names, or metadata. Text returns as text. Image and PDF bytes return as base64 and render through `data:` and `blob:` URLs. The CSP gains `frame-src 'self' blob:` for the PDF frame. The existing external-open action stays.
- **PDF text comes from `pdf-extract`.** This is the only new package. It is pure Rust, so it needs no system library. OCR stays out of Phase 5. An image-only PDF shows a not-indexed state.
- **Indexing runs off the UI thread.** Import starts extraction on a blocking worker outside the database mutex. `index_state.status` carries `pending`, `indexed`, `no_text`, or `failed`. The interface shows the state and stays responsive.
- **Version history covers notes only.** `item_versions` stores title, content, and timestamp. Large binaries are never versioned. A save snapshots the previous content when the content changed and the newest snapshot is at least five minutes old. Restore writes the current content as a version first. Each item keeps at most 20 versions.
- **Shortcuts come from one map.** `src/app/shortcuts.ts` defines the fixed set. `Ctrl+K` moves from `NavbarSearch` to the palette. Search takes `Ctrl+F`. The handler accepts `ctrlKey` or `metaKey` for every binding.
- **Activity History owns clear history.** The Recent page is deleted, so R-088 re-scopes to Activity History. `clear_activity()` deletes `activity` rows only. Items never change.
- **Phase 6 boundary.** The full-text index stores only content that Phase 5 can read. When Phase 6 turns encryption on, protected content must stay out of the index until the app can read it again. Phase 5 does not build encryption. It records the constraint.
- **No new UI library.** The palette, dialogs, and pages use HeroUI v3 parts already in the repo, plus the shared `ConfirmDialog` from `src/components/items/dialogs.tsx`.

**Not built:** OCR, semantic search, embeddings, automatic tagging, summaries, encryption, vault lock, backup and restore, import, export, cloud, and AI search.

## Capability coverage

| Capability | What Phase 5 adds | Proof |
|---|---|---|
| R-096 Preview images and PDFs | `FilePreviewDialog` renders an image from a `data:` URL and a PDF from a `blob:` iframe. | `read_item_file` command test plus preview component test |
| R-097 Preview Markdown and plain text | The same dialog returns `.md` and `.txt` content as read-only text. | Preview component test with a text file |
| R-098 Clear fallback for unsupported types | The dialog shows the file name, the reason, and the external-open action instead of a broken frame. | Preview component test for an unsupported type |
| R-099 Open a file externally | Open and Reveal stay in the preview footer and in the fallback. | Existing `open_item_file` tests plus dialog action test |
| R-100 Show file details without modifying the original | The footer shows original name, type, size, and import date. The read path runs no write statement. | Rust test for the read-only path plus metadata render test |
| R-101 Show total, database, and file size | `StorageManagerPage` shows total use, database bytes, and managed-file bytes. Total is database bytes plus file bytes. | Storage report command test plus page test |
| R-102 Show count, largest files, and type groups | The page adds the file count, groups (Images, PDFs, Text, Other), and a 10-row largest-files list. | Command test for groups and order plus page test |
| R-103 Open relevant items from storage results | Each row opens its item through the shared `ItemDetailsDialog`. A missing item shows the existing missing-file state. | Page test with an open action |
| R-104 Keep reporting read-only unless cleanup is chosen | Viewing changes nothing. The largest-file rows run Move to Trash through `ConfirmDialog` and the existing trash command. | Page confirmation test plus command test without the action |
| R-105 Index note content locally | Migration `0010` adds the FTS5 table. Saving a note writes plain text stripped from the TipTap HTML. | Migration test plus save test with an index row assertion |
| R-106 Search note bodies and other indexed text | `list_items` merges FTS matches, so a body-only word returns its note or indexed PDF. | Command test with a body-only word |
| R-107 Return relevant matches with highlighted terms | FTS rows carry a `matchSnippet`. The dialog keeps the default relevance order and wraps the entered terms in `<mark>`. | Command test for the snippet plus component test for the highlight |
| R-108 Update the index when content changes | Saving a note deletes and rewrites its index row. An unchanged save writes nothing new. | Save-twice test |
| R-109 Keep the index synchronized | Rename rewrites the index title. A missing or removed file drops its row. Soft-deleted items leave active search. | Tests for rename, missing file, and trash |
| R-110 Remove deleted items from the index | Trash hides items from search. Permanent deletion removes the index row before the item row. | Search tests after trash and after permanent delete |
| R-111 Open the palette with Ctrl+K or the fixed shortcut | `CommandPalette` opens from anywhere. `NavbarSearch` gives up `Ctrl+K`. | Shortcut handler test |
| R-112 Search pages, modules, and vault items | The palette searches `navigationGroups` and vault items from `listItems`. | Palette test with a page query and an item query |
| R-113 Run common actions | The palette runs the fixed command list: New Note, Add File, Save Link, Create Collection, Open Settings, Open Storage Manager, Show Shortcuts, Go to each module, Toggle Favorite, Move to Trash, Clear History. | Command wiring tests |
| R-114 Hide or disable unavailable actions | Commands declare when they apply. Item commands stay hidden until a detail view or a selected item exists. | Palette test for the hidden state |
| R-115 Navigate fully by keyboard | Arrow keys move the highlight, Enter runs, Escape closes, and the first result starts selected. | Keyboard navigation test |
| R-116 Shortcuts for search, palette, new note, and Quick Add | The fixed map adds `Ctrl+F`, `Ctrl+K`, `Ctrl+N`, and `Ctrl+Shift+N`. | Shortcut map test plus handler tests |
| R-117 Shortcuts for favorite, Trash, and navigation | `Ctrl+D` toggles favorite. Module shortcuts use `Ctrl+1` to `Ctrl+6` for Dashboard, All Items, Notes, Sources, Files, and Collections. Trash, Storage, Activity, and Settings carry no number key. | Handler tests for favorite and module keys |
| R-118 Show a shortcuts reference | `ShortcutsDialog` lists every binding. The palette and Settings open it. | Dialog test |
| R-119 Avoid OS conflicts and confirm destructive shortcuts | The fixed set avoids documented Windows conflicts. Move to Trash and Clear History use the same `ConfirmDialog` as the mouse path. | Handler test plus confirmation test |
| R-120 Record creation, updates, moves, restores, and imports | Existing writers cover created, updated, trashed, restored, and imported. A new `moved` writer covers collection moves. Rows hold ids and actions only. | Command tests for each writer |
| R-121 Display activity by date | `ActivityPage` groups rows into Today, Yesterday, and dated groups. | Page grouping test |
| R-122 Open a referenced item while it exists | Live rows open the item. Rows for trashed or missing items stay disabled and show the state. | Page test for both states |
| R-123 Keep history local, omit sensitive content, degrade deleted references | History stays in the local database and stores no note content and no passwords. Missing references show a clear state. | Schema test plus page test |
| R-124 Detect supported PDFs and extract text locally | Import of a `.pdf` file starts `pdf-extract` on a blocking worker. Text lands in `item_search`. Image-only PDFs get `no_text`. | Rust test with one text PDF fixture and one image-only fixture |
| R-125 Store searchable PDF text and keep it current | The index row is written once at import. Phase 5 assumes the bytes of the managed copy do not change. A rename or a move changes only the name or the location. Re-import is the update path for changed content, and it creates a new item and a new index row. | Import test |
| R-126 Return PDF matches through Kivo Search | PDF matches come through `list_items` like note matches and carry the same snippet. | Command test with a PDF-only word |
| R-127 Handle image-only PDFs gracefully | The preview footer and file details show "No searchable text in this PDF". Extraction reads the managed copy only. | Test for the `no_text` state |
| R-128 Index large PDFs without freezing the UI | Extraction runs async with a `pending` status and one completion event. The interface never blocks. | Status flow test plus event test |
| R-129 Create versions after meaningful note edits | A save snapshots the previous content when the content changed and the newest snapshot is old enough. | Save test for both rule branches |
| R-130 Show versions and timestamps | `VersionHistoryDialog` lists versions newest first with timestamps and a read-only preview. | Dialog test |
| R-131 Restore a version with a recoverable state | Restore writes the current content as a version, then writes the chosen content. The editor reloads. | Restore test |
| R-132 Limit and prune history, never version binaries | One note keeps 20 versions, and insert prunes the oldest. The snapshot path checks that the item kind is note. | Prune test plus binary guard test |
| R-072 Quick Add from shortcut or palette | The palette holds a Quick Add command. `Ctrl+Shift+N` opens the existing `QuickAddDialog` choices. | Palette test plus shortcut test |
| R-080 Search type filter | The navbar dialog adds All, Note, Source, and File. The choice passes to `listItems` as `kind`. | Data test plus search dialog test |
| R-083 Indexed results through the same search | Indexed note and PDF matches appear in the same result list with snippets. They rank first when the caller keeps the default relevance order. | Command test plus search dialog test |
| R-088 Open a recent-style item and clear history | Activity History opens surviving items and clears rows behind `ConfirmDialog`. It removes activity rows only. | Command test plus page test |

## Backend contract (Rust, `src-tauri/src/vault.rs`, registered in `src-tauri/src/database.rs` and `lib.rs`)

### Migration `0010_phase_five.sql`

```sql
CREATE VIRTUAL TABLE item_search USING fts5(
  item_id UNINDEXED, kind UNINDEXED, title, body,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TABLE item_versions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

ALTER TABLE index_state ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
UPDATE index_state SET status = 'indexed' WHERE indexed_at IS NOT NULL;

CREATE INDEX item_versions_item_idx ON item_versions (item_id, created_at DESC);
```

Add one guard test that creates a temporary FTS5 table. The bundled `rusqlite` build compiles FTS5, so the test passes today. If the test fails, stop and report before any UI work. Do not switch SQLite crates.

Register the migration in `src-tauri/src/database.rs`: add `const PHASE_FIVE_MIGRATION: &str = include_str!("../migrations/0010_phase_five.sql");` and a `Migration { version: 10, sql: PHASE_FIVE_MIGRATION }` entry at the end of the `MIGRATIONS` array.

Preview bytes encode with the `base64` crate. Add it as a direct dependency in `Cargo.toml`. It already sits in `Cargo.lock`, so it adds no new download. `pdf-extract` is the only new package.

Phase 6 constraint for the index: write an index row only when the app can read the content. When encryption is on, skip protected items and leave them out of `item_search`.

| Command | Change | Contract |
|---|---|---|
| `list_items(filter)` | changed | A query also matches `item_search` rows for notes and indexed PDFs. FTS matches rank first when the caller keeps the default relevance order, and an explicit sort keeps its chosen order. `ItemSummary` gains `matchSnippet`. Trashed rows stay out. The `kind` filter already exists. |
| `read_item_file(id)` | new | Read-only preview payload for a live file item. Text previews cap at 1 MB and set `truncated`. Rejects notes, sources, missing files, and binaries over 25 MB. |
| `load_storage_report()` | new | Total bytes, database bytes, file bytes, file count, groups by type, and the largest files. |
| `list_activity()` | changed | Each row gains `itemTitle`, `missing`, and `trashed` flags. Order stays newest first. |
| `clear_activity()` | new | Deletes all `activity` rows and returns the count. It never touches items or files. |
| `save_item(input)` | changed | Writes the `item_search` row and the `index_state` row. Snapshots the previous note content under the version rule. |
| `list_item_versions(itemId)`, `restore_item_version(versionId)` | new | Lists versions newest first. Restore writes a pre-restore version, then updates the note. |
| `index_file(itemId)` | new | Retry path for a PDF that stayed `pending` or `failed`. The import path calls the same worker. It extracts text outside the database mutex, takes the lock only for the final index write, then emits one completion event. |
| `move_items_to_collection(ids, collectionId)` | changed | Writes one `moved` activity row per item. |
| `delete_items_permanently(ids)` | changed | Deletes the matching `item_search` rows before the item rows. |

Key Rust shapes:

```rust
pub struct ItemSummary { /* current fields */ pub match_snippet: Option<String> }

pub struct IndexState {
    pub item_id: String,
    pub needs_index: bool,
    pub indexed_at: Option<String>,
    pub status: String, // "pending" | "indexed" | "no_text" | "failed"
}

pub struct ItemFilePreview {
    pub preview: String,                    // "image" | "pdf" | "text" | "unsupported"
    pub mime: Option<String>,
    pub text: Option<String>,               // text and Markdown
    pub payload_base64: Option<String>,     // image and PDF bytes
    pub byte_size: i64,
    pub original_name: String,
    pub imported_at: String,
    pub truncated: bool,
}

pub struct StorageReport {
    pub total_bytes: i64,
    pub database_bytes: i64,
    pub file_bytes: i64,
    pub file_count: i64,
    pub groups: Vec<StorageGroup>,          // label, count, bytes
    pub largest: Vec<StorageFile>,          // item_id, title, original_name, byte_size, imported_at
}
```

Frontend data contract:

```ts
// items.ts
export type ItemSummary = /* current fields */ & { matchSnippet?: string | null }

// files.ts
export async function readItemFile(id: string): Promise<ItemFilePreview>

// storage.ts (new)
export async function loadStorageReport(): Promise<StorageReport>

// activity.ts
export type ActivityEntry = { id: number; itemId: string | null; action: string; itemTitle?: string | null; missing: boolean; trashed: boolean; createdAt: string }
export type IndexState = { itemId: string; needsIndex: boolean; indexedAt: string | null; status: 'pending' | 'indexed' | 'no_text' | 'failed' }
export async function clearActivity(): Promise<number>

// versions.ts (new)
export async function listItemVersions(itemId: string): Promise<ItemVersion[]>
export async function restoreItemVersion(versionId: string): Promise<VaultItem>
```

## Frontend changes

- `src/app/shortcuts.ts` (new): the fixed key map and one `matchesShortcut` helper for `ctrlKey || metaKey`.
- `src/app/CommandPalette.tsx` (new): HeroUI `Modal`, `SearchField`, and `ListBox`. Groups: Actions, Go to, Items. Shortcut hints use `Kbd`.
- `src/app/AppShell.tsx` (modified): mounts the palette and the global shortcut handler.
- `src/app/NavbarSearch.tsx` (modified): drops `Ctrl+K`, focuses the field on `Ctrl+F`, adds the type filter, and renders `matchSnippet` with highlighted terms.
- `src/features/preview/FilePreviewDialog.tsx` (new): `Modal` with an image, a PDF frame, a text body, a fallback panel, and a metadata footer.
- `src/features/items/ItemDetailsDialog.tsx` (modified): adds the Preview action beside Open and Reveal.
- `src/features/storage/StorageManagerPage.tsx` (new): `Card` groups, `Chip` labels, the largest-files list, and Move to Trash.
- `src/features/activity/ActivityPage.tsx` (new): dated groups, item rows, and Clear History with `ConfirmDialog`.
- `src/features/notes/VersionHistoryDialog.tsx` (new) and `src/features/notes/NoteEditor.tsx` (modified): the History action and the restore flow.
- `src/features/shortcuts/ShortcutsDialog.tsx` (new): the reference list, opened from the palette and Settings.
- `src/app/router.tsx` and `src/app/navigation.ts` (modified): add `/storage` and `/activity` as dock entries after Trash and before Settings, with Storage Manager first. Neither entry carries a number key.
- `src/data/` (modified): `files.ts`, `activity.ts`, and `items.ts`, plus new `storage.ts` and `versions.ts`. `browser.ts` gains stubs for every new command.

## Work plan

1. Freeze the contract: migration number, table shapes, command names, `ItemSummary.matchSnippet`, `StorageReport`, version rules, and the shortcut set.
2. Write `0010_phase_five.sql`, register it in `database.rs` as version 10, and add the FTS5 guard test.
3. Extend `save_item` and `move_items_to_collection` with index writes, version snapshots, and the `moved` activity row.
4. Add `read_item_file`, `load_storage_report`, `clear_activity`, the extended `list_activity`, and the version commands.
5. Add the extraction worker and `index_file` as its retry path, with the status updates and the completion event. Add the `pdf-extract` dependency.
6. Extend `list_items` with the FTS merge, ranking, and snippet.
7. Write Rust tests for every command, the migration, the version rules, and the index lifecycle.
8. Extend the data modules, add `storage.ts` and `versions.ts`, and add the browser stubs.
9. Build `FilePreviewDialog`, `StorageManagerPage`, and `ActivityPage`. Wire the routes and navigation.
10. Build `CommandPalette`, `shortcuts.ts`, and `ShortcutsDialog`. Move `Ctrl+K` and add `Ctrl+F`.
11. Add the search type filter and snippet rendering to `NavbarSearch`. Add the version dialog and the editor action.
12. Run the automated gates and the manual desktop round trip. Write the gate evidence and update the roadmap statuses.

## Verification

| Check | Command | Pass condition |
|---|---|---|
| Rust tests | `cargo test` in `src-tauri` | All existing tests pass plus the FTS5 guard, preview, storage, activity, version, and index tests |
| Rust lint and format | `cargo clippy --all-targets -- -D warnings`; `cargo fmt --check` | No warnings. Clean formatting |
| Types | `pnpm typecheck` | No errors |
| Frontend tests | `pnpm test` | All existing tests pass plus the new data, page, dialog, and shortcut tests |
| Build | `pnpm build` | Production build succeeds |
| Desktop round trip | `pnpm tauri dev` on Windows | Preview each supported type and one unsupported file. Read the storage report. Search a note body word and a PDF word. Run palette commands. Press every shortcut. View and clear activity. Edit, restore, and prune a note version |
| Upgrade check | Start the new build over a version 9 database | Only migration `0010` runs. Vault data is unchanged |

## Risks

- No mime column and no extension column exist. Preview and storage grouping derive the type from `original_name`. A wrong extension shows the wrong group.
- The CSP must change for the PDF frame (`frame-src 'self' blob:`). Without the change the frame stays empty.
- `pdf-extract` behavior is unverified in this repo. Test with real text PDFs and image-only PDFs before the gate.
- Base64 payloads for large images and PDFs cost memory. The 25 MB cap bounds the cost. Files above the cap use the fallback.
- FTS5 comes from the bundled SQLite build. The guard test proves it at runtime.
- Extraction must run outside the database mutex. The app holds one connection behind a mutex, so a locked extraction blocks every other command. Only the final index write takes the lock.
- The working tree was moving during exploration. Read the named anchors again before coding.
- The plain browser preview cannot call the new commands. `pnpm tauri dev` is the acceptance path.
- `list_items` grows a join and a merge. Keep the existing `LIKE` path as the fallback when the FTS query fails.

## Open questions (recommended answers)

1. **Q-12: Which file types does Kivo index, and which PDF extractor is approved?** Recommended: index note bodies plus extracted text from text-based PDFs, and use the pure-Rust `pdf-extract` crate. OCR stays out of Phase 5, so an image-only PDF shows the not-indexed state.
2. **Q-16: What global shortcut and command names are fixed?** Recommended: palette `Ctrl+K`, search `Ctrl+F`, new note `Ctrl+N`, Quick Add `Ctrl+Shift+N`, favorite `Ctrl+D`, and modules `Ctrl+1` to `Ctrl+6` in navigation order (Dashboard, All Items, Notes, Sources, Files, Collections). Command names: New Note, Add File, Save Link, Create Collection, Open Settings, Open Storage Manager, Show Shortcuts, Go to `<module>`, Toggle Favorite, Move to Trash, Clear History.
3. **Q-05: Which desktop systems must the first release support?** Recommended: make sure that Windows works first, and keep every binding cross-platform with `ctrlKey || metaKey`. Test macOS and Linux at a later gate.
4. **What counts as a meaningful note edit?** Recommended: the content changed and the newest version for that note is at least five minutes old. The first content edit always snapshots.
5. **How much version history does one note keep?** Recommended: 20 versions. Insert prunes the oldest. Restore always writes the pre-restore content as a version first.
6. **What are the preview size limits?** Recommended: 25 MB for image and PDF bytes, 1 MB for text. Larger files use the fallback with the external-open action. Text over the cap shows a truncation notice.

## Execution workflow (after approval)

- Model: `commandcode/deepseek-v4.1-flash` (Default Reasoning) for all execution agents. Max Reasoning is not used after planning.
- Parallel workstreams: (A) migration, Rust commands, and Rust tests, (B) preview, storage, and activity pages plus data modules, (C) palette, shortcut map, search filter, and version dialog, (D) testing sub-agent writing data and page tests at the same time.
- One compile and test pass after the streams merge, then the manual desktop round trip on Windows.
- Gate evidence: `docs/verification/phase-5-productivity-and-indexing-gate.md`.
- Roadmap updates: R-072, R-080, R-083, R-088, and R-096 to R-132.
