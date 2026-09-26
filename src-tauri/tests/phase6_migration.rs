use rusqlite::{params, Connection};

const MIGRATION: &str = include_str!("../migrations/0012_phase_six_protection.sql");

#[test]
fn phase_six_defaults_protection_off_and_keeps_existing_notes_and_versions() {
    let connection = Connection::open_in_memory().unwrap();
    connection
        .pragma_update(None, "foreign_keys", "ON")
        .unwrap();
    connection
        .execute_batch(
            "CREATE TABLE preferences (id INTEGER PRIMARY KEY, theme TEXT);
             CREATE TABLE security (id INTEGER PRIMARY KEY, password_verifier TEXT);
             CREATE TABLE items (id TEXT PRIMARY KEY, content TEXT);
             CREATE TABLE files (item_id TEXT PRIMARY KEY, byte_size INTEGER);
             CREATE TABLE item_versions (
               id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
               title TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL
             );
             INSERT INTO preferences VALUES (1, 'dark');
             INSERT INTO security VALUES (1, NULL);
             INSERT INTO items VALUES ('note-1', 'private original');
             INSERT INTO items VALUES ('file-1', NULL);
             INSERT INTO files VALUES ('file-1', 32);
             INSERT INTO item_versions VALUES ('version-1', 'note-1', 'Old', 'private earlier', '2026-01-01');",
        )
        .unwrap();

    connection.execute_batch(MIGRATION).unwrap();

    let defaults: (i64, i64, i64) = connection
        .query_row(
            "SELECT auto_lock_minutes, (SELECT encryption_enabled FROM security WHERE id = 1),
                    (SELECT encrypted FROM files WHERE item_id = 'file-1')
             FROM preferences WHERE id = 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .unwrap();
    assert_eq!(defaults, (0, 0, 0));

    let previous: (String, Option<Vec<u8>>) = connection
        .query_row(
            "SELECT content, encrypted_content FROM item_versions WHERE id = 'version-1'",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap();
    assert_eq!(previous, ("private earlier".into(), None));

    connection
        .execute(
            "INSERT INTO item_secrets (item_id, nonce, ciphertext) VALUES (?1, ?2, ?3)",
            params!["note-1", vec![0_u8; 12], vec![1_u8; 16]],
        )
        .unwrap();
    connection
        .execute("DELETE FROM items WHERE id = 'note-1'", [])
        .unwrap();
    let secrets: i64 = connection
        .query_row("SELECT COUNT(*) FROM item_secrets", [], |row| row.get(0))
        .unwrap();
    assert_eq!(secrets, 0);
}
