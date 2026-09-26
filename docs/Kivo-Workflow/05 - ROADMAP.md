# 05 - ROADMAP

[00 - START HERE](00%20-%20START%20HERE.md) · Previous: [04 - DIAGRAMS](04%20-%20DIAGRAMS.md) · Next: [07 - WORD LIST](07%20-%20WORD%20LIST.md)

## What this covers

This roadmap turns the supplied Kivo requirements into development capabilities and outcomes. It reaches from the first interface shell through the optional advanced features. It accounts for every meaningful product module named in the findings. It covers building work only. It does not prescribe files, routes, packages, migrations, commands, or coding-agent tasks.

## Where the plan came from

The roadmap is drawn from [02 - FINDINGS](02%20-%20FINDINGS.md), the proposed arrangement in [03 - SYSTEM ARCHITECTURE](03%20-%20SYSTEM%20ARCHITECTURE.md), the flows in [04 - DIAGRAMS](04%20-%20DIAGRAMS.md), and `KIVO_COMPLETE_DOCUMENTATION.md`, `# RECOMMENDED IMPLEMENTATION ORDER`. Every item was marked ⭕ when this roadmap was written, because the user confirmed on 17 September 2026 that Kivo was not built yet. Phases 1 to 7 are built now; their items carry their real status, and the few open, partial, or dropped items are marked below.

## Coverage check

| Module | Where it appears in the roadmap | Coverage |
|---|---|---|
| HeroUI Integration | Phase 1 - Interface and first setup | Complete |
| Onboarding | Phase 1 - Interface and first setup | Complete |
| Dashboard | Phase 4 - Discovery and safe deletion | Complete |
| All Items | Phase 3 - Core content and organization | Complete |
| Notes | Phase 3 - Core content and organization | Complete |
| Sources / Links | Phase 3 - Core content and organization | Complete |
| Files | Phase 3 - Core content and organization | Complete |
| Collections | Phase 3 - Core content and organization | Complete |
| Tags | Phase 3 - Core content and organization | Complete |
| Search | Phase 4 - Discovery and safe deletion | Complete |
| Favorites | Phase 4 - Discovery and safe deletion | Complete |
| Recent | Phase 4 - Discovery and safe deletion | Complete |
| Trash | Phase 4 - Discovery and safe deletion | Complete |
| Quick Add | Phase 3 - Core content and organization | Complete |
| Item Details | Phase 3 - Core content and organization | Complete |
| Local Database | Phase 2 - Local information and files | Complete |
| Local File Storage | Phase 2 - Local information and files | Complete |
| Settings | Phase 1 - Interface and first setup | Complete |
| Appearance | Phase 1 - Interface and first setup | Complete |
| File Preview | Phase 5 - Productivity and indexing | Complete |
| Vault Lock | Phase 6 - Protection and portability | Complete |
| Encryption | Phase 6 - Protection and portability | Complete |
| Backup | Phase 6 - Protection and portability | Complete |
| Restore | Phase 6 - Protection and portability | Complete |
| Import / Export | Phase 6 - Protection and portability | Complete |
| Storage Manager | Phase 5 - Productivity and indexing | Complete |
| Full-Text Search | Phase 5 - Productivity and indexing | Complete |
| Command Palette | Phase 5 - Productivity and indexing | Complete |
| Keyboard Shortcuts | Phase 5 - Productivity and indexing | Complete |
| Activity History | Phase 5 - Productivity and indexing | Dropped |
| PDF Indexing | Phase 5 - Productivity and indexing | Complete |
| Version History | Phase 5 - Productivity and indexing | Complete |
| Semantic Search | Phase 7 - Optional advanced features | Complete |
| Automatic Tagging | Phase 7 - Optional advanced features | Complete |
| Document Summaries | Phase 7 - Optional advanced features | Complete |

## Where everything stands

| Status | How many |
|---|---:|
| ✅ Finished | 165 |
| 🟨 Being worked on | 5 |
| ⭕ Not started | 2 |
| ❌ Blocked | 0 |
| 🔵 Already there | 0 |
| ⬜ Dropped | 5 |
| ❓ Unclear | 0 |
| **Total** | **177** |

Phases 1 to 7 are built and verified; 165 capabilities are finished, 5 are partly done, 2 are not started, and 5 are dropped. The partly done items are R-016 (storage location is shown but not configurable), R-144 (field encryption works, but the independent security review is pending), R-158 (collection and full-vault export work; single-note and selected-item export do not), and R-163 and R-164 (related search ranks by shared words on this device, not by meaning). The not-started items are R-080 (search type filter, reopened when the search page became a navbar field) and R-150 (automatic backups, kept as a later option). The dropped items are R-088 and R-120 to R-123, removed with Activity History on 26 September 2026. Questions that later phases left open are recorded in [00 - START HERE](00%20-%20START%20HERE.md). What each phase delivered, the evidence behind each status, and the checks that still need a person at the window are in the gate records: [Phase 1](../verification/phase-1-delivery-gate.md), [Phase 2](../verification/phase-2-local-information-and-files-gate.md), [Phase 3](../verification/phase-3-core-content-and-organization-gate.md), [Phase 4](../verification/phase-4-discovery-and-safe-deletion-gate.md), [Phase 5](../verification/phase-5-productivity-and-indexing-gate.md), [Phase 6](../verification/phase-6-protection-and-portability-gate.md), and [Phase 7](../verification/phase-7-optional-advanced-features-gate.md). A finished status means built and covered by automated checks; the open desktop round trips, the image-only PDF fixture, the version upgrade checks, and the security review still stand between this plan and a release.

---

## Phase 1 - Interface and first setup

**The goal:** The owner can open Kivo, move through its main interface, choose a theme, configure basic preferences, and create a first vault.

**Why it comes first:** Every later capability needs an accessible place where the owner can use it. This phase follows the interface, navigation, theming, and onboarding parts of `# RECOMMENDED IMPLEMENTATION ORDER`.

**Where it stands:** Built on 17 September 2026 as a Tauri 2 desktop application. Notes and implementation record: [Phase 1 Delivery Gate Evidence](../verification/phase-1-delivery-gate.md) and the [Phase 1 implementation plan](../visual-plans/kivo-phase-1-interface-first-setup.md). The interface was rebuilt on HeroUI v3 components and theme tokens on the same day: [reskin plan](../visual-plans/kivo-phase-1-heroui-rebuild.md), [reskin evidence](../verification/phase-1-heroui-rebuild-gate.md).

### Module - HeroUI Integration and application foundation

**Purpose:** Give Kivo a consistent, accessible desktop interface and local page navigation.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-001 | Show Kivo in a working desktop interface. | Gives the owner a place to use the vault. | - | `# TARGET STACK`, `# UI FOUNDATION`, and `# ACCEPTANCE CRITERIA` | ✅ | Kivo opens to a usable interface rather than a blank or broken window. |
| R-002 | Move between Dashboard, All Items, library areas, quick access, Trash, and Settings. | Makes documented areas reachable from one local application. | R-001 | `# ROUTING` and `# KIVO NAVIGATION` | ✅ | Each named destination opens its own working screen. |
| R-003 | Use light, dark, and system appearance modes. | Lets the owner choose a comfortable appearance without changing vault information. | R-001 | `# THEMING` and `# Appearance` | ✅ | Each mode renders the interface legibly and system mode follows the operating system choice. |

**Blockers:** No known build blocker. Target operating systems and confirmed visual identity remain open in [Q-05](00%20-%20START%20HERE.md) and [Q-17](00%20-%20START%20HERE.md).

### Module - Onboarding

