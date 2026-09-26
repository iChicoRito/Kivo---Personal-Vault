# Kivo Phase 7 — Optional Advanced Features

> **Visual review:** [Open interactive plan](https://plan.agent-native.com/_agent-native/open?app=plan&view=plan&to=%2Fplans%2Fplan-3531fbfb2b7149ce&planId=plan-3531fbfb2b7149ce&agentSidebar=closed) (plan-3531fbfb2b7149ce)

**Status: planned on 24 September 2026. Nothing is built yet. Phase 5 and Phase 6 run first, then this plan.**

Planning session: `commandcode/deepseek-v4.1-flash#max` (Max Reasoning). Exploration sub-agents: `commandcode/deepseek-v4.1-flash#high` (High Effort). Execution must use `commandcode/deepseek-v4.1-flash` (Default Reasoning) only.

## Goal

Phase 7 adds three optional features on top of the finished core vault: related search, tag suggestions, and note summaries. All three run on the local machine. All three are off by default. None of them change the owner's content on its own.

**Done when:** The owner can turn each feature on in Settings; related search returns a ranked list of the owner's own items with the matched terms shown; the item dialog and the note tag field show tag suggestions that only land after a click; the note sidebar builds a summary, copies it, and saves it as a new note on request; and every core flow still works with all three off.

## Scope decisions

- **Local lexical relatedness, not an embedding model.** No ML runtime and no new dependency. Pure Rust plus SQLite. The code compares weighted terms. It finds items that share words. It does not understand meaning the way a trained model does. The plan says this plainly and keeps the Q-13 boundary.
- **Roadmap name: Semantic Search. UI name: Related search.** The UI never claims to be an AI. Each surface states that processing happens on this device.
- **Derived data only, plus the owner's own saves.** A new table `item_vectors` holds the top weighted terms for each item. Phase 7 adds no new write path to `items`, `files`, `collections`, or `activity`. Its two possible writes both follow an explicit owner click: accepting a tag suggestion uses the existing `setItemTags` path, and Save as note uses the existing note creation command (`saveItem`), which writes one `items` row and one `activity` row. Deleted items cascade their vector rows (`ON DELETE CASCADE`, foreign keys already on).
- **Off means off.** All three preference flags default to 0. When a feature is off, its command returns an empty result, its UI hides, and no row is written. Turning Related search off clears `item_vectors` in the same transaction.
- **Index lazily.** Every item save already sets `index_state.needs_index` (`upsert_index_state`, `src-tauri/src/vault.rs:191`; save path `:686`). A related search refreshes pending rows before it scores. "Re-index now" in Settings does the same on demand. There is no background job and no timer.
- **Phase 5 by reference.** Phase 5 full-text indexing and PDF text are unbuilt. Phase 7 reads `items.title`, `items.description`, and `items.content` (HTML stripped for notes). Files stay out of all three features until Phase 5 lands. The plan does not claim file or PDF sources.
- **Phase 6 by reference.** Phase 6 encryption is unbuilt. When Phase 6 encrypts content, the reindex path must read decrypted content in memory through whatever read path Phase 6 provides. `item_vectors` holds derived weights, not secrets. Until Phase 6 lands, the plaintext columns are read directly.
- **Suggestions and summaries never write by themselves.** Accepting a suggestion appends through the existing `setItemTags` → `replace_item_tags` path. The summary stays transient until the owner presses Save. Manual tags stay authoritative; no Phase 7 code removes or replaces a tag.
- **One Rust module and one data module.** New file `src-tauri/src/insights.rs` holds the tokenizer, one `strip_html_to_text` helper, vectors, scoring, suggestions, and summary. New file `src/data/insights.ts` holds the typed wrappers. Everything else is an edit to an existing file.
- **Frontend parts come from the repo.** HeroUI v3 `Card`, `Switch`, `Chip`, `Button`, `Typography`, and the shared toasts (`src/lib/feedback.ts`). The filter row reuses `FilterMenu` (`src/components/items/FilterMenu.tsx`).

**Not built:** cloud or remote AI of any kind, API keys, RAG, vault assistant, chat Q&A, generative answers, bundled LLMs, embedding runtimes, GPU stacks, cloud sync, paywall, web backend, remote auth, secrets manager. The "Deliberately left out" table in [05 - ROADMAP](../Kivo-Workflow/05%20-%20ROADMAP.md) keeps those exclusions.

## Phase 5 and Phase 6 at planning time

Both phases are unbuilt. Phase 7 stays correct before they exist and does not claim their features.

| Assumed phase | What it owns | What Phase 7 assumes | How Phase 7 stays correct now |
|---|---|---|---|
| Phase 5 | Full-text index and PDF text extraction | Extracted file text can join the term source later | Phase 7 reads `items.title`, `items.description`, and `items.content` only. Files return empty from all three features. |
| Phase 6 | Encryption | A decrypted read path for reindex and search | Phase 7 reads whatever the content read path returns. `item_vectors` holds derived weights, is rebuilt on demand, and is deleted when the feature is off. |

## Supported content by feature

| Feature | Notes | Sources (links) | Files |
|---|---|---|---|
| Related search | Title, description, body (HTML stripped) | Title and description only | No vector until Phase 5 |
| Tag suggestions | Title and body | Title and description | Empty until Phase 5 |
| Summaries | Body sentences | Empty in Phase 7 | Empty until Phase 5 |

Sources contribute title and description only; the stored `url` is not a term source. Manual tags add the tag term weight on every item that has tags. Trashed items are never scored and never suggest tags. Both paths filter on `items.deleted_at IS NULL`.

## Capability coverage

| Capability | What Phase 7 adds | Proof |
|---|---|---|
| R-163 Semantic Search | One `item_vectors` row per supported item. Notes use title, description, and body (HTML stripped); sources use title and description. Files only after Phase 5. | Tokenizer and vector unit tests in `insights.rs`; the code path has no HTTP client |
| R-164 Semantic Search | `search_related_items` ranks live items by shared term weight and returns each hit with its top matched terms. | Scoring tests with known overlaps; NavbarSearch test shows the related group and its context |
| R-165 Semantic Search | Related results take the existing `ItemFilter` (kind, tag, collection, favorite). The dialog reuses `FilterMenu`. | Rust tests for each filter field; dialog test with one filter applied |
| R-166 Semantic Search | Saves already set `needs_index`. A related search refreshes pending rows first, and Settings has "Re-index now". | `reindex_items` tests; Settings test for the button |
| R-167 Semantic Search | Default off. Settings switch, index status line, and an "on this device" label on results. Off = empty command result and no UI. | Off-path tests: metadata search unchanged, no related block, no vector writes |
| R-168 Automatic Tagging | `suggest_tags` returns up to five frequent terms from the item's own text, minus names the item already uses. | Suggestion tests on notes and sources; empty result for files |
| R-169 Automatic Tagging | `TagSuggestions` shows each name as a chip with Add and dismiss. Add appends to the current list; the existing save path writes. | Component tests: accept appends; dismiss and no click write nothing |
| R-170 Automatic Tagging | Suggestions compare against live tags case-insensitively and reuse the existing spelling. Duplicate names never appear. | Tests with mixed-case existing tags and repeated terms |
| R-171 Automatic Tagging | Accept only appends. No Phase 7 command removes or replaces a tag. Manual tags load unchanged. | Rust test proves `replace_item_tags` stays the only tag write |
| R-172 Automatic Tagging | Default off. With the switch off, no suggestion UI renders and `suggest_tags` returns empty. | Off-path tests |
| R-173 Document Summaries | `summarize_item` scores the note's own sentences with the same term weights and returns the best few in reading order. | Summary tests on short, long, and empty notes |
| R-174 Document Summaries | `SummaryCard` in the note sidebar shows the result as separate text with a Copy button. | Component test: copy reaches the clipboard and shows a toast |
| R-175 Document Summaries | Save as note calls `saveItem({ kind: 'note' })`. The source row is not written. Closing the editor discards an unsaved summary. | Test: source `updated_at` and content stay the same after a save |
| R-176 Document Summaries | Regenerate runs `summarize_item` again and replaces the on-screen text only. | Test: two runs, source untouched |
| R-177 Document Summaries | The source is read-only in this flow. The feature is off by default. The card says "Made on this device". | Off-path test; no write to the source item |

## Backend contract (Rust, new `src-tauri/src/insights.rs`, registered in `lib.rs`)

Migration `0012_phase_seven.sql`. Phase 5 owns `0010` and Phase 6 owns `0011` in the current order. Take the next free number if execution order differs.

```sql
ALTER TABLE preferences ADD COLUMN semantic_search INTEGER NOT NULL DEFAULT 0 CHECK (semantic_search IN (0, 1));
ALTER TABLE preferences ADD COLUMN auto_tag INTEGER NOT NULL DEFAULT 0 CHECK (auto_tag IN (0, 1));
ALTER TABLE preferences ADD COLUMN summaries INTEGER NOT NULL DEFAULT 0 CHECK (summaries IN (0, 1));

CREATE TABLE IF NOT EXISTS item_vectors (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  terms TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Register the migration in `src-tauri/src/database.rs`: add a version 12 entry and an `include_str!("../migrations/0012_phase_seven.sql")` constant to `MIGRATIONS` (`:29`), following the 0009 pattern (`:20`).

Preferences changes in `src-tauri/src/database.rs`: the `Preferences` struct (`:100`) gains three bool fields; `read_preferences` (`:429`) and `write_preferences` (`:446`) gain three columns; `validate_preferences` (`:271`) needs no new value checks for booleans. When `semantic_search` flips from 1 to 0, `write_preferences` runs `DELETE FROM item_vectors` in the same transaction.

| Command | Change | Contract |
|---|---|---|
| `search_related_items(input)` | new | Tokenizes the query, refreshes pending vectors when the feature is on, scores live items that share terms, applies the `ItemFilter` fields kind, tag, collectionId, and favorite, and returns up to the limit ordered by score. The `query` and `trashed` filter fields are ignored, and trashed items are always excluded. Feature off → empty list. |
| `reindex_items()` | new | Rebuilds `item_vectors` for rows marked `needs_index` or missing a vector row, then clears the flag and stamps `indexed_at`. Returns `{ indexed, pending }`. Feature off → `{ 0, 0 }` and no writes. |
| `suggest_tags(itemId)` | new | Returns up to five frequent terms from the item's own text minus tags it already has. Files return empty until Phase 5. Feature off → empty. |
| `summarize_item(itemId)` | new | Returns the best few sentences of a note in reading order. Notes only in Phase 7. Feature off → empty. |

Key Rust shapes:

```rust
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelatedSearchInput {
    pub query: String,
    pub filter: Option<ItemFilter>, // kind, tag, collectionId, favorite; query and trashed are ignored
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RelatedResult {
    pub item: ItemSummary,
    pub score: f64,
    pub matched_terms: Vec<String>, // up to three, for result context
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReindexReport { pub indexed: usize, pub pending: usize }

// suggest_tags returns Vec<String>.
// summarize_item returns Vec<String> (sentences).

// `terms` is JSON: [["budget", 1.0], ["invoice", 0.62], ...] — top 64 by weight.
```

Scoring rules, kept small and testable:

- Tokenize: lowercase, split on non-alphanumeric characters, drop stopwords and one-character tokens. One built-in stopword list in Rust, no dependency.
- Weight: title terms ×3, tag terms ×2, description ×1, body ×1. Normalize against the item's strongest term and keep the top 64 terms.
- Score: sum the item weights of the query terms it has. Drop zero scores. Break ties by `updated_at` DESC. Reuse the existing result limit of 8 in the dialog.
- No stemming and no synonyms. The dialog says "Matches shared words" so the result is honest.
- Summary: split on sentence enders and newlines, score each sentence by its term weights, take up to five, and restore reading order.
- Suggestions count the one item's terms with the same tokenizer and scoring code. They never read `item_vectors`, never write a vector row, and never depend on the Related search switch.

## Frontend changes

- `src/data/insights.ts` (new): typed wrappers for the four commands.

```ts
export type RelatedResult = { item: ItemSummary; score: number; matchedTerms: string[] }
export async function searchRelatedItems(query: string, filter?: ItemFilter): Promise<RelatedResult[]>
export async function reindexItems(): Promise<{ indexed: number; pending: number }>
export async function suggestTags(itemId: string): Promise<string[]>
export async function summarizeItem(itemId: string): Promise<string[]>

// settings.ts — the Preferences type gains three fields, all default false:
export type Preferences = { ...; semanticSearch: boolean; autoTag: boolean; summaries: boolean }
```

- `src/app/NavbarSearch.tsx` (modified): when `preferences.semanticSearch` is on, the dialog adds a "Related on this device" group under the exact matches. Load `listTags()` and `listCollections()` for `FilterMenu`. Each row shows title, kind, and matched terms, and opens through the existing `ItemDetailsDialog`. The group carries the line "Matches shared words. No text is generated."
- `src/components/items/TagSuggestions.tsx` (new): loads `suggestTags(itemId)` when `preferences.autoTag` is on. Renders a muted "Suggested on this device" label and one `Chip` per name with an Add `Button` and a dismiss control. Add dedupes case-insensitively against the current list and reuses an existing tag spelling, then calls the caller's `onChange`. Suggestions never enter the checkbox value directly and never write by themselves.
- `src/components/items/dialogs.tsx` (modified): `TagPicker` renders `TagSuggestions` under the checkbox group (`:143`).
- `src/features/notes/NoteTagField.tsx` (modified): renders `TagSuggestions` under the tag chips (`:69`).
- `src/features/notes/SummaryCard.tsx` (new): a HeroUI `Card` with a "Summarize" button, the sentence text, Copy, "Save as note", and Regenerate. Copy uses `navigator.clipboard.writeText` (the pattern in `src/app/StatusScreen.tsx:83`). Toasts come from `src/lib/feedback.ts`. Saving wraps the plain text with `toEditorHtml` (`src/features/notes/noteContent.ts:24`) and calls `saveItem({ kind: 'note', title: 'Summary — <title>' })`. The card states "Made on this device. Your note is not changed."
- `src/features/notes/NoteEditor.tsx` (modified): renders `SummaryCard` in the right rail under the settings aside, above Delete Note (`:457-479`), only when the note is saved and `preferences.summaries` is on.
- `src/features/settings/SettingsPage.tsx` (modified): one "Advanced features" `Card` under the existing stacked cards, with three `Switch` rows in the pattern at `:555-583`, the Q-14 sentence, an index status line ("Index: N items ready, M waiting.") built from the existing `listIndexState()` wrapper (`src/data/activity.ts:20`) as the single source of truth, and a "Re-index now" `Button` that hides or disables when the Related search switch is off. Add the three fields to `RESET_PREFERENCES` (`:54`) as false.
- `src/data/settings.ts` (modified): three booleans in the `Preferences` type.
- `src/app/preferences.tsx` (modified): three booleans in `DEFAULT_PREFERENCES` (`:32`) and in `normalizePreferences()` (`:95`), which rebuilds every field.
- `src/data/browser.ts` (modified): three booleans in its own `DEFAULT_PREFERENCES` (`:14`) for the browser preview.
- `src/test/settings.test.tsx` (modified): three booleans in the `PREFERENCES` (`:55`) and `RESET_PREFERENCES` (`:64`) fixtures.

Copy for the three switches, kept short and honest:

- Related search: "Ranks your items when they share words with the search. Runs on this device. No AI model and no network."
- Tag suggestions: "Suggestions are created on this device; nothing is sent anywhere." (the Q-14 answer)
- Note summaries: "Picks the most representative sentences from a note. Made on this device. A summary is only kept if you save it."

## How each flow works

**Related search.** The owner opens the search dialog (Ctrl+K) and types. Exact matches show as today. When the switch is on, a "Related on this device" group appears under them. Each row shows the title, the kind, and the terms that matched. The owner can narrow the group with `FilterMenu`. Opening a row uses the existing `ItemDetailsDialog`. Nothing in this path writes.

**Tag suggestions.** The owner opens a note or an item dialog. When the switch is on, a small "Suggested on this device" row appears under the tag controls. Each suggestion is a `Chip` with Add. Add appends to the current list and the existing save path runs. A dismiss removes that one suggestion from the row. No suggestion enters the tag list on its own.

**Summary.** The owner opens a saved note and presses "Summarize" in the sidebar card. The card shows the sentences as separate text with "Made on this device. Your note is not changed." Copy writes the text to the clipboard. Save as note creates a new note and leaves the source alone. Regenerate replaces the on-screen text. Closing the editor without saving discards the text.

## Work plan

1. Freeze the contract: migration number, the four command names, payload shapes, and the three preference fields.
2. Write `0012_phase_seven.sql`, register it in `MIGRATIONS` with an `include_str!` constant in `database.rs`, and extend the `Preferences` struct, read, write, and the off-switch `DELETE FROM item_vectors`.
3. Write `insights.rs`: tokenizer, `strip_html_to_text`, vector build, scoring, suggestions, and summary.
4. Add the four commands and register them in `lib.rs`.
5. Write Rust tests for every command, every filter field, every off path, and `strip_html_to_text` (nested tags and entities).
6. Extend `settings.ts`, `preferences.tsx` (`DEFAULT_PREFERENCES`, `normalizePreferences()`), `src/data/browser.ts`, the reset list in `SettingsPage.tsx`, and the `src/test/settings.test.tsx` fixtures with the three booleans.
7. Add `insights.ts`.
8. Build `TagSuggestions` and wire it into `TagPicker` and `NoteTagField`.
9. Build `SummaryCard` and wire it into `NoteEditor.tsx`.
10. Extend `NavbarSearch.tsx` with the related group and `FilterMenu`.
11. Add the "Advanced features" Card to `SettingsPage.tsx`.
12. Run the automated gates and the manual desktop round trip.
13. Write the gate evidence and update roadmap statuses R-163 to R-177.

## Verification

| Check | Command | Pass condition |
|---|---|---|
| Rust tests | `cargo test` in `src-tauri` | Existing tests pass plus new tokenizer, `strip_html_to_text` (nested tags and entities), vector, scoring, reindex, suggestion, summary, and off-path tests |
| Rust lint and format | `cargo clippy --all-targets -- -D warnings`; `cargo fmt --check` | No warnings; clean formatting |
| Types | `pnpm typecheck` | No errors in the test project |
| Frontend tests | `pnpm test` | New `insights-data` and component tests pass; existing suites stay green |
| Build | `pnpm build` | Production build succeeds |
| No new dependency | Read `src-tauri/Cargo.toml` and `package.json` | The dependency lists are unchanged |
| Desktop round trip | `pnpm tauri dev` | Turn each switch on; run a related search with and without a filter; accept and reject suggestions; summarize, copy, regenerate, save as note, and confirm the source note is unchanged; run Re-index now |
| Off check | Same desktop build | With all three off: metadata search unchanged, no related group, no suggestion chips, no summary card, Settings shows three off switches |
| Upgrade check | Start the build over the latest pre-Phase-7 database | Migration 0012 runs once; all preferences and items survive |

## Risks

- **"Semantic" is a stretch.** With weighted words, the feature finds shared vocabulary, not deep meaning. The UI labels the feature "Matches shared words" and states that it compares words, which keeps the Q-13 boundary. True semantics would need a new decision and a new dependency.
- **Phase 5 and Phase 6 are unbuilt.** Files stay out of all three features until Phase 5 lands. If Phase 6 encrypts content first, reindex must read through the Phase 6 read path. The plan states both assumptions instead of hiding them.
- **Linear scan over vectors.** Fine for a personal vault. A very large vault would need a different index; this is a stated limit, not a build item.
- **Inline tags leave no tag table.** Migration 0009 is one-way. All dedupe compares against `items.tags` and `list_tags`, both already live.
- **`pnpm dev` cannot call the new commands.** The plain-browser preview shows error states. `pnpm tauri dev` is the acceptance path.
- **The manual desktop pass is required.** Record it as open if it does not run.

## Open questions (recommended answers)

1. **Q-13 — Where is the line between optional Semantic Search and the excluded AI Search?** Recommended: semantic search is offline ranking of the owner's own items; it returns existing items to open; it never generates prose, never answers questions, and never calls a model or network. Boundary test in one line: **new written text answering a question is excluded AI Search; a ranked list of existing items is allowed Semantic Search.**
2. **Q-14 — What local processing is allowed for Automatic Tagging?** Recommended: read only the item's title and body, compute on this device, infer tags by term frequency and keyword extraction, reuse the R-163 tokenizer and scoring code, read existing tags only to avoid duplicates and reuse a spelling, and state in Settings "Suggestions are created on this device; nothing is sent anywhere." Suggestions only; never applied.
3. **Q-15 — What processing and retention rules apply to Document Summaries?** Recommended: local extractive summarization (score and select representative sentences with the same local scoring); no cloud model and no bundled LLM; the summary is transient until the owner saves it; saving creates a normal note; closing without saving discards it; nothing is stored against the source.
4. **Q-05 — Desktop systems.** Implement and verify on Windows first; other systems wait for their own pass.

## Execution workflow (after approval)

- Model: `commandcode/deepseek-v4.1-flash` (Default Reasoning) for all execution agents.
- Parallel workstreams: (A) migration, preferences, and the `insights.rs` core with Rust tests, (B) `insights.ts`, settings data, and the Settings card, (C) tag suggestion and summary UI, (D) the search dialog group plus frontend tests written alongside.
- One compile-and-check pass after the streams merge, then the manual desktop round trip on Windows.
- Gate evidence: `docs/verification/phase-7-optional-advanced-features-gate.md`.
- Roadmap updates: R-163 to R-177 statuses and the Phase 7 coverage table in `docs/Kivo-Workflow/05 - ROADMAP.md`.
