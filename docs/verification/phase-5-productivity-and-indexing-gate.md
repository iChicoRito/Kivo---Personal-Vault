# Phase 5 productivity and indexing gate

This record tracks the Phase 5 work against `docs/visual-plans/kivo-phase-5-productivity-and-indexing.md`. The gate is open. The Windows desktop round trip and the image-only PDF fixture have not run.

Migration `0010` already belongs to Password Manager. Phase 5 uses `0011_phase_five.sql` instead. Existing password data remains in place.

## Automated evidence

| Check | Result |
|---|---|
| `cargo test` (full, latest run) | All targets pass: lib 112, `phase5_csp` 1, `phase6_backup` 44, `phase6_commands` 43, `phase6_crypto` 44, `phase6_migration` 1, `phase6_portability` 43, `phase7_commands` 102, `phase7_insights` 103, `phase7_migration` 1. 0 failed. Phase 5 backend reported 102 lib tests; the count grew with Phase 6/7 tests, then dropped by one when Activity History was removed. |
| `cargo clippy --all-targets -- -D warnings` | Exit 0 on the final tree. Test crates that path-import `src` modules now set `#![allow(dead_code)]`. |
| `cargo fmt --check` | Exit 0 on the final tree. Rustfmt reformatted the pre-existing `src-tauri/src/icons.rs` drift (test code only) during this integration. |
| `pnpm typecheck` | Exit 0. |
| `pnpm test --run` | 46 files and 541 tests passed on the final tree, including the Phase 5 palette, data, and UI suites. |
| `pnpm build` | Exit 0. Vite reported dependency transform and chunk-size warnings only. |
| `cargo test --lib preview_truncates_large_text_instead_of_refusing_it` | Failed with `unsupported` before the size-cap fix, then passed. Text reads at most 1 MB even when the source exceeds 25 MB. |
| `cargo test --test phase5_csp` | Failed while `frame-src` was missing, then passed after allowing `blob:` PDF frames. Real WebView rendering remains untested. |

Tests cover note-body search, PDF text search, search snippets, note versions, preview, storage groups, shortcuts, and page behavior. They do not replace the Windows desktop pass.

Activity History was removed after Phase 5 at the owner's request. Migration `0014_drop_activity.sql` drops the `activity` table, and the Activity page, its route and navigation entry, the palette clear action, and the `list_activity` and `clear_activity` commands are gone. The counts above come from the tree without it. The index-state helpers that shared the old data module now live in `src/data/indexing.ts`.

## Remaining gate work

1. Run `pnpm tauri dev` on Windows. Preview supported and unsupported files, search a note body and a text PDF, use every shortcut, review storage, and restore a note version.
2. Import an image-only PDF fixture and make sure that it reports `no_text` without freezing the interface.
3. Upgrade a copy of a version 10 database. Make sure that migration `0011` runs once and keeps Password Manager data.
4. Keep roadmap requirements open until their acceptance steps pass. Do not treat passing isolated tests as release approval.