**Purpose:** Configure a personal vault during first use instead of only explaining Kivo.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-004 | Explain Kivo's private local-vault purpose on a welcome screen. | Sets the owner's expectation before setup begins. | R-001 | `# KIVO — DETAILED ONBOARDING FLOW`, `Page 1 - Welcome to Kivo` | ✅ | A first-time owner can read what Kivo keeps and where it is stored before continuing. |
| R-005 | Collect the owner's required name. | Gives the vault a required owner identity. | R-004 | `# Onboarding`, `Functional Rules`, and `Page 2 - Make It Yours` | ✅ | Continuing without a name is refused with a clear explanation. |
| R-006 | Accept an optional vault name and continue when it is empty. | Lets the owner personalize the vault without making the choice mandatory. | R-005 | `# Onboarding`, `Functional Rules`, and `Page 2 - Make It Yours` | ✅ | The owner can continue with or without a vault name, and the chosen or generated name is shown later. |
| R-007 | Offer multiple starter collections or a skip choice. | Gives a new vault useful organization without forcing a structure. | R-006 | `# Onboarding` and `Page 3 - What Are You Keeping?` | ✅ | The owner can select several options, create those starter collections, or skip them. |
| R-008 | Offer optional Master Password setup with confirmation or a skip choice. | Lets the owner add protection without making it a first-use requirement. | R-007 | `# Onboarding` and `Page 4 - Protect Your Vault` | ✅ | Matching password entries enable the choice, and the skip path continues without one. |
| R-009 | Show simple local-device storage information without asking for technical paths. | Explains the storage location without burdening first-time setup. | R-008 | `# KIVO — DETAILED ONBOARDING FLOW`, `Page 4 - Protect Your Vault`, and `Do Not Add During Onboarding` | ✅ | Setup shows local storage information and never requires a storage-path configuration. |
| R-010 | Save completion and show a setup summary. | Prevents repeated setup and lets the owner check the choices made. | R-009 | `# Onboarding` and `## Setup Complete` | ✅ | Reopening Kivo after completion skips setup and the completion view shows name, vault, collections, storage, and protection state. |
| R-011 | Open Dashboard after setup completes. | Gives the owner an immediate place to begin using the vault. | R-010 | `# Onboarding`, `## Setup Complete`, and `## First Dashboard Empty State` | ✅ | The completion action opens Dashboard and the empty vault offers the documented creation actions. The four actions are shown and marked Coming soon rather than left out, so nothing looks usable when it is not. |

**Blockers:** The flow is clear. Password recovery and exact visual identity remain open in [Q-06](00%20-%20START%20HERE.md) and [Q-17](00%20-%20START%20HERE.md).

### Module - Appearance

**Purpose:** Let the owner personalize appearance and density without changing vault information.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-012 | Switch explicitly between light and dark appearance. | Supports the two named visual modes. | R-003 | `# Appearance` and `# THEMING` | ✅ | The owner can switch modes and every supplied screen remains readable in both. |
| R-013 | Follow the operating system when system appearance is selected. | Keeps Kivo aligned with the owner's device choice. | R-012 | `# Appearance` | ✅ | Changing the operating-system appearance changes Kivo when system mode is selected. |
| R-014 | Choose compact or comfortable density and sidebar or layout preferences. | Gives the owner the documented presentation choices. | R-012 | `# Appearance` | ✅ | Each chosen preference changes presentation and leaves vault information unchanged. |

**Blockers:** No known blocker beyond the target operating systems in [Q-05](00%20-%20START%20HERE.md).

### Module - Settings

**Purpose:** Provide one local place for personal, storage, security, backup, appearance, and application preferences.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-015 | Edit the owner's name and vault name. | Keeps setup information changeable after first use. | R-011 | `# Settings` | ✅ | Changed names are saved locally and appear wherever Kivo shows them. |
| R-016 | Configure storage, startup, security, backup, and appearance preferences. | Gives the owner control over documented behavior without mixing it into content screens. | R-015 | `# Settings` | 🟨 | Each supported preference can be changed, saved locally, and read back after reopening Kivo. Built for startup, security, backup, and appearance, and read back on the next launch. Storage location is shown as This Device but is not yet configurable; that choice is the only remaining part. |
| R-017 | Show application information, reset selected preferences, and separate dangerous actions with confirmation. | Makes maintenance actions understandable and reduces accidental changes. | R-016 | `# Settings`, `Functional Rules` | ✅ | App information is visible, safe preference resets are scoped, and dangerous actions require explicit confirmation. The reset also clears start at login, which the screen states. |

**Blockers:** Exact settings and password-recovery behavior remain open in [Q-06](00%20-%20START%20HERE.md).

---

## Phase 2 - Local information and files

**The goal:** Kivo has local stores for structured vault information and actual files, with a safe relationship between them.

**Why it comes here:** Notes, links, files, search, backup, and restore need durable local storage before their user-facing capabilities can be reliable.

**Where it stands:** Built on 18 September 2026 on the Phase 1 store. The schema moved to version 3 with `items`, `files`, `collections`, `tags`, `item_tags`, `activity`, and `index_state`; the managed folder sits under the application data directory; eight Rust commands and three frontend data modules cover the storage layer. Notes and evidence: [Phase 2 implementation plan](../visual-plans/kivo-phase-2-local-information-and-files.md) and [Phase 2 Local Information and Files Gate Evidence](../verification/phase-2-local-information-and-files-gate.md). No screen calls the commands yet; Phase 3 adds them.

### Module - Local Database

**Purpose:** Keep structured vault information on the owner's device and preserve it as Kivo changes.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-018 | Store metadata for vault items. | Gives every item a durable local record. | R-001 | `# Local Database` and `# DATABASE` | ✅ | An item can be saved and read back with its supported descriptive information. |
| R-019 | Store note content locally. | Keeps notes available without an online service. | R-018 | `# Local Database` and `# Notes` | ✅ | A saved note remains available after Kivo closes and reopens. |
| R-020 | Store tags, collections, and their relationships. | Preserves the organization applied to items. | R-018 | `# Local Database`, `# Collections`, and `# Tags` | ✅ | An item can be read with its selected tags and collection after reopening Kivo. |
| R-021 | Store favorite state, settings, and onboarding state. | Keeps personal choices and setup progress across sessions. | R-018 | `# Local Database`, `# Favorites`, `# Settings`, and `# Onboarding` | ✅ | These choices survive a restart and do not create duplicate items. Settings, onboarding state, and favorite state are stored and read back after reopening Kivo. |
| R-022 | Store indexing metadata locally. | Gives search services durable information to use. | R-018 | `# Local Database` and `# Full-Text Search` | ✅ | Index state can be read after Kivo reopens. The activity half was dropped with Activity History on 26 September 2026. |
| R-023 | Change the stored information over time without losing existing user data. | Lets Kivo evolve while preserving the owner's vault. | R-018 to R-022 | `# Local Database`, `Functional Rules` | ✅ | A stored vault remains readable after a supported information-shape change and no existing user data is silently discarded. |

**Blockers:** None for this phase. The working answers for the stored information shape are recorded in the Phase 2 plan and gate; [Q-03](00%20-%20START%20HERE.md) and [Q-04](00%20-%20START%20HERE.md) stay open for later phases.

### Module - Local File Storage

