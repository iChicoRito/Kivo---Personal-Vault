# AGENTS.md

## Project

Kivo is a Tauri 2 desktop app.

* `src/`: React 19 + TypeScript frontend (Vite, Tailwind 4, HeroUI).
  * `app/`: shell, routing, navigation, preferences.
  * `features/`: one folder per feature (pages and dialogs).
  * `components/`: shared UI.
  * `data/`: calls into the Rust backend.
  * `test/`: Vitest tests.
* `src-tauri/`: Rust backend.
  * `src/`: Tauri commands and database code.
  * `migrations/`: numbered SQL files, loaded with `include_str!` in `src/database.rs`.
  * `tests/`: Rust integration tests.
* `docs/`: project docs. Visual plans go in `docs/visual-plans`.

Package manager: `pnpm`.

## Commands

* Run app: `pnpm tauri dev`
* Frontend tests: `pnpm test`
* Type check: `pnpm typecheck`
* Frontend build: `pnpm build`
* Rust tests: `cargo test` (run inside `src-tauri`)

## Rules

### 1. Plan first

For any task bigger than a small fix:

1. Understand the goal and read the code it touches.
2. Write a short plan: what changes, which files, which skills or plugins are needed.
3. Check that the plan is not over-engineered.
4. Use the `visual-plan` skill to create a visual version of the plan. Save it in `docs/visual-plans` with a file name that describes the task.
5. Implement. Keep the code as simple as the plan.

Small fixes (typos, one-line changes, simple questions) skip the plan and the visual plan.

### 2. Keep it simple and focused

* Do only what the user asked. The latest instruction wins.
* Prefer the smallest change that correctly solves the task.
* Reuse existing code and project patterns before writing new code.
* Do not add abstractions, layers, features, or libraries without a clear need.
* Do not change, clean up, or restructure unrelated code.
* Keep existing working behavior unless the task requires a change.

### 3. Database migrations

* Never edit a migration that already exists. Add a new file with the next number instead.
* Register every new migration in `src-tauri/src/database.rs`.

### 4. Skills and plugins

Use a skill or plugin only when it directly helps the current task. Do not load one just because it is available.

### 5. Git

* Never commit unless the user asks.
* Commit messages contain only the approved message. No `Co-Authored-By`, no Claude or AI author lines, no other author changes.

### 6. Check work before finishing

* Review the changes for mistakes.
* Run the checks that match the change:
  * Frontend: `pnpm test` and `pnpm typecheck`.
  * Rust: `cargo test` in `src-tauri`.
* Say clearly what was not checked.
* Never claim something works without checking it when checking was possible.

### 7. Plain language

Use simple, clear words. Keep explanations short. Explain any technical term that is needed.
