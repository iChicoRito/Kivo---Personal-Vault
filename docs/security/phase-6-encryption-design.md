# Phase 6 encryption design

This document describes the field encryption that Phase 6 adds. It does not describe full-disk encryption. External security review is required before Kivo makes a release claim about this design.

## Existing password boundaries

Kivo already has two separate passwords. App lock uses an Argon2id verifier in `security`. Password Manager derives its own key from a different password and stores encrypted credential passwords in `credentials`. Neither password currently unlocks the other feature. Phase 6 preserves both password boundaries. Locking the app also clears the Password Manager key from memory. The database backup includes encrypted credentials, but the JSON export does not include credentials or their passwords.

## Protected data

When the owner turns on field encryption, a random 32-byte vault key protects `items.description`, `items.content`, and `items.url`. It also protects every managed file and each note version body. Protection covers live and trashed items. The plaintext columns remain empty while their values are protected. The app stores nonces and ciphertext as SQLite BLOB values.

Titles, tags, item kinds, dates, collection links, favorite flags, file names, file sizes, activity rows, and credential metadata remain readable in the database. The app must describe this boundary in Settings. A lock hides the interface but does not encrypt plaintext data. The database connection remains available while the app is locked.

The app derives a key-encryption key from the app-lock password with Argon2id and a fresh random salt. AES-256-GCM wraps the vault key with a fresh random 12-byte nonce. Changing the app-lock password updates its verifier and wrapped key in one database transaction. The data key does not change. The app rejects removal of app lock while field encryption is on.

Each protected value gets a fresh random nonce. Encryption uses a domain label and stable item or version identifier as associated data. A file uses its item identifier, not its changeable name. This prevents a ciphertext from being moved to another record without detection. The app must reject a bad nonce, a failed authentication tag, or a missing key. It must not log passwords, keys, plaintext fields, or file bytes.

## Search and derived data

Phase 5 stores note bodies and extracted PDF text in `item_search`. Phase 7 stores weighted terms in `item_vectors`. These tables must not retain terms from protected content while encryption is on. The app removes those rows before it reports that encryption is enabled. Title and tag search still works because those fields remain plaintext. If Related search needs protected content, it can calculate matches from decrypted values in memory while the vault is unlocked. It must not persist those values or their derived terms. Tag suggestions and summaries read decrypted content only while unlocked.

Note versions need the same protection as current note content. A restored version cannot be read without the vault key. Deleting an index row does not guarantee that older plaintext has disappeared from SQLite free pages, the write-ahead log, old backups, operating-system caches, or storage-device history. The enable flow must use SQLite secure deletion and a database rebuild after the conversion. The gate must inspect a fresh database and its journal files. Kivo must not promise secure deletion of older copies.

## File and backup boundaries

Managed files use a nonce followed by authenticated ciphertext. The `files.byte_size` column keeps the original size. Enabling or disabling protection must stage file changes safely, report progress, and permit a retry after interruption. The app must not report success until database rows and file bytes agree. Opening an encrypted file in another application requires a decrypted temporary copy. That copy is outside the encrypted vault. The UI must warn the owner and must not promise that closing the other application removes every copy.

A backup is a folder with a consistent SQLite snapshot, a manifest, and managed file bytes. A backup made while field encryption is on keeps protected database values and file bytes encrypted. Manifest hashes detect accidental corruption, not a malicious change to the backup and manifest together. Restore validates versions, names, counts, hashes, and database integrity before touching the live vault. It makes a safety copy first and restores that copy if replacement fails. JSON and Markdown exports can contain plaintext. The export UI must say this before it writes them.

## Review gate

An independent security reviewer must examine nonce use, key lifetime, interruption recovery, SQLite remnants, backup and restore, decrypted temporary files, and direct command calls while the interface is locked. Record the review and remaining limits in the Phase 6 verification gate. Until that review happens, the gate stays open.