**Purpose:** Keep actual documents and attachments in managed local storage while SQLite keeps their details.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-024 | Create managed local storage and import files into it. | Gives file items a controlled local home. | R-018 | `# Local File Storage` | ✅ | An imported file exists in managed storage and its item information points to it. |
| R-025 | Keep actual files separate from SQLite information. | Avoids putting large documents directly into the structured information store. | R-024 | `# Local Database`, `# Local File Storage`, and `# DATABASE` | ✅ | A file item can be backed by a local file while its descriptive information remains separate. |
| R-026 | Use safe internal identifiers and operating-system-safe locations. | Prevents unsafe or conflicting paths across desktop systems. | R-024 | `# Local File Storage`, `Functional Rules` | ✅ | Imported files use safe managed locations on every supported operating system. |
| R-027 | Track file locations and support file rename or move actions. | Keeps item information aligned when a managed file changes location. | R-025 | `# Local File Storage` | ✅ | Renaming or moving a managed file updates its local reference without losing the item. |
| R-028 | Detect missing local files. | Prevents broken file actions from appearing successful. | R-025 | `# Local File Storage` and `# Files` | ✅ | A missing file is shown as unavailable and the rest of its local item information remains readable. |
| R-029 | Include managed files in backup and restore. | Makes a recovered vault complete rather than only restoring descriptions. | R-025 | `# Local File Storage`, `# Backup`, and `# Restore` | ✅ | A supported backup and restore round trip brings back both file information and available managed files. Built in Phase 6 and covered by the Phase 6 backup and restore suites. |

**Blockers:** None for this phase on Windows. Other operating systems still need [Q-05](00%20-%20START%20HERE.md); the file-naming answer is recorded in the Phase 2 gate.

---

## Phase 3 - Core content and organization

**The goal:** The owner can create, edit, view, organize, and remove the core kinds of vault content.

**Why it comes here:** These capabilities are the vault's main content and provide the information used later by Dashboard, search, indexing, backup, and recovery.

**Where it stands:** Built on 18 September 2026 on the Phase 2 store. The schema moved to version 4 with pinned items, soft delete, and collection icons; sixteen commands and eight real screens cover All Items, Notes, Sources, Files, Collections, Tags, Item Details, and Quick Add on the Dashboard. Notes and evidence: [Phase 3 implementation plan](../visual-plans/kivo-phase-3-core-content-and-organization.md) and [Phase 3 Core Content and Organization Gate Evidence](../verification/phase-3-core-content-and-organization-gate.md).

### Module - All Items

**Purpose:** Browse every stored item and apply common organization actions.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-030 | Show notes, files, links, and other supported vault items together. | Gives the owner one complete browsing place. | R-018 | `# All Items` | ✅ | Every supported item type appears with enough information to identify it. |
| R-031 | Switch between list and grid views. | Supports different browsing preferences. | R-030 | `# All Items` | ✅ | The owner can change view and the same items remain available in both views. |
| R-032 | Sort items by name, created date, changed date, or type. | Makes larger vaults easier to scan. | R-030 | `# All Items` | ✅ | Each documented sort choice changes item order correctly. |
| R-033 | Combine filters by item type, tag, collection, and favorite state. | Narrows the vault to the owner's actual need. | R-030 | `# All Items`, `Functional Rules` | ✅ | More than one supported filter can be active and the result reflects all active choices. |
| R-034 | Select several items with clear and reversible selection state. | Makes batch actions understandable and recoverable before execution. | R-030 | `# All Items`, `Functional Rules` | ✅ | Selection is visible, can be cleared, and does not change items until an action is chosen. |
| R-035 | Move selected items, change their favorite state, or send them to Trash. | Provides the documented batch organization actions. | R-034 | `# All Items` | ✅ | Each batch action updates exactly the selected items and deletion first uses Trash. |

**Blockers:** The full list of supported item types remains open in [Q-03](00%20-%20START%20HERE.md).

### Module - Notes

**Purpose:** Keep personal written information available and safe offline.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-036 | Create a note. | Supplies the primary written-content action. | R-019 | `# Notes` | ✅ | The owner can create a note and find it after restarting Kivo. |
| R-037 | Edit a note's title and content. | Lets the owner maintain information over time. | R-036 | `# Notes` | ✅ | Title and content changes are saved and shown again after reopening the note. |
| R-038 | Use the chosen Markdown or rich-text editing format. | Defines how written content is entered and stored. | R-037 | `# Notes`, `Main Functionalities` | ✅ | The chosen editing format works consistently for entry, viewing, saving, and export. |
| R-039 | Save note changes automatically and keep notes available offline. | Reduces accidental content loss and avoids an online requirement. | R-037 | `# Notes`, `Functional Rules` | ✅ | A change survives leaving the note or restarting Kivo without a separate online connection. |
| R-040 | Pin notes, assign tags and collections, and favorite notes. | Supports the documented ways to prioritize and organize written content. | R-037 | `# Notes` | ✅ | Each choice is visible on the note and remains after reopening it. |
| R-041 | Search note titles and content and move notes to Trash. | Makes notes findable and safely removable. | R-036 | `# Notes` | ✅ | A title or content match can find the note, and deleting it places it in Trash first. |

**Blockers:** The editor choice is open in [Q-01](00%20-%20START%20HERE.md).

### Module - Sources / Links

**Purpose:** Keep useful online addresses and their local context in the vault.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-042 | Save a source only when its address is valid. | Prevents unusable link records. | R-018 | `# Sources / Links`, `Functional Rules` | ✅ | Invalid input is refused and a valid address creates a local source item. |
| R-043 | Add a custom title, description, or personal note to a source. | Preserves the owner's context rather than only an address. | R-042 | `# Sources / Links` | ✅ | Each supported detail is saved and shown with the source. |
| R-044 | Assign tags, assign a collection, and favorite a source. | Makes links fit the same organization model as other items. | R-042 | `# Sources / Links` | ✅ | The source can be found through each chosen organization state. |
| R-045 | Open a saved source in the default browser and copy its address. | Provides the two documented ways to use a stored link externally or elsewhere. | R-042 | `# Sources / Links` | ✅ | Open sends the address to the default browser and copy places the exact saved address on the clipboard. |
| R-046 | Edit source details. | Keeps local context maintainable when it changes. | R-042 | `# Sources / Links` | ✅ | Edited details replace the old local details without creating a duplicate source. |
| R-047 | Remove a saved source and its local details. | Lets the owner keep the vault current. | R-046 | `# Sources / Links` | ✅ | Removal follows the documented deletion and Trash behavior. |
| R-048 | Show saved source details while offline. | Keeps local references useful when the website cannot be reached. | R-042 | `# Sources / Links`, `Functional Rules` | ✅ | The source's local title and details remain visible without opening the website. |

**Blockers:** The valid-address rules are clear. The exact supported address forms are not specified.

### Module - Files

**Purpose:** Manage documents and attachments held in managed local storage.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-049 | Add supported PDFs, images, documents, ZIP files, text files, and code files. | Covers the file types named by the material. | R-024 | `# Files` | ✅ | Each supported type can be imported and appears as a file item. |
| R-050 | Rename a file entry without silently overwriting an existing file. | Keeps names useful while protecting existing content. | R-049 | `# Files`, `Functional Rules` | ✅ | A conflicting name produces a visible choice or refusal rather than replacing content silently. |
| R-051 | Assign tags and collections and favorite files. | Gives files the same organization choices as other content. | R-049 | `# Files` | ✅ | Each chosen state is saved and visible on the file item. |
| R-052 | Open supported files and reveal them in their local folder. | Lets the owner use a file inside Kivo or in the operating system. | R-049 | `# Files` | ✅ | Supported open actions work, and reveal opens the containing local folder. |
| R-053 | Move files between collections. | Keeps file organization changeable. | R-051 | `# Files` | ✅ | Moving a file changes its collection without changing its content. |
| R-054 | Move files to Trash. | Provides safe removal instead of immediate permanent deletion. | R-049 | `# Files` | ✅ | The file item leaves normal browsing and appears in Trash. |
| R-055 | Show file size, type, and created or changed dates. | Gives the owner enough information to distinguish files. | R-049 | `# Files` | ✅ | These supported details are visible and match the stored file. |
| R-056 | Show a clear unavailable state when a local file is missing. | Prevents broken file actions from looking complete. | R-049 | `# Files`, `Functional Rules` | ✅ | A missing file is clearly identified while its remaining metadata can still be read. |

