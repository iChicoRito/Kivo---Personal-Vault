use rusqlite::{params, Connection};

const MIGRATION: &str = include_str!("../migrations/0013_phase_seven.sql");

#[test]
fn phase_seven_defaults_features_off_and_vectors_cascade_on_delete() {
    let connection = Connection::open_in_memory().unwrap();
    connection
        .pragma_update(None, "foreign_keys", "ON")
        .unwrap();
    connection
        .execute_batch(
            "CREATE TABLE preferences (id INTEGER PRIMARY KEY, auto_lock_minutes INTEGER NOT NULL DEFAULT 0);
             CREATE TABLE items (id TEXT PRIMARY KEY);
             INSERT INTO preferences (id) VALUES (1);
             INSERT INTO items (id) VALUES ('note-1');",
        )
        .unwrap();

    connection.execute_batch(MIGRATION).unwrap();

    let flags: (i64, i64, i64) = connection
        .query_row(
            "SELECT semantic_search, auto_tag, summaries FROM preferences WHERE id = 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .unwrap();
    assert_eq!(flags, (0, 0, 0));

    let vectors_table: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'item_vectors'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(vectors_table, 1, "the item_vectors table exists");

    connection
        .execute(
            "INSERT INTO item_vectors (item_id, terms, updated_at) VALUES (?1, ?2, ?3)",
            params!["note-1", "[[\"budget\",1.0]]", "2026-01-01"],
        )
        .unwrap();
    connection
        .execute("DELETE FROM items WHERE id = 'note-1'", [])
        .unwrap();
    let remaining: i64 = connection
        .query_row("SELECT count(*) FROM item_vectors", [], |row| row.get(0))
        .unwrap();
    assert_eq!(remaining, 0);
}
