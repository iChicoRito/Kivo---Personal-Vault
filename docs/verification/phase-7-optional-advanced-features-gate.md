# Phase 7 optional advanced features gate

This gate is open. The migration, preferences, four commands, and the three UI surfaces are connected and the automated suites pass. The Windows desktop round trip has not run.

Phase 7 uses migration `0013_phase_seven.sql` (`0011` is Phase 5, `0012` is Phase 6). All three features stay off by default, run on this device, and never write to the source item.

## Evidence recorded so far

| Check | Result |
|---|---|
| Migration and preferences | Migration 13 is registered in `database.rs`; `Preferences` gains `semanticSearch`, `autoTag`, and `summaries`, all default off in Rust, the frontend defaults, and the reset list. Turning Related search off deletes `item_vectors` in the same transaction. |
| Commands wired | `lib.rs` registers `search_related_items`, `reindex_items`, `suggest_tags`, and `summarize_item`. The Rust contract matches the frozen frontend wrapper in `src/data/insights.ts`. |
| Encryption rule | While encryption is on, `reindex_items` writes no `item_vectors` rows, and suggest/summarize decrypt in memory only. Enabling encryption deletes existing vectors. With the vault locked, all three commands return empty instead of leaking or erroring. |
| `cargo test --test phase7_insights` | 104 tests passed. Tokenizer, HTML stripping, vector weights, scoring, suggestions, and summaries, plus the command layer. |
| `cargo test --test phase7_commands` | 103 tests passed. Off paths write nothing; reindex builds vectors and reports pending; search applies each filter field and excludes trashed rows; suggestions skip existing tags case-insensitively; summaries stay in reading order; no vectors are written while encryption is on. |
| `cargo test --test phase7_migration` | 1 test passed. The migration adds the three preference columns (default 0) and `item_vectors` with cascade delete. |
| `cargo test` (full) | All targets pass; lib 113. `cargo clippy --all-targets -- -D warnings` exit 0; `cargo fmt --check` exit 0. |
| Frontend | `pnpm test --run`: 47 files and 543 tests passed, including `phase-seven` data, tag-suggestion, summary, and search suites. `pnpm typecheck` exit 0; `pnpm build` exit 0. Off-path tests prove no related group, no suggestion UI, no summary card, and no command calls with the switches off. |
| No new dependency | Phase 7 adds no crate or package. `insights.rs` is pure Rust plus SQLite and has no HTTP client. The only dependency change in the tree is `pdf-extract` from Phase 5. |

## Required before release

1. Run `pnpm tauri dev` on Windows and turn each switch on: run a related search with and without a filter, accept and reject suggestions, summarize, copy, regenerate, save as note, and confirm the source note is unchanged; run Re-index now.
2. Verify the off check on the same desktop build: with all three off, metadata search is unchanged, no related group, no suggestion chips, no summary card, and Settings shows three off switches.
3. Upgrade a copy of the latest pre-Phase-7 database. Migration `0013` runs once; all preferences and items survive.
4. Keep roadmap requirements open until their acceptance steps pass. Do not treat passing isolated tests as release approval.