**Blockers:** Exact file conflict behavior and target operating systems remain open in [Q-04](00%20-%20START%20HERE.md) and [Q-05](00%20-%20START%20HERE.md).

### Module - Collections

**Purpose:** Group related vault items into named spaces.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-057 | Create and rename collections. | Gives the owner editable groups for related items. | R-020 | `# Collections` | ✅ | A collection can be created, renamed, and found with its new name. |
| R-058 | Delete a collection without deleting its items by default. | Prevents an organization change from becoming content loss. | R-057 | `# Collections`, `Functional Rules` | ✅ | Deleting a collection leaves its items available outside that collection. |
| R-059 | Assign an optional icon or label to a collection. | Provides the documented light personalization choice. | R-057 | `# Collections` | ✅ | The optional icon or label is saved and shown when present. |
| R-060 | Move items into a collection and view all items inside it. | Makes collections useful for active organization and browsing. | R-057 | `# Collections` | ✅ | Moving an item changes its collection and opening the collection shows that item. |
| R-061 | Show collection item counts and support nested collections if enabled. | Gives the owner scale information while preserving the conditional scope. | R-057 | `# Collections` | ✅ | Counts reflect current membership, and nested collections work only when that choice is enabled. |

**Blockers:** First-release nested-collection behavior remains open in [Q-02](00%20-%20START%20HERE.md).

### Module - Tags

**Purpose:** Label items across collection boundaries.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-062 | Create, rename, and delete tags. | Keeps labels maintainable as the vault changes. | R-020 | `# Tags` | ✅ | Each tag action updates the tag list without deleting item content. |
| R-063 | Assign several tags to an item and remove tags from it. | Supports flexible organization across collections. | R-062 | `# Tags`, `Functional Rules` | ✅ | An item can hold several tags, and each selected tag can be removed independently. |
| R-064 | Filter items by tag and show tag usage counts. | Makes tags useful for discovery and cleanup. | R-062 | `# Tags` | ✅ | Selecting a tag shows matching items and its count reflects current use. |
| R-065 | Prevent or normalize duplicate tag names, and leave items intact when a tag is deleted. | Avoids confusing labels and accidental content loss. | R-062 | `# Tags`, `Functional Rules` | ✅ | Duplicate input is refused or normalized, and deleting a tag removes only the label relationship. |

**Blockers:** The material permits either duplicate prevention or normalization; the chosen behavior is not fixed.

### Module - Item Details

**Purpose:** Show and edit the information that describes one vault item.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-066 | Show an item's title, type, description, tags, collection, dates, and favorite state. | Gives the owner one complete detail view for supported common information. | R-030 | `# Item Details` | ✅ | Opening an item shows each applicable common detail from local storage. |
| R-067 | Show local file information only for file-based items. | Avoids showing irrelevant fields on notes and links. | R-066 | `# Item Details`, `Functional Rules` | ✅ | File-specific information appears for files and is absent for non-file items. |
| R-068 | Edit supported metadata and show changes immediately. | Makes detail maintenance direct and predictable. | R-066 | `# Item Details`, `Functional Rules` | ✅ | A saved metadata change is visible without leaving and re-entering the detail view. |

**Blockers:** The exact set of editable metadata fields is not fully fixed.

### Module - Quick Add

**Purpose:** Start common creation actions with minimal navigation.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-069 | Create a new note from Quick Add. | Covers the most common written-content action. | R-036 | `# Quick Add` | ✅ | Choosing the note action opens a new note path and saves the resulting note. |
| R-070 | Add a file, save a link, or create a collection from Quick Add. | Keeps the other common creation actions close at hand. | R-049, R-042, R-057 | `# Quick Add` | ✅ | Each action opens its matching creation path and returns a saved item or collection. |
| R-071 | Open Quick Add from Dashboard. | Makes the shortcut available at the documented starting point. | R-011, R-069 | `# Quick Add` and `# Dashboard` | ✅ | The Dashboard action opens Quick Add and its choices work. |
| R-072 | Open Quick Add from a global shortcut or command palette with a short path. | Supports fast creation without navigating through a list. | R-069, R-071 | `# Quick Add`, `# Command Palette`, and `# Keyboard Shortcuts` | ✅ | Each supported entry point opens the same common-action choices with no unnecessary steps. |

**Blockers:** Exact global shortcut and command names remain open in [Q-16](00%20-%20START%20HERE.md).

---

## Phase 4 - Discovery and safe deletion

**The goal:** The owner can see useful vault summaries, find items, mark important items, review recent items, and recover deleted items.

**Why it comes here:** These views depend on the core content and shared local item information from Phases 2 and 3.

### Module - Dashboard

**Purpose:** Give the owner a small, useful overview without duplicating All Items.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-073 | Show recent and favorite items. | Surfaces content the owner is likely to need first. | R-030, R-084, R-087 | `# Dashboard` | ✅ | Both sections show current items and open the selected item directly. |
| R-074 | Show collection shortcuts. | Provides fast access to organized areas. | R-060 | `# Dashboard` | ✅ | A collection shortcut opens that collection and reflects its current name. |
| R-075 | Provide Quick Add actions. | Makes common creation available from the main overview. | R-071 | `# Dashboard` | ✅ | Dashboard creation actions open their matching Quick Add paths. |
| R-076 | Show a basic storage overview. | Gives the owner a quick sense of local vault use. | R-024 | `# Dashboard` | ✅ | Dashboard shows a local storage summary without pretending to be the full Storage Manager. |
| R-077 | Show empty guidance and open an item directly. | Makes a new vault useful and keeps overview sections actionable. | R-030, R-073 | `# Dashboard`, `# First Dashboard Empty State` | ✅ | An empty vault shows the documented creation guidance and populated sections open selected items. |

**Blockers:** No known blocker. The exact scope of the storage summary is not specified.

### Module - Search

**Purpose:** Find vault information offline through common names, details, and organization labels.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-078 | Search item titles, note content, URLs, and filenames. | Covers the main kinds of information the owner may remember. | R-030, R-036, R-042, R-049 | `# Search` | ✅ | A matching title, note, address, or filename appears in results. |
| R-079 | Search tags and collection names. | Finds items through the owner's organization language. | R-062, R-057 | `# Search` | ✅ | A tag or collection-name match returns its associated items. |
| R-080 | Filter search results by item type. | Helps separate similar matches. | R-078 | `# Search` | ⭕ | Selecting a type removes other types from the result set. |
| R-081 | Open a search result directly. | Turns a match into a usable next action. | R-078 | `# Search` | ✅ | Selecting a result opens the referenced item or its clear unavailable state. |
| R-082 | Work fully offline and show a clear empty state. | Preserves the local-first promise and explains no-match results. | R-078 | `# Search`, `Functional Rules` | ✅ | Search works without a network connection and explicitly explains when nothing matches. |
| R-083 | Connect deeper search to Full-Text Search and PDF Indexing when available. | Lets basic search grow without changing its local entry point. | R-078, R-105, R-124 | `# Search`, `Functional Rules` | ✅ | Indexed note and PDF matches can appear through the Search experience when those indexes exist. |

**Blockers:** Index coverage and the approved PDF text process remain open in [Q-12](00%20-%20START%20HERE.md). The search page was replaced by a navbar search field in the Phase 4 follow-up, which dropped the type filter, so R-080 reopens until a filter returns.

### Module - Favorites

**Purpose:** Keep important items easy to reach without creating copies.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-084 | Favorite and unfavorite an item without duplicating it. | Keeps priority as a state of the original item. | R-030 | `# Favorites`, `Functional Rules` | ✅ | Toggling favorite changes one item state and creates no second item. |
| R-085 | View all favorites and filter them by item type. | Gives the owner a focused useful-items view. | R-084 | `# Favorites` | ✅ | The favorites view lists current favorites and its type filter works. |
| R-086 | Open a favorite and keep the item when it is unfavorited. | Makes favorite removal safe and reversible. | R-084 | `# Favorites`, `Functional Rules` | ✅ | Opening works and unfavoriting removes only the favorite state. |

**Blockers:** No known blocker.

### Module - Recent

**Purpose:** Reopen content the owner recently created, changed, or opened.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-087 | Show recently opened, modified, and created items. | Reflects the three kinds of recent activity named by the material. | R-030, R-022 | `# Recent` | ✅ | Each recent category shows current items in the expected order or grouping. |
| R-088 | Open a recent item and clear recent history when supported. | Makes recent activity useful and gives the owner control over it. | R-087 | `# Recent` | ⬜ | A surviving item opens directly and the clear action removes supported history entries. Dropped with Activity History on 26 September 2026. |
| R-089 | Remove trashed or permanently deleted items from recent references. | Prevents broken recent entries. | R-087, R-090 | `# Recent`, `Functional Rules` | ✅ | Deleted references no longer appear as actionable current items. |

**Blockers:** None. The clear-history choice was resolved by removal: Activity History was dropped on 26 September 2026, so R-088 is dropped while opening a recent item (R-087) still works.

### Module - Trash

**Purpose:** Provide recovery before permanent deletion.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-090 | Send deleted items to Trash first. | Gives normal deletion a recovery path. | R-030 | `# Trash`, `# All Items`, `Functional Rules` | ✅ | A normal delete removes the item from active views and places it in Trash. |
| R-091 | View deleted items and their deleted dates. | Lets the owner identify what can be recovered or removed. | R-090 | `# Trash` | ✅ | Trash lists deleted items with the supported deleted date. |
| R-092 | Restore an item and its available local file. | Recovers both the item record and its file when possible. | R-090, R-028 | `# Trash`, `Functional Rules` | ✅ | Restore returns the item to active views and restores its available managed file. |
| R-093 | Permanently delete one item with explicit confirmation. | Protects against accidental irreversible deletion. | R-091 | `# Trash`, `Functional Rules` | ✅ | The item is permanently removed only after a clear confirmation. |
| R-094 | Empty Trash with explicit confirmation. | Provides controlled bulk permanent deletion. | R-091 | `# Trash` | ✅ | Emptying requires confirmation and removes the intended deleted items only. |
| R-095 | Keep normal deletion separate from permanent deletion. | Preserves the safety boundary across all modules. | R-090, R-093 | `# All Items`, `# Files`, `# Trash` | ✅ | Every normal delete path uses Trash and every permanent path uses confirmation. |

**Blockers:** File restore behavior when a local file is unavailable needs the storage decision in [Q-04](00%20-%20START%20HERE.md).

---

## Phase 5 - Productivity and indexing

**The goal:** The owner can preview files, understand storage use, search deeper text, use keyboard-oriented actions, and recover meaningful versions.

**Why it comes here:** These capabilities depend on the core item model, local files, search entry point, and safe deletion behavior.

**Where it stands:** Built in September 2026 and covered by the Phase 5 suites; see [Phase 5 Productivity and Indexing Gate Evidence](../verification/phase-5-productivity-and-indexing-gate.md). Activity History was built and then removed on 26 September 2026, and migration `0014` drops its table. The Windows desktop pass, the image-only PDF fixture, and the version 10 upgrade check remain open.

### Module - File Preview

**Purpose:** Read supported local files inside Kivo without changing them.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-096 | Preview images and PDFs. | Covers two named supported preview types. | R-049 | `# File Preview` | ✅ | A supported image or PDF opens inside Kivo without changing the source file. |
| R-097 | Preview Markdown and plain-text files. | Covers readable text-based files without an external application. | R-096 | `# File Preview` | ✅ | A supported text file is readable inside Kivo and remains unchanged. |
| R-098 | Show a clear fallback for unsupported file types. | Explains why an in-app preview is unavailable. | R-096 | `# File Preview`, `Functional Rules` | ✅ | Unsupported content receives a clear fallback rather than a broken preview. |
| R-099 | Open a file externally when in-app preview is unavailable. | Gives the owner a useful next action for unsupported content. | R-098 | `# File Preview` | ✅ | The external-open action sends the file to the operating system's supported application. |
| R-100 | Show basic file details without modifying the original. | Keeps context visible while preserving source content. | R-096 | `# File Preview`, `Functional Rules` | ✅ | Preview shows supported metadata and a comparison confirms the original file was not changed. |

**Blockers:** Supported preview edge cases are not fully enumerated.

### Module - Storage Manager

**Purpose:** Explain how much local space Kivo uses and connect storage results to items.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-101 | Show total Kivo use, SQLite size, and managed-file size. | Gives the owner the named storage breakdown. | R-018, R-024 | `# Storage Manager` | ✅ | The manager reports each supported size from local storage. |
| R-102 | Show stored-file count, largest files, and grouping by file type. | Helps the owner understand what makes up local use. | R-101 | `# Storage Manager` | ✅ | Each supported view reflects the current managed files. |
| R-103 | Open relevant items from storage results. | Turns storage information into a useful cleanup or inspection path. | R-102, R-030 | `# Storage Manager` | ✅ | Selecting a result opens its item or a clear unavailable state. |
| R-104 | Keep storage reporting read-only unless the owner chooses cleanup through Trash. | Prevents reporting from becoming unsafe deletion. | R-101, R-090 | `# Storage Manager`, `Functional Rules` | ✅ | Viewing statistics changes nothing, and cleanup follows normal Trash confirmation behavior. |

**Blockers:** Exact storage measurement boundaries are not specified.

### Module - Full-Text Search

**Purpose:** Search text inside notes and supported indexed content locally.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-105 | Index note content locally. | Makes note bodies searchable beyond titles. | R-036, R-019 | `# Full-Text Search` | ✅ | A saved note produces a local searchable representation without an online service. |
| R-106 | Search note bodies and other indexed text. | Finds information inside supported content. | R-105 | `# Full-Text Search` | ✅ | A word in indexed content returns its source item. |
| R-107 | Return relevant matches and highlight matching terms. | Helps the owner understand why a result matched. | R-106 | `# Full-Text Search` | ✅ | Results show useful matching context and identify the entered term. |
| R-108 | Update the index when source content changes. | Prevents search results from becoming stale. | R-105 | `# Full-Text Search`, `Functional Rules` | ✅ | Editing indexed content changes later search results without manual repair. |
| R-109 | Keep the index synchronized with source content. | Preserves trust in local search. | R-108 | `# Full-Text Search`, `Functional Rules` | ✅ | A source change, rename, or removal leaves no stale searchable record. |
| R-110 | Remove deleted items from the index. | Prevents deleted content from appearing in search. | R-090, R-105 | `# Full-Text Search`, `Functional Rules` | ✅ | Sending an item to permanent or soft deletion removes it from the active search results as specified. |

**Blockers:** Indexed file coverage and exact matching behavior remain open in [Q-12](00%20-%20START%20HERE.md).

### Module - Command Palette

**Purpose:** Give the owner keyboard access to navigation and common actions.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-111 | Open the command palette with Ctrl+K or a configured shortcut. | Provides the documented fast entry point. | R-002 | `# Command Palette` | ✅ | The default or configured shortcut opens the palette without leaving the local application. |
| R-112 | Search pages, modules, and vault items from the palette. | Reduces navigation time for known destinations and content. | R-111, R-078 | `# Command Palette` | ✅ | Matching pages, modules, and items appear as selectable commands. |
| R-113 | Run create-note, add-file, save-link, Settings, and other common actions. | Makes documented frequent actions available from one place. | R-111, R-072 | `# Command Palette` | ✅ | Each available command performs its named action. |
| R-114 | Hide or disable unavailable actions. | Prevents the palette from promising work that cannot run. | R-111 | `# Command Palette`, `Functional Rules` | ✅ | An unavailable action cannot be selected as if it worked. |
| R-115 | Navigate the palette fully with a keyboard. | Supports the desktop productivity goal without requiring a mouse. | R-111 | `# Command Palette`, `Functional Rules` | ✅ | The owner can move, choose, and dismiss commands using documented keyboard actions. |

**Blockers:** Exact command names and shortcut choices remain open in [Q-16](00%20-%20START%20HERE.md).

### Module - Keyboard Shortcuts

**Purpose:** Support repeatable desktop actions without conflicting with the operating system.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-116 | Provide shortcuts for search, command palette, new note, and Quick Add. | Covers the main fast-entry actions. | R-111, R-072 | `# Keyboard Shortcuts` | ✅ | Each documented action can be started by its configured shortcut. |
| R-117 | Provide shortcuts for favorite, Trash, and navigation actions. | Speeds up common item and movement actions. | R-084, R-090, R-002 | `# Keyboard Shortcuts` | ✅ | Each supported shortcut affects the intended current item or destination. |
| R-118 | Show a shortcuts reference. | Lets the owner discover the available actions. | R-116 | `# Keyboard Shortcuts` | ✅ | The reference lists current shortcuts and their actions. |
| R-119 | Avoid operating-system conflicts and confirm destructive shortcuts. | Protects normal desktop behavior and prevents accidental loss. | R-117 | `# Keyboard Shortcuts`, `Functional Rules` | ✅ | Conflicting shortcuts are rejected or changed, and destructive actions require the same confirmation as mouse actions. |

**Blockers:** Exact shortcuts and target operating systems remain open in [Q-05](00%20-%20START%20HERE.md) and [Q-16](00%20-%20START%20HERE.md).

### Module - Activity History

**Purpose:** Show a local record of meaningful actions without recording sensitive content.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-120 | Record item creation, updates, collection moves, restores, and imports. | Gives the owner the documented action history. | R-018, R-030 | `# Activity History` | ⬜ | Each supported action creates a local history entry without copying note contents or passwords. Dropped on 26 September 2026. |
| R-121 | Display activity by date. | Makes a longer local history understandable. | R-120 | `# Activity History` | ⬜ | Entries can be read in date groups or order. Dropped on 26 September 2026. |
| R-122 | Open a referenced item while it still exists. | Connects history to useful current content. | R-120 | `# Activity History` | ⬜ | Selecting a surviving reference opens its item. Dropped on 26 September 2026. |
| R-123 | Keep history local, omit sensitive content, and degrade deleted references gracefully. | Preserves privacy and prevents broken history actions. | R-120 | `# Activity History`, `Functional Rules` | ⬜ | History remains on the device, contains no sensitive content or passwords, and explains when a referenced item no longer exists. Dropped on 26 September 2026. |

**Where it stands:** Built in Phase 5 and removed on 26 September 2026 at the owner's request. Migration `0014_drop_activity.sql` drops the `activity` table, and the page, the commands, and the activity writes are gone. The four rows stay for the record as dropped.

### Module - PDF Indexing

**Purpose:** Make text in supported PDFs searchable without changing the originals.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-124 | Detect supported PDFs and extract their text locally. | Creates the source material needed for PDF search. | R-049, R-105 | `# PDF Indexing` | ✅ | A supported text PDF produces locally extracted text and an unsupported PDF is identified. |
| R-125 | Store searchable PDF text or its index and update it when the PDF changes. | Keeps results available and current. | R-124 | `# PDF Indexing`, `Functional Rules` | ✅ | A changed PDF produces updated searchable content rather than stale text. |
| R-126 | Return PDF matches through Kivo Search. | Gives PDF content the same local search entry point as other content. | R-125, R-083 | `# PDF Indexing` and `# Search` | ✅ | A term in indexed PDF text returns the owning file through Search. |
| R-127 | Handle image-only or unsupported PDFs gracefully without modifying them. | Makes limits visible and protects original documents. | R-124 | `# PDF Indexing`, `Functional Rules` | ✅ | The owner sees a clear unavailable or not-indexed state and the original PDF remains unchanged. |
| R-128 | Index large PDFs without freezing the interface. | Keeps the desktop application usable during local work. | R-124 | `# PDF Indexing`, `Functional Rules` | ✅ | Starting a large PDF index leaves the interface responsive and reports its state. |

**Blockers:** Approved PDF extraction and future OCR behavior remain open in [Q-12](00%20-%20START%20HERE.md).

### Module - Version History

**Purpose:** Keep recoverable earlier versions of editable content.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-129 | Create versions of notes after meaningful edits. | Protects against unwanted changes without treating every keystroke as a version. | R-036, R-039 | `# Version History` | ✅ | A meaningful note edit produces a previous version that can be identified. |
| R-130 | Show previous versions and their basic timestamps. | Lets the owner understand available recovery points. | R-129 | `# Version History` | ✅ | Earlier versions and their timestamps are visible beside the current content. |
| R-131 | Restore a previous version and create a recoverable state for that restoration. | Makes restoration itself safe to undo. | R-130 | `# Version History`, `Functional Rules` | ✅ | Restoring an older version changes the note and preserves the pre-restore state as another recoverable version. |
| R-132 | Limit or prune excessive history without applying it blindly to large binary files. | Controls local growth while respecting the documented boundary. | R-129 | `# Version History`, `Functional Rules` | ✅ | History can be limited or pruned, and large binary files are not versioned as if they were notes. |

**Blockers:** The meaning of a "meaningful edit" and retention limit is not fixed.

---

## Phase 6 - Protection and portability

**The goal:** The owner can protect the vault, create recoverable backups, restore them safely, and move supported content in or out.

**Why it comes here:** These capabilities depend on stable local information, managed files, deletion rules, and the content modules they protect or transport. Security choices should be settled before release.

**Where it stands:** Built in September 2026 and covered by the Phase 6 suites; see [Phase 6 Protection and Portability Gate Evidence](../verification/phase-6-protection-and-portability-gate.md). Field encryption is off by default until the owner enables it, and the design is recorded in [Phase 6 encryption design](../security/phase-6-encryption-design.md). The independent security review, the Windows desktop round trip, and the at-rest inspection remain open.

### Module - Vault Lock

**Purpose:** Prevent casual unauthorized access to the desktop vault.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-133 | Set, change, and disable a Master Password with proper verification. | Gives the owner control over the access lock. | R-017 | `# Vault Lock` | ✅ | Each password change or disable action verifies the current or new credentials as required. |
| R-134 | Lock and unlock the vault manually. | Lets the owner protect the vault when stepping away. | R-133 | `# Vault Lock` | ✅ | Lock hides protected content and a valid unlock returns the owner to Kivo. |
| R-135 | Lock after a configured period of inactivity. | Adds the documented automatic protection choice. | R-134 | `# Vault Lock` | ✅ | When enabled, inactivity locks the vault after the chosen period. |
| R-136 | Never store the raw Master Password and verify it through a secure derivation approach. | Prevents the password itself from becoming stored vault content. | R-133 | `# Vault Lock`, `Functional Rules` | ✅ | Inspection of stored information finds no raw Master Password and verification uses the approved secure approach. |
| R-137 | Keep interface locking distinct from encryption. | Prevents a lock screen from being treated as data protection. | R-134 | `# Vault Lock`, `Functional Rules` | ✅ | The protection design states separately what locking does and what Encryption does. |
| R-138 | Expose Vault Lock settings through the security area. | Makes the protection controls discoverable after onboarding. | R-133, R-017 | `# Settings` and `# Vault Lock` | ✅ | The owner can find and change supported lock settings from Settings. |

**Blockers:** Password recovery and exact lock behavior remain open in [Q-06](00%20-%20START%20HERE.md).

### Module - Encryption

**Purpose:** Protect selected sensitive vault information on the local device.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-139 | Encrypt the selected sensitive local information. | Protects information beyond the interface lock. | R-137 | `# Encryption` | ✅ | The agreed sensitive information is unreadable without the required protection key. |
| R-140 | Derive or obtain encryption keys securely from the Master Password or approved secure key storage. | Connects protection to an approved key source without storing a raw password. | R-139 | `# Encryption` | ✅ | Keys are produced or obtained only through the approved secure design. |
| R-141 | Decrypt protected information only while the vault is unlocked. | Limits access to protected content. | R-139, R-134 | `# Encryption` | ✅ | Protected information is available only after a valid unlock state. |
| R-142 | Handle key changes safely. | Prevents a password or key change from making existing information unreadable. | R-140 | `# Encryption` | ✅ | A supported key change preserves access to all information that should remain available. |
| R-143 | Keep plaintext sensitive information out of logs. | Reduces accidental disclosure through local records. | R-139 | `# Encryption` | ✅ | Logs contain no raw passwords or protected content during normal protection actions. |
| R-144 | Use established audited cryptographic work and review the encryption design before release. | Avoids custom cryptography and requires security review before trust is claimed. | R-139 to R-143 | `# Encryption`, `Functional Rules` | 🟨 | A security reviewer has approved the chosen established cryptographic approach before production release. The design is written; the review is pending. |

**Blockers:** The scope, key design, and library are recorded in [Phase 6 encryption design](../security/phase-6-encryption-design.md); [Q-07](00%20-%20START%20HERE.md) and [Q-08](00%20-%20START%20HERE.md) stay open for the independent security review in R-144, which is still pending.

### Module - Backup

**Purpose:** Create a local copy that contains enough information to recover the vault.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-145 | Create a manual backup. | Gives the owner an explicit recovery point. | R-023, R-029 | `# Backup` | ✅ | A manual action creates a backup that Kivo can identify later. |
| R-146 | Choose a backup destination. | Gives the owner control over where the recovery copy lives. | R-145 | `# Backup` | ✅ | The owner can choose a supported destination and Kivo reports the chosen result. |
| R-147 | Include SQLite information and managed files in a recoverable backup. | Makes the backup sufficient for vault recovery. | R-145 | `# Backup`, `# Local File Storage` | ✅ | A backup contains both required local stores for the supported vault. |
| R-148 | Show backup date and status and validate completion. | Lets the owner distinguish a usable backup from an incomplete attempt. | R-145 | `# Backup` | ✅ | Kivo reports the backup's date and whether validation completed successfully. |
| R-149 | Avoid silently replacing an existing backup. | Protects earlier recovery points. | R-145 | `# Backup`, `Functional Rules` | ✅ | A destination conflict requires visible user intent before replacement or another outcome. |
| R-150 | Optionally support automatic local backups later. | Keeps the documented future capability visible without making it a core requirement. | R-145 | `# Backup`, `Main Functionalities` | ⭕ | If enabled, an automatic local backup follows an explicitly chosen schedule and reports its state. Not built; Settings states that automatic backups are not available. |

**Blockers:** Destination, format, and automatic schedule remain open in [Q-09](00%20-%20START%20HERE.md).

### Module - Restore

**Purpose:** Recover the vault from a compatible backup without accidental overwrite.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-151 | Select a backup, show its information, and validate compatibility. | Lets the owner inspect a recovery source before changing the vault. | R-145, R-148 | `# Restore` | ✅ | Kivo identifies the chosen backup, shows its information, and rejects incompatible input before restore. |
| R-152 | Restore SQLite information and managed files. | Returns the two local stores needed for a usable vault. | R-151 | `# Restore`, `# Local File Storage` | ✅ | A valid restore brings back supported structured information and available managed files. |
| R-153 | Protect existing information and handle restore conflicts. | Prevents accidental overwrite of the current vault. | R-151 | `# Restore`, `Functional Rules` | ✅ | A conflict produces the documented protection or choice rather than silently replacing current information. |
| R-154 | Reject invalid or corrupted backups safely. | Prevents damaged input from changing the vault. | R-151 | `# Restore`, `Functional Rules` | ✅ | Invalid or corrupted input is refused and the current vault remains available. |
| R-155 | Require explicit confirmation before restore. | Makes the high-impact action intentional. | R-151 | `# Restore`, `Functional Rules` | ✅ | No restore changes local information until the owner confirms it. |
| R-156 | Confirm successful restore. | Gives the owner a clear end state after recovery. | R-152, R-155 | `# Restore` | ✅ | A completed restore reports success and the restored content can be opened. |

**Blockers:** Conflict choices and backup compatibility rules remain open in [Q-09](00%20-%20START%20HERE.md) and [Q-10](00%20-%20START%20HERE.md).

### Module - Import / Export

**Purpose:** Move supported vault content through portable formats without unexpected loss.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-157 | Import Markdown notes, supported files, and supported structured information. | Gives the owner a path into Kivo from existing material. | R-036, R-049, R-018 | `# Import / Export` | ✅ | Each supported import type creates readable local content or gives a clear unsupported result. |
| R-158 | Export individual notes, collections, and selected items. | Gives the owner smaller portable outputs. | R-036, R-057, R-030 | `# Import / Export` | 🟨 | Each supported selection produces the documented export without changing the source item. Collection export works; single-note and selected-item export are not built yet. |
| R-159 | Export the full vault in a supported format. | Provides a complete portable output. | R-147, R-157 | `# Import / Export` | ✅ | A full-vault export contains the supported content and required available details. |
| R-160 | Preserve as much supported metadata as possible during import and export. | Keeps organization and context from disappearing during transfer. | R-157, R-158 | `# Import / Export`, `Functional Rules` | ✅ | A documented metadata mapping preserves every supported field and identifies any field it cannot preserve. |
| R-161 | Explain unsupported formats clearly. | Prevents failed transfers from looking successful. | R-157 | `# Import / Export`, `Functional Rules` | ✅ | Unsupported input or output receives a clear explanation and no misleading partial-success state. |
| R-162 | Never delete source data during export. | Makes export a safe copy action. | R-158, R-159 | `# Import / Export`, `Functional Rules` | ✅ | After any export, the original vault content remains available and unchanged. |

**Blockers:** First-release formats and metadata mapping remain open in [Q-11](00%20-%20START%20HERE.md). Collection and full-vault export work; single-note and selected-item export are not built, so R-158 stays partly done.

---

## Phase 7 - Optional advanced features

**The goal:** The owner can enable privacy-conscious advanced discovery and assistance only after the core local vault is reliable and the scope is clear.

**Why it comes here:** These capabilities are explicitly optional and depend on stable content, local storage, and decisions about processing, privacy, and the boundary between Semantic Search and excluded AI Search.

**Where it stands:** Built in September 2026 and covered by the Phase 7 suites; see [Phase 7 Optional Advanced Features Gate Evidence](../verification/phase-7-optional-advanced-features-gate.md). All three features are off by default, and every step runs on this device. Related search ranks by shared words only, so R-163 and R-164 stay partly done until meaning-based matching is decided. The Windows desktop checks remain open.

### Module - Semantic Search

**Purpose:** Find conceptually related local content when exact words differ.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-163 | Create local semantic representations for supported content. | Supplies the information needed for meaning-based matches. | R-105, R-124 | `# Semantic Search` | 🟨 | Supported content can produce a local representation without requiring a remote service. The current build makes local word-based representations only; a meaning-based approach is still to be chosen. |
| R-164 | Search by meaning and return related notes or documents. | Finds useful material that exact-word search misses. | R-163 | `# Semantic Search` | 🟨 | A meaning-based search returns related supported items with understandable result context. Related results come from shared terms on this device, not meaning-based matching. |
| R-165 | Combine semantic results with metadata filters. | Keeps advanced matches controllable. | R-164, R-079 | `# Semantic Search` | ✅ | A semantic result set can be narrowed by the supported type, tag, or collection filters. |
| R-166 | Re-index content after significant changes. | Keeps related-content results aligned with current material. | R-163 | `# Semantic Search` | ✅ | A significant source change can trigger or request an updated local representation. |
| R-167 | Keep the feature optional, prefer local processing, and show when it is enabled. | Preserves the core-vault boundary and user understanding. | R-163 | `# Semantic Search`, `Functional Rules` | ✅ | Basic Kivo works with the feature off, and the owner can tell when semantic indexing is active. |

**Blockers:** The boundary with excluded AI Search is unresolved in [Q-13](00%20-%20START%20HERE.md). R-163 and R-164 stay partly done because the built feature ranks locally by shared words, not by meaning.

### Module - Automatic Tagging

**Purpose:** Suggest organization labels while leaving control with the owner.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-168 | Analyze supported content and suggest useful tags. | Reduces manual organization work while keeping suggestions separate from decisions. | R-062, R-163 | `# Automatic Tagging` | ✅ | Supported content produces visible tag suggestions without changing manual tags automatically. |
| R-169 | Accept or reject each tag suggestion. | Gives the owner direct control over changes. | R-168 | `# Automatic Tagging`, `Functional Rules` | ✅ | The owner can accept or reject suggestions before they affect item tags. |
| R-170 | Avoid duplicate suggestions and reuse existing tags when appropriate. | Keeps the tag list coherent. | R-168, R-065 | `# Automatic Tagging` | ✅ | Suggestions do not create duplicate names and use matching existing tags when appropriate. |
| R-171 | Keep manual tags authoritative. | Protects the owner's explicit organization choices. | R-169, R-170 | `# Automatic Tagging`, `Functional Rules` | ✅ | Automatic suggestions never remove or silently replace a manual tag. |
| R-172 | Keep the feature optional and never apply suggestions silently. | Preserves user control and the optional scope. | R-169 | `# Automatic Tagging`, `Functional Rules` | ✅ | Basic Kivo works with Automatic Tagging off and no suggestion changes an item without a clear owner action. |

**Blockers:** Allowed local processing and privacy explanation remain open in [Q-14](00%20-%20START%20HERE.md).

### Module - Document Summaries

**Purpose:** Create optional short summaries without changing the original content.

| # | Capability | Why it is needed | Depends on | Where the need came from | Status | Done when |
|---|---|---|---|---|---|---|
| R-173 | Summarize selected notes or supported documents. | Gives the owner a shorter view of long content. | R-036, R-163 | `# Document Summaries` | ✅ | A selected supported source produces a separate summary result. |
| R-174 | Show a summary separately and allow it to be copied. | Keeps summary and source distinct while supporting reuse. | R-173 | `# Document Summaries` | ✅ | The summary is visibly separate and the owner can copy its text. |
| R-175 | Save a summary as a new note when the owner chooses. | Makes a useful summary part of the vault only by explicit choice. | R-174, R-036 | `# Document Summaries` | ✅ | Choosing save creates a note and leaving it unsaved leaves the source unchanged. |
| R-176 | Regenerate a summary when requested. | Lets the owner retry or request a different result. | R-173 | `# Document Summaries` | ✅ | A regenerate action produces a new summary without overwriting the original source. |
| R-177 | Keep the original unchanged, keep the feature optional, and prefer local processing when practical. | Protects source content and the private-vault boundary. | R-173 | `# Document Summaries`, `Functional Rules` | ✅ | The source remains byte-for-byte or content-for-content unchanged, the core vault works with the feature off, and the processing choice is visible. |

**Blockers:** Processing method, local model choice, and retention rules remain open in [Q-15](00%20-%20START%20HERE.md).

---

## Deliberately left out

| What | Why it is not here |
|---|---|
| Cloud Sync | Explicitly excluded from the current core scope. `# Current Scope`. |
| Paywall or premium system | Explicitly excluded from the current core scope. `# Current Scope`. |
| Web backend or cloud backend | The product is local-first and the routing section says no web server is required. `# Current Scope`, `# ROUTING`, and `# DO NOT ADD FOR NOW`. |
| Remote sign-in service | Explicitly excluded from the current core scope. `# DO NOT ADD FOR NOW`. |
| RAG or Vault Assistant | Explicitly excluded from the current core scope. `# Current Scope` and `# DO NOT ADD FOR NOW`. |
| AI Search | Explicitly excluded from the current core scope. Its boundary with optional Semantic Search remains [Q-13](00%20-%20START%20HERE.md). |
| Secure Secrets module | Explicitly excluded from the current core scope. Its boundary with Vault Lock and Encryption remains [Q-07](00%20-%20START%20HERE.md). |
| `06 - SCREENS BY ROLE` | This is an analysis note, not a product capability. Kivo describes one owner role, so the optional note was skipped. |

## Implementation handoff

Implementation begins by selecting the next eligible `R-` item: the earliest item marked ⭕ whose dependencies and blockers are clear. Before implementing it, read its supporting findings in [02 - FINDINGS](02%20-%20FINDINGS.md), the related proposed arrangement in [03 - SYSTEM ARCHITECTURE](03%20-%20SYSTEM%20ARCHITECTURE.md), the foundation flow in [04 - DIAGRAMS](04%20-%20DIAGRAMS.md), and unresolved questions in [00 - START HERE](00%20-%20START%20HERE.md).

Phases 1 to 7 are built. The remaining candidates are R-080 (a search type filter) and R-150 (automatic local backups, when the owner chooses them), and the open checks recorded in the Phase 5 to 7 gate records come before any release claim.

This roadmap determines what Kivo must be able to do, which module owns each capability, and the order in which capabilities become eligible. It does not determine how to implement them. A separate implementation-planning workflow should break the selected `R-` item into technical tasks, acceptance checks, and coding-agent work. Phase 1 was planned that way; its plan, its execution rulings, and its checked evidence are in [Phase 1 Delivery Gate Evidence](../verification/phase-1-delivery-gate.md) and the [Phase 1 implementation plan](../visual-plans/kivo-phase-1-interface-first-setup.md).

## Status legend

| Emoji | Means |
|---|---|
| ✅ | Finished - built, checked, working |
| 🟨 | Being worked on |
| ⭕ | Not started - waiting its turn |
| ❌ | Blocked - something is stopping it |
| 🔵 | Already there - found in the supplied material, built before this plan |
| ⬜ | Dropped - decided against, kept for the record |
| ❓ | Unclear - the material does not say |
