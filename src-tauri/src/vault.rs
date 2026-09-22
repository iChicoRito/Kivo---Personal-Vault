use std::fs;
use std::path::{Path, PathBuf};

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

use crate::database::DatabaseState;
use crate::security::{hash_secret, secret_matches};

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileDetails {
    pub original_name: String,
    pub byte_size: i64,
    pub imported_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Item {
    pub id: String,
    pub kind: String,
    pub title: String,
    pub description: String,
    pub content: Option<String>,
    pub url: Option<String>,
    pub collection_id: Option<String>,
    pub is_favorite: bool,
    pub is_pinned: bool,
    pub deleted_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub tags: Vec<String>,
    pub file: Option<FileDetails>,
    pub file_missing: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemSummary {
    pub id: String,
    pub kind: String,
    pub title: String,
    pub is_favorite: bool,
    pub is_pinned: bool,
    pub collection_id: Option<String>,
    pub updated_at: String,
    pub deleted_at: Option<String>,
    pub file: Option<FileDetails>,
    pub file_missing: bool,
    /// Raw note body, so list cards can show a short text preview.
    pub content: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub sort_order: i64,
    pub created_at: String,
    pub icon: Option<String>,
    pub item_count: i64,
    pub protection: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub count: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEntry {
    pub id: i64,
    pub item_id: Option<String>,
    pub action: String,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexState {
    pub item_id: String,
    pub needs_index: bool,
    pub indexed_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentItems {
    pub opened: Vec<ItemSummary>,
    pub modified: Vec<ItemSummary>,
    pub created: Vec<ItemSummary>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultSummary {
    pub item_count: i64,
    pub note_count: i64,
    pub source_count: i64,
    pub file_count: i64,
    pub favorite_count: i64,
    pub collection_count: i64,
    pub tag_count: i64,
    pub trash_count: i64,
    pub file_bytes: i64,
    pub database_bytes: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemInput {
    pub id: Option<String>,
    pub kind: String,
    pub title: String,
    #[serde(default)]
    pub description: String,
    pub content: Option<String>,
    pub url: Option<String>,
    pub collection_id: Option<String>,
    pub is_favorite: Option<bool>,
    #[serde(default)]
    pub is_pinned: Option<bool>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemFilter {
    pub kind: Option<String>,
    pub collection_id: Option<String>,
    pub tag_id: Option<String>,
    pub favorite: Option<bool>,
    pub query: Option<String>,
    pub sort: Option<String>,
    #[serde(default)]
    pub trashed: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionInput {
    pub id: Option<String>,
    pub name: String,
    pub icon: Option<String>,
    pub protection: Option<String>,
    pub secret: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagInput {
    pub id: Option<String>,
    pub name: String,
}

// The raw item row plus its optional file record, before tags and disk state join in.
struct StoredItem {
    id: String,
    kind: String,
    title: String,
    description: String,
    content: Option<String>,
    url: Option<String>,
    collection_id: Option<String>,
    is_favorite: bool,
    is_pinned: bool,
    deleted_at: Option<String>,
    created_at: String,
    updated_at: String,
    original_name: Option<String>,
    byte_size: Option<i64>,
    imported_at: Option<String>,
    stored_name: Option<String>,
}

fn new_id(connection: &Connection) -> rusqlite::Result<String> {
    connection.query_row("SELECT lower(hex(randomblob(16)))", [], |row| row.get(0))
}

// `%` and `_` are LIKE wildcards, so a literal query escapes them and the SQL
// uses `ESCAPE '\'`. The backslash itself must be escaped first.
fn escaped_like_pattern(query: &str) -> String {
    let mut pattern = String::with_capacity(query.len() + 2);
    pattern.push('%');

    for character in query.chars() {
        if matches!(character, '\\' | '%' | '_') {
            pattern.push('\\');
        }

        pattern.push(character);
    }

    pattern.push('%');
    pattern
}

fn upsert_index_state(connection: &Connection, item_id: &str) -> rusqlite::Result<()> {
    connection.execute(
        "INSERT INTO index_state (item_id, needs_index, indexed_at, updated_at)
         VALUES (?1, 1, NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
         ON CONFLICT(item_id) DO UPDATE SET
           needs_index = 1,
           indexed_at = NULL,
           updated_at = excluded.updated_at",
        params![item_id],
    )?;

    Ok(())
}

fn read_item_tags(connection: &Connection, item_id: &str) -> rusqlite::Result<Vec<String>> {
    let mut statement = connection.prepare(
        "SELECT t.name
         FROM tags t
         JOIN item_tags it ON it.tag_id = t.id
         WHERE it.item_id = ?1
         ORDER BY t.name COLLATE NOCASE ASC",
    )?;

    let names = statement
        .query_map(params![item_id], |row| row.get::<_, String>(0))?
        .collect::<rusqlite::Result<Vec<String>>>()?;

    Ok(names)
}

fn read_item(
    connection: &Connection,
    files_dir: &Path,
    id: &str,
) -> rusqlite::Result<Option<Item>> {
    let stored = connection
        .query_row(
            "SELECT i.id, i.kind, i.title, i.description, i.content, i.url,
                    i.collection_id, i.is_favorite, i.is_pinned, i.deleted_at,
                    i.created_at, i.updated_at,
                    f.original_name, f.byte_size, f.imported_at, f.stored_name
             FROM items i
             LEFT JOIN files f ON f.item_id = i.id
             WHERE i.id = ?1",
            params![id],
            |row| {
                Ok(StoredItem {
                    id: row.get(0)?,
                    kind: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    content: row.get(4)?,
                    url: row.get(5)?,
                    collection_id: row.get(6)?,
                    is_favorite: row.get::<_, i64>(7)? != 0,
                    is_pinned: row.get::<_, i64>(8)? != 0,
                    deleted_at: row.get(9)?,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                    original_name: row.get(12)?,
                    byte_size: row.get(13)?,
                    imported_at: row.get(14)?,
                    stored_name: row.get(15)?,
                })
            },
        )
        .optional()?;

    let Some(stored) = stored else {
        return Ok(None);
    };

    let tags = read_item_tags(connection, &stored.id)?;
    let is_file = stored.kind == "file";

    let file = if is_file {
        match (&stored.original_name, stored.byte_size, &stored.imported_at) {
            (Some(original_name), Some(byte_size), Some(imported_at)) => Some(FileDetails {
                original_name: original_name.clone(),
                byte_size,
                imported_at: imported_at.clone(),
            }),
            _ => None,
        }
    } else {
        None
    };

    let file_missing = is_file
        && stored
            .stored_name
            .as_deref()
            .map(|name| !files_dir.join(name).is_file())
            .unwrap_or(false);

    Ok(Some(Item {
        id: stored.id,
        kind: stored.kind,
        title: stored.title,
        description: stored.description,
        content: stored.content,
        url: stored.url,
        collection_id: stored.collection_id,
        is_favorite: stored.is_favorite,
        is_pinned: stored.is_pinned,
        deleted_at: stored.deleted_at,
        created_at: stored.created_at,
        updated_at: stored.updated_at,
        tags,
        file,
        file_missing,
    }))
}

// Shared by list_items and list_recent_items so a summary keeps the same file
// and file_missing answers everywhere. The column order is load-bearing.
const ITEM_SUMMARY_COLUMNS: &str = "i.id, i.kind, i.title, i.is_favorite, i.is_pinned,
            i.collection_id, i.updated_at, i.deleted_at,
            f.stored_name, f.original_name, f.byte_size, f.imported_at, i.content";

fn map_summary_row(row: &rusqlite::Row<'_>, files_dir: &Path) -> rusqlite::Result<ItemSummary> {
    let kind: String = row.get(1)?;
    let stored_name: Option<String> = row.get(8)?;
    let file_missing = kind == "file"
        && stored_name
            .as_deref()
            .map(|name| !files_dir.join(name).is_file())
            .unwrap_or(false);

    let original_name: Option<String> = row.get(9)?;
    let byte_size: Option<i64> = row.get(10)?;
    let imported_at: Option<String> = row.get(11)?;

    let file = match (original_name, byte_size, imported_at) {
        (Some(original_name), Some(byte_size), Some(imported_at)) => Some(FileDetails {
            original_name,
            byte_size,
            imported_at,
        }),
        _ => None,
    };

    Ok(ItemSummary {
        id: row.get(0)?,
        kind,
        title: row.get(2)?,
        is_favorite: row.get::<_, i64>(3)? != 0,
        is_pinned: row.get::<_, i64>(4)? != 0,
        collection_id: row.get(5)?,
        updated_at: row.get(6)?,
        deleted_at: row.get(7)?,
        file,
        file_missing,
        content: row.get(12)?,
    })
}

fn read_item_summaries(
    connection: &Connection,
    files_dir: &Path,
    filter: Option<&ItemFilter>,
) -> rusqlite::Result<Vec<ItemSummary>> {
    // Trashed listings flip the scope and always order by the deletion stamp.
    let trashed = filter.and_then(|filter| filter.trashed) == Some(true);
    let mut sql = format!(
        "SELECT {ITEM_SUMMARY_COLUMNS}
         FROM items i
         LEFT JOIN files f ON f.item_id = i.id
         WHERE i.deleted_at IS {}",
        if trashed { "NOT NULL" } else { "NULL" }
    );
    let mut values: Vec<rusqlite::types::Value> = Vec::new();

    if let Some(filter) = filter {
        if let Some(kind) = filter.kind.as_deref().filter(|value| !value.is_empty()) {
            sql.push_str(" AND i.kind = ?");
            values.push(rusqlite::types::Value::Text(kind.to_string()));
        }

        if let Some(collection_id) = filter
            .collection_id
            .as_deref()
            .filter(|value| !value.is_empty())
        {
            sql.push_str(" AND i.collection_id = ?");
            values.push(rusqlite::types::Value::Text(collection_id.to_string()));
        }

        if let Some(tag_id) = filter.tag_id.as_deref().filter(|value| !value.is_empty()) {
            sql.push_str(
                " AND EXISTS (SELECT 1 FROM item_tags it
                              WHERE it.item_id = i.id AND it.tag_id = ?)",
            );
            values.push(rusqlite::types::Value::Text(tag_id.to_string()));
        }

        if let Some(favorite) = filter.favorite {
            sql.push_str(" AND i.is_favorite = ?");
            values.push(rusqlite::types::Value::Integer(i64::from(favorite)));
        }

        if let Some(query) = filter
            .query
            .as_deref()
            .map(str::trim)
            .filter(|q| !q.is_empty())
        {
            let pattern = escaped_like_pattern(query);
            sql.push_str(
                " AND (i.title LIKE ? ESCAPE '\\'
                    OR i.description LIKE ? ESCAPE '\\'
                    OR i.content LIKE ? ESCAPE '\\'
                    OR i.url LIKE ? ESCAPE '\\'
                    OR f.original_name LIKE ? ESCAPE '\\'
                    OR EXISTS (SELECT 1 FROM item_tags it JOIN tags t ON t.id = it.tag_id
                               WHERE it.item_id = i.id AND t.name LIKE ? ESCAPE '\\')
                    OR EXISTS (SELECT 1 FROM collections c
                               WHERE c.id = i.collection_id AND c.name LIKE ? ESCAPE '\\'))",
            );

            for _ in 0..7 {
                values.push(rusqlite::types::Value::Text(pattern.clone()));
            }
        }
    }

    let order = if trashed {
        "i.deleted_at DESC"
    } else {
        match filter.and_then(|filter| filter.sort.as_deref()) {
            Some("title") => "i.title COLLATE NOCASE ASC, i.updated_at DESC",
            Some("created") => "i.created_at DESC, i.updated_at DESC",
            Some("kind") => "i.kind ASC, i.updated_at DESC",
            _ => "i.updated_at DESC, i.title COLLATE NOCASE ASC",
        }
    };

    sql.push_str(" ORDER BY ");
    sql.push_str(order);

    let mut statement = connection.prepare(&sql)?;

    let summaries = statement
        .query_map(rusqlite::params_from_iter(values.iter()), |row| {
            map_summary_row(row, files_dir)
        })?
        .collect::<rusqlite::Result<Vec<ItemSummary>>>()?;

    Ok(summaries)
}

// One Recent group: live items whose newest matching activity row decides the
// order. The action list binds twice, once for the filter and once for the sort.
fn read_recent_group(
    connection: &Connection,
    files_dir: &Path,
    actions: &[&str],
) -> rusqlite::Result<Vec<ItemSummary>> {
    let placeholders = vec!["?"; actions.len()].join(", ");
    let sql = format!(
        "SELECT {ITEM_SUMMARY_COLUMNS}
         FROM items i
         LEFT JOIN files f ON f.item_id = i.id
         WHERE i.deleted_at IS NULL
           AND EXISTS (SELECT 1 FROM activity a
                       WHERE a.item_id = i.id AND a.action IN ({placeholders}))
         ORDER BY (SELECT MAX(a.id) FROM activity a
                   WHERE a.item_id = i.id AND a.action IN ({placeholders})) DESC
         LIMIT 50"
    );

    let mut values: Vec<rusqlite::types::Value> = Vec::new();

    for _ in 0..2 {
        for action in actions {
            values.push(rusqlite::types::Value::Text((*action).to_string()));
        }
    }

    let mut statement = connection.prepare(&sql)?;

    let summaries = statement
        .query_map(rusqlite::params_from_iter(values.iter()), |row| {
            map_summary_row(row, files_dir)
        })?
        .collect::<rusqlite::Result<Vec<ItemSummary>>>()?;

    Ok(summaries)
}

const COLLECTION_SELECT: &str = "SELECT c.id, c.name, c.sort_order, c.created_at, c.icon,
            (SELECT COUNT(*) FROM items i
             WHERE i.collection_id = c.id AND i.deleted_at IS NULL),
            c.protection
     FROM collections c";

fn read_collection(connection: &Connection, id: &str) -> rusqlite::Result<Option<Collection>> {
    connection
        .query_row(
            &format!("{COLLECTION_SELECT} WHERE c.id = ?1"),
            params![id],
            |row| {
                Ok(Collection {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    sort_order: row.get(2)?,
                    created_at: row.get(3)?,
                    icon: row.get(4)?,
                    item_count: row.get(5)?,
                    protection: row.get(6)?,
                })
            },
        )
        .optional()
}

fn read_collections(connection: &Connection) -> rusqlite::Result<Vec<Collection>> {
    let mut statement = connection.prepare(&format!(
        "{COLLECTION_SELECT} ORDER BY c.sort_order ASC, c.name COLLATE NOCASE ASC"
    ))?;

    let collections = statement
        .query_map([], |row| {
            Ok(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                sort_order: row.get(2)?,
                created_at: row.get(3)?,
                icon: row.get(4)?,
                item_count: row.get(5)?,
                protection: row.get(6)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<Collection>>>()?;

    Ok(collections)
}

const TAG_SELECT: &str = "SELECT t.id, t.name,
            (SELECT COUNT(*) FROM item_tags it
             JOIN items i ON i.id = it.item_id
             WHERE it.tag_id = t.id AND i.deleted_at IS NULL)
     FROM tags t";

fn read_tags(connection: &Connection) -> rusqlite::Result<Vec<Tag>> {
    let mut statement =
        connection.prepare(&format!("{TAG_SELECT} ORDER BY t.name COLLATE NOCASE ASC"))?;

    let tags = statement
        .query_map([], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                count: row.get(2)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<Tag>>>()?;

    Ok(tags)
}

fn read_tag(connection: &Connection, id: &str) -> rusqlite::Result<Option<Tag>> {
    connection
        .query_row(
            &format!("{TAG_SELECT} WHERE t.id = ?1"),
            params![id],
            |row| {
                Ok(Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    count: row.get(2)?,
                })
            },
        )
        .optional()
}

fn read_activity(connection: &Connection) -> rusqlite::Result<Vec<ActivityEntry>> {
    let mut statement = connection.prepare(
        "SELECT id, item_id, action, created_at
         FROM activity
         ORDER BY id DESC
         LIMIT 100",
    )?;

    let entries = statement
        .query_map([], |row| {
            Ok(ActivityEntry {
                id: row.get(0)?,
                item_id: row.get(1)?,
                action: row.get(2)?,
                created_at: row.get(3)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<ActivityEntry>>>()?;

    Ok(entries)
}

fn read_index_state(connection: &Connection) -> rusqlite::Result<Vec<IndexState>> {
    let mut statement = connection.prepare(
        "SELECT item_id, needs_index, indexed_at
         FROM index_state
         ORDER BY updated_at DESC, item_id ASC",
    )?;

    let rows = statement
        .query_map([], |row| {
            Ok(IndexState {
                item_id: row.get(0)?,
                needs_index: row.get::<_, i64>(1)? != 0,
                indexed_at: row.get(2)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<IndexState>>>()?;

    Ok(rows)
}

// Validation failures keep their exact user-facing text; SQL failures carry the
// same "Could not save the item" prefix as the phase-one commands.
fn write_item(connection: &mut Connection, input: &ItemInput) -> Result<String, String> {
    let title = input.title.trim().to_string();

    if title.is_empty() {
        return Err("Item title is required".to_string());
    }

    let is_update = input.id.is_some();

    // An existing item keeps its stored kind, content, and url. Only the fields
    // that belong to its kind are rewritten, so a file item can update its
    // metadata without gaining note or source data.
    let (id, kind, stored_content, stored_url) = match &input.id {
        Some(id) => {
            let stored: Option<(String, Option<String>, Option<String>)> = connection
                .query_row(
                    "SELECT kind, content, url FROM items WHERE id = ?1",
                    params![id],
                    |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
                )
                .optional()
                .map_err(|error| format!("Could not save the item: {error}"))?;

            let (stored_kind, stored_content, stored_url) =
                stored.ok_or_else(|| "Item was not found".to_string())?;

            if input.kind != stored_kind {
                return Err("Item type cannot change".to_string());
            }

            (id.clone(), stored_kind, stored_content, stored_url)
        }
        None => {
            match input.kind.as_str() {
                "note" | "source" => {}
                "file" => return Err("File items are created by import".to_string()),
                _ => return Err("Items must be notes, sources, or files".to_string()),
            }

            let id =
                new_id(connection).map_err(|error| format!("Could not save the item: {error}"))?;

            (id, input.kind.clone(), None, None)
        }
    };

    let collection_id = match &input.collection_id {
        Some(collection_id) => {
            let exists: i64 = connection
                .query_row(
                    "SELECT COUNT(*) FROM collections WHERE id = ?1",
                    params![collection_id],
                    |row| row.get(0),
                )
                .map_err(|error| format!("Could not save the item: {error}"))?;

            if exists == 0 {
                return Err("Collection does not exist".to_string());
            }

            Some(collection_id.clone())
        }
        None => None,
    };

    let (content, url) = match kind.as_str() {
        "note" => (Some(input.content.clone().unwrap_or_default()), None),
        "source" => {
            let url = input.url.as_deref().unwrap_or("").trim();

            if url.is_empty() {
                return Err("Source items need a web address".to_string());
            }

            (input.content.clone(), Some(url.to_string()))
        }
        _ => (stored_content, stored_url),
    };

    let description = input.description.clone();
    let is_favorite = i64::from(input.is_favorite.unwrap_or(false));
    let is_pinned = i64::from(input.is_pinned.unwrap_or(false));
    let action = if is_update { "updated" } else { "created" };

    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not save the item: {error}"))?;

    if is_update {
        transaction
            .execute(
                "UPDATE items
                 SET title = ?1, description = ?2, content = ?3, url = ?4,
                     collection_id = ?5, is_favorite = ?6, is_pinned = ?7,
                     updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                 WHERE id = ?8",
                params![
                    title,
                    description,
                    content,
                    url,
                    collection_id,
                    is_favorite,
                    is_pinned,
                    id
                ],
            )
            .map_err(|error| format!("Could not save the item: {error}"))?;
    } else {
        transaction
            .execute(
                "INSERT INTO items
                   (id, kind, title, description, content, url, collection_id, is_favorite,
                    is_pinned, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9,
                         strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                         strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
                params![
                    id,
                    kind,
                    title,
                    description,
                    content,
                    url,
                    collection_id,
                    is_favorite,
                    is_pinned
                ],
            )
            .map_err(|error| format!("Could not save the item: {error}"))?;
    }

    transaction
        .execute(
            "INSERT INTO activity (item_id, action, created_at)
             VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
            params![id, action],
        )
        .map_err(|error| format!("Could not save the item: {error}"))?;

    upsert_index_state(&transaction, &id)
        .map_err(|error| format!("Could not save the item: {error}"))?;

    transaction
        .commit()
        .map_err(|error| format!("Could not save the item: {error}"))?;

    Ok(id)
}

fn replace_item_tags(
    connection: &mut Connection,
    item_id: &str,
    tags: &[String],
) -> Result<Vec<String>, String> {
    let mut seen = std::collections::HashSet::new();
    let mut names = Vec::new();

    for tag in tags {
        let name = tag.trim();

        if name.is_empty() {
            continue;
        }

        // Case-insensitive dedupe, first spelling wins.
        if seen.insert(name.to_lowercase()) {
            names.push(name.to_string());
        }
    }

    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not save the item tags: {error}"))?;

    let exists: i64 = transaction
        .query_row(
            "SELECT COUNT(*) FROM items WHERE id = ?1",
            params![item_id],
            |row| row.get(0),
        )
        .map_err(|error| format!("Could not save the item tags: {error}"))?;

    if exists == 0 {
        return Err("Item was not found".to_string());
    }

    transaction
        .execute("DELETE FROM item_tags WHERE item_id = ?1", params![item_id])
        .map_err(|error| format!("Could not save the item tags: {error}"))?;

    let mut stored = Vec::with_capacity(names.len());

    for name in &names {
        let existing: Option<String> = transaction
            .query_row(
                "SELECT id FROM tags WHERE name = ?1 COLLATE NOCASE",
                params![name],
                |row| row.get(0),
            )
            .optional()
            .map_err(|error| format!("Could not save the item tags: {error}"))?;

        let tag_id = match existing {
            Some(tag_id) => tag_id,
            None => {
                let tag_id = new_id(&transaction)
                    .map_err(|error| format!("Could not save the item tags: {error}"))?;

                transaction
                    .execute(
                        "INSERT INTO tags (id, name, created_at)
                         VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
                        params![tag_id, name],
                    )
                    .map_err(|error| format!("Could not save the item tags: {error}"))?;

                tag_id
            }
        };

        transaction
            .execute(
                "INSERT INTO item_tags (item_id, tag_id) VALUES (?1, ?2)",
                params![item_id, tag_id],
            )
            .map_err(|error| format!("Could not save the item tags: {error}"))?;

        stored.push(name.clone());
    }

    transaction
        .execute(
            "UPDATE items
             SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE id = ?1",
            params![item_id],
        )
        .map_err(|error| format!("Could not save the item tags: {error}"))?;

    transaction
        .execute(
            "INSERT INTO activity (item_id, action, created_at)
             VALUES (?1, 'updated', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
            params![item_id],
        )
        .map_err(|error| format!("Could not save the item tags: {error}"))?;

    transaction
        .commit()
        .map_err(|error| format!("Could not save the item tags: {error}"))?;

    Ok(stored)
}

fn write_item_pin(connection: &mut Connection, id: &str, pinned: bool) -> Result<(), String> {
    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not update the item: {error}"))?;

    let updated = transaction
        .execute(
            "UPDATE items SET is_pinned = ?1 WHERE id = ?2",
            params![i64::from(pinned), id],
        )
        .map_err(|error| format!("Could not update the item: {error}"))?;

    if updated == 0 {
        return Err("Item was not found".to_string());
    }

    transaction
        .commit()
        .map_err(|error| format!("Could not update the item: {error}"))
}

fn write_items_favorite(
    connection: &mut Connection,
    ids: &[String],
    favorite: bool,
) -> Result<(), String> {
    if ids.is_empty() {
        return Ok(());
    }

    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not update the items: {error}"))?;

    for id in ids {
        transaction
            .execute(
                "UPDATE items SET is_favorite = ?1 WHERE id = ?2",
                params![i64::from(favorite), id],
            )
            .map_err(|error| format!("Could not update the items: {error}"))?;
    }

    transaction
        .commit()
        .map_err(|error| format!("Could not update the items: {error}"))
}

fn write_items_collection(
    connection: &mut Connection,
    ids: &[String],
    collection_id: Option<&str>,
) -> Result<(), String> {
    if let Some(collection_id) = collection_id {
        let exists: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM collections WHERE id = ?1",
                params![collection_id],
                |row| row.get(0),
            )
            .map_err(|error| format!("Could not move the items: {error}"))?;

        if exists == 0 {
            return Err("Collection does not exist".to_string());
        }
    }

    if ids.is_empty() {
        return Ok(());
    }

    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not move the items: {error}"))?;

    for id in ids {
        transaction
            .execute(
                "UPDATE items SET collection_id = ?1 WHERE id = ?2",
                params![collection_id, id],
            )
            .map_err(|error| format!("Could not move the items: {error}"))?;
    }

    transaction
        .commit()
        .map_err(|error| format!("Could not move the items: {error}"))
}

fn write_trashed_items(connection: &mut Connection, ids: &[String]) -> Result<(), String> {
    if ids.is_empty() {
        return Ok(());
    }

    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not move the items to Trash: {error}"))?;

    for id in ids {
        let updated = transaction
            .execute(
                "UPDATE items
                 SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                 WHERE id = ?1 AND deleted_at IS NULL",
                params![id],
            )
            .map_err(|error| format!("Could not move the items to Trash: {error}"))?;

        if updated == 0 {
            continue;
        }

        transaction
            .execute(
                "INSERT INTO activity (item_id, action, created_at)
                 VALUES (?1, 'trashed', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
                params![id],
            )
            .map_err(|error| format!("Could not move the items to Trash: {error}"))?;
    }

    transaction
        .commit()
        .map_err(|error| format!("Could not move the items to Trash: {error}"))
}

fn write_restored_items(connection: &mut Connection, ids: &[String]) -> Result<(), String> {
    if ids.is_empty() {
        return Ok(());
    }

    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not restore the items: {error}"))?;

    for id in ids {
        let updated = transaction
            .execute(
                "UPDATE items SET deleted_at = NULL
                 WHERE id = ?1 AND deleted_at IS NOT NULL",
                params![id],
            )
            .map_err(|error| format!("Could not restore the items: {error}"))?;

        if updated == 0 {
            continue;
        }

        transaction
            .execute(
                "INSERT INTO activity (item_id, action, created_at)
                 VALUES (?1, 'restored', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
                params![id],
            )
            .map_err(|error| format!("Could not restore the items: {error}"))?;
    }

    transaction
        .commit()
        .map_err(|error| format!("Could not restore the items: {error}"))
}

// Reads the managed names first, deletes the rows (files, item_tags, and
// index_state cascade), then removes the bytes best effort. An id that is not
// trashed is ignored, so a live item can never be destroyed through this path.
fn remove_items_permanently(
    connection: &mut Connection,
    files_dir: &Path,
    ids: &[String],
) -> Result<(), String> {
    if ids.is_empty() {
        return Ok(());
    }

    let mut stored_names: Vec<String> = Vec::new();

    {
        let mut statement = connection
            .prepare(
                "SELECT f.stored_name
                 FROM files f
                 JOIN items i ON i.id = f.item_id
                 WHERE i.id = ?1 AND i.deleted_at IS NOT NULL",
            )
            .map_err(|error| format!("Could not delete the items: {error}"))?;

        for id in ids {
            let stored_name = statement
                .query_row(params![id], |row| row.get::<_, String>(0))
                .optional()
                .map_err(|error| format!("Could not delete the items: {error}"))?;

            if let Some(stored_name) = stored_name {
                stored_names.push(stored_name);
            }
        }
    }

    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not delete the items: {error}"))?;

    for id in ids {
        transaction
            .execute(
                "DELETE FROM items WHERE id = ?1 AND deleted_at IS NOT NULL",
                params![id],
            )
            .map_err(|error| format!("Could not delete the items: {error}"))?;
    }

    transaction
        .commit()
        .map_err(|error| format!("Could not delete the items: {error}"))?;

    for stored_name in stored_names {
        let _ = fs::remove_file(files_dir.join(stored_name));
    }

    Ok(())
}

// A missing or trashed id records nothing, so Recent never lists it.
fn write_item_opened(connection: &mut Connection, id: &str) -> Result<(), String> {
    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not mark the item as opened: {error}"))?;

    let live: i64 = transaction
        .query_row(
            "SELECT COUNT(*) FROM items WHERE id = ?1 AND deleted_at IS NULL",
            params![id],
            |row| row.get(0),
        )
        .map_err(|error| format!("Could not mark the item as opened: {error}"))?;

    if live > 0 {
        transaction
            .execute(
                "INSERT INTO activity (item_id, action, created_at)
                 VALUES (?1, 'opened', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
                params![id],
            )
            .map_err(|error| format!("Could not mark the item as opened: {error}"))?;
    }

    transaction
        .commit()
        .map_err(|error| format!("Could not mark the item as opened: {error}"))
}

/// Resolves the requested protection into the value to store. `None` means the
/// caller did not mention protection, so an update leaves the stored value and
/// hash untouched. `Some((level, hash))` writes both.
fn resolve_collection_protection(
    protection: Option<&str>,
    secret: Option<&str>,
) -> Result<Option<(String, Option<String>)>, String> {
    match protection {
        None => Ok(None),
        Some("none") => Ok(Some(("none".to_string(), None))),
        Some(level @ ("password" | "pin")) => {
            let secret = secret.unwrap_or("").trim();

            if level == "password" {
                if secret.chars().count() < 4 {
                    return Err("Password must be at least 4 characters".to_string());
                }
            } else if secret.len() != 4 || !secret.chars().all(|character| character.is_ascii_digit())
            {
                return Err("PIN must be 4 digits".to_string());
            }

            let hash = hash_secret(secret)?;

            Ok(Some((level.to_string(), Some(hash))))
        }
        Some(_) => Err("Collection protection is not supported".to_string()),
    }
}

fn write_collection(
    connection: &mut Connection,
    input: &CollectionInput,
) -> Result<String, String> {
    let name = input.name.trim().to_string();

    if name.is_empty() {
        return Err("Collection name is required".to_string());
    }

    let icon = input
        .icon
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);

    // Resolved before the transaction so a bad secret never opens one.
    let protection = resolve_collection_protection(
        input.protection.as_deref(),
        input.secret.as_deref(),
    )?;

    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not save the collection: {error}"))?;

    let duplicate: Option<String> = transaction
        .query_row(
            "SELECT id FROM collections WHERE name = ?1 COLLATE NOCASE",
            params![name],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("Could not save the collection: {error}"))?;

    let id = match &input.id {
        Some(id) => {
            let exists: i64 = transaction
                .query_row(
                    "SELECT COUNT(*) FROM collections WHERE id = ?1",
                    params![id],
                    |row| row.get(0),
                )
                .map_err(|error| format!("Could not save the collection: {error}"))?;

            if exists == 0 {
                return Err("Collection was not found".to_string());
            }

            if duplicate
                .as_deref()
                .is_some_and(|duplicate| duplicate != id.as_str())
            {
                return Err("A collection with that name already exists".to_string());
            }

            match &protection {
                Some((level, hash)) => {
                    transaction
                        .execute(
                            "UPDATE collections
                             SET name = ?1, icon = ?2, protection = ?3, secret_hash = ?4
                             WHERE id = ?5",
                            params![name, icon, level, hash, id],
                        )
                        .map_err(|error| format!("Could not save the collection: {error}"))?;
                }
                None => {
                    transaction
                        .execute(
                            "UPDATE collections SET name = ?1, icon = ?2 WHERE id = ?3",
                            params![name, icon, id],
                        )
                        .map_err(|error| format!("Could not save the collection: {error}"))?;
                }
            }

            id.clone()
        }
        None => {
            if duplicate.is_some() {
                return Err("A collection with that name already exists".to_string());
            }

            let id = new_id(&transaction)
                .map_err(|error| format!("Could not save the collection: {error}"))?;

            // A create always stores a level, defaulting to an open collection.
            let (level, hash) = protection.unwrap_or_else(|| ("none".to_string(), None));

            transaction
                .execute(
                    "INSERT INTO collections
                       (id, name, sort_order, created_at, icon, protection, secret_hash)
                     VALUES (?1, ?2,
                             (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM collections),
                             strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), ?3, ?4, ?5)",
                    params![id, name, icon, level, hash],
                )
                .map_err(|error| format!("Could not save the collection: {error}"))?;

            id
        }
    };

    transaction
        .commit()
        .map_err(|error| format!("Could not save the collection: {error}"))?;

    Ok(id)
}

fn remove_collection(connection: &mut Connection, id: &str) -> Result<(), String> {
    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not delete the collection: {error}"))?;

    let deleted = transaction
        .execute("DELETE FROM collections WHERE id = ?1", params![id])
        .map_err(|error| format!("Could not delete the collection: {error}"))?;

    if deleted == 0 {
        return Err("Collection was not found".to_string());
    }

    transaction
        .commit()
        .map_err(|error| format!("Could not delete the collection: {error}"))
}

fn write_tag(connection: &mut Connection, input: &TagInput) -> Result<String, String> {
    let name = input.name.trim().to_string();

    if name.is_empty() {
        return Err("Tag name is required".to_string());
    }

    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not save the tag: {error}"))?;

    let duplicate: Option<String> = transaction
        .query_row(
            "SELECT id FROM tags WHERE name = ?1 COLLATE NOCASE",
            params![name],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("Could not save the tag: {error}"))?;

    let id = match &input.id {
        Some(id) => {
            let exists: i64 = transaction
                .query_row(
                    "SELECT COUNT(*) FROM tags WHERE id = ?1",
                    params![id],
                    |row| row.get(0),
                )
                .map_err(|error| format!("Could not save the tag: {error}"))?;

            if exists == 0 {
                return Err("Tag was not found".to_string());
            }

            if duplicate
                .as_deref()
                .is_some_and(|duplicate| duplicate != id.as_str())
            {
                return Err("A tag with that name already exists".to_string());
            }

            transaction
                .execute("UPDATE tags SET name = ?1 WHERE id = ?2", params![name, id])
                .map_err(|error| format!("Could not save the tag: {error}"))?;

            id.clone()
        }
        None => {
            if duplicate.is_some() {
                return Err("A tag with that name already exists".to_string());
            }

            let id =
                new_id(&transaction).map_err(|error| format!("Could not save the tag: {error}"))?;

            transaction
                .execute(
                    "INSERT INTO tags (id, name, created_at)
                     VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
                    params![id, name],
                )
                .map_err(|error| format!("Could not save the tag: {error}"))?;

            id
        }
    };

    transaction
        .commit()
        .map_err(|error| format!("Could not save the tag: {error}"))?;

    Ok(id)
}

fn remove_tag(connection: &mut Connection, id: &str) -> Result<(), String> {
    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not delete the tag: {error}"))?;

    transaction
        .execute("DELETE FROM item_tags WHERE tag_id = ?1", params![id])
        .map_err(|error| format!("Could not delete the tag: {error}"))?;

    let deleted = transaction
        .execute("DELETE FROM tags WHERE id = ?1", params![id])
        .map_err(|error| format!("Could not delete the tag: {error}"))?;

    if deleted == 0 {
        return Err("Tag was not found".to_string());
    }

    transaction
        .commit()
        .map_err(|error| format!("Could not delete the tag: {error}"))
}

// The extension keeps ASCII letters and digits only, capped at ten characters.
fn filtered_extension(path: &Path) -> String {
    let Some(extension) = path.extension().and_then(|extension| extension.to_str()) else {
        return String::new();
    };

    extension
        .chars()
        .filter(|character| character.is_ascii_alphanumeric())
        .map(|character| character.to_ascii_lowercase())
        .take(10)
        .collect()
}

fn build_stored_name(id: &str, source: &Path) -> String {
    let extension = filtered_extension(source);

    if extension.is_empty() {
        id.to_string()
    } else {
        format!("{id}.{extension}")
    }
}

fn write_import(
    connection: &mut Connection,
    files_dir: &Path,
    source: &Path,
    original_name: &str,
    byte_size: i64,
) -> Result<String, String> {
    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not import the file: {error}"))?;

    let id = new_id(&transaction).map_err(|error| format!("Could not import the file: {error}"))?;
    let stored_name = build_stored_name(&id, source);
    let target = files_dir.join(&stored_name);

    if target.exists() {
        return Err("A managed file with the same name already exists".to_string());
    }

    transaction
        .execute(
            "INSERT INTO items
               (id, kind, title, description, content, url, collection_id, is_favorite,
                created_at, updated_at)
             VALUES (?1, 'file', ?2, '', NULL, NULL, NULL, 0,
                     strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                     strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
            params![id, original_name],
        )
        .map_err(|error| format!("Could not import the file: {error}"))?;

    transaction
        .execute(
            "INSERT INTO files (item_id, stored_name, original_name, byte_size, imported_at)
             VALUES (?1, ?2, ?3, ?4, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
            params![id, stored_name, original_name, byte_size],
        )
        .map_err(|error| format!("Could not import the file: {error}"))?;

    transaction
        .execute(
            "INSERT INTO activity (item_id, action, created_at)
             VALUES (?1, 'imported', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
            params![id],
        )
        .map_err(|error| format!("Could not import the file: {error}"))?;

    upsert_index_state(&transaction, &id)
        .map_err(|error| format!("Could not import the file: {error}"))?;

    // The transaction holds the rows; the bytes land on disk before the commit.
    if let Err(error) = fs::copy(source, &target) {
        let _ = fs::remove_file(&target);
        return Err(format!("Could not copy file into managed storage: {error}"));
    }

    transaction
        .commit()
        .map_err(|error| format!("Could not import the file: {error}"))?;

    Ok(id)
}

fn load_item_with_state(state: &DatabaseState, id: &str) -> Result<Item, String> {
    let connection = state.require_connection()?;

    let item = read_item(
        connection.as_ref().expect("checked above"),
        state.files_dir(),
        id,
    )
    .map_err(|error| format!("Could not read the item: {error}"))?;

    item.ok_or_else(|| "Item was not found".to_string())
}

fn list_items_with_state(
    state: &DatabaseState,
    filter: Option<&ItemFilter>,
) -> Result<Vec<ItemSummary>, String> {
    let connection = state.require_connection()?;

    read_item_summaries(
        connection.as_ref().expect("checked above"),
        state.files_dir(),
        filter,
    )
    .map_err(|error| format!("Could not list the items: {error}"))
}

fn save_item_with_state(state: &DatabaseState, input: &ItemInput) -> Result<Item, String> {
    let id = {
        let mut connection = state.require_connection()?;
        write_item(connection.as_mut().expect("checked above"), input)?
    };

    load_item_with_state(state, &id)
}

fn set_item_tags_with_state(
    state: &DatabaseState,
    id: &str,
    tags: &[String],
) -> Result<Vec<String>, String> {
    let mut connection = state.require_connection()?;

    replace_item_tags(connection.as_mut().expect("checked above"), id, tags)
}

fn list_collections_with_state(state: &DatabaseState) -> Result<Vec<Collection>, String> {
    let connection = state.require_connection()?;

    read_collections(connection.as_ref().expect("checked above"))
        .map_err(|error| format!("Could not list the collections: {error}"))
}

fn list_activity_with_state(state: &DatabaseState) -> Result<Vec<ActivityEntry>, String> {
    let connection = state.require_connection()?;

    read_activity(connection.as_ref().expect("checked above"))
        .map_err(|error| format!("Could not list the activity: {error}"))
}

fn list_index_state_with_state(state: &DatabaseState) -> Result<Vec<IndexState>, String> {
    let connection = state.require_connection()?;

    read_index_state(connection.as_ref().expect("checked above"))
        .map_err(|error| format!("Could not list the index state: {error}"))
}

fn set_item_pinned_with_state(
    state: &DatabaseState,
    id: &str,
    pinned: bool,
) -> Result<Item, String> {
    {
        let mut connection = state.require_connection()?;
        write_item_pin(connection.as_mut().expect("checked above"), id, pinned)?;
    }

    load_item_with_state(state, id)
}

fn set_items_favorite_with_state(
    state: &DatabaseState,
    ids: &[String],
    favorite: bool,
) -> Result<(), String> {
    let mut connection = state.require_connection()?;

    write_items_favorite(connection.as_mut().expect("checked above"), ids, favorite)
}

fn move_items_to_collection_with_state(
    state: &DatabaseState,
    ids: &[String],
    collection_id: Option<&str>,
) -> Result<(), String> {
    let mut connection = state.require_connection()?;

    write_items_collection(
        connection.as_mut().expect("checked above"),
        ids,
        collection_id,
    )
}

fn trash_items_with_state(state: &DatabaseState, ids: &[String]) -> Result<(), String> {
    let mut connection = state.require_connection()?;

    write_trashed_items(connection.as_mut().expect("checked above"), ids)
}

fn restore_items_with_state(state: &DatabaseState, ids: &[String]) -> Result<(), String> {
    let mut connection = state.require_connection()?;

    write_restored_items(connection.as_mut().expect("checked above"), ids)
}

fn delete_items_permanently_with_state(
    state: &DatabaseState,
    ids: &[String],
) -> Result<(), String> {
    let mut connection = state.require_connection()?;

    remove_items_permanently(
        connection.as_mut().expect("checked above"),
        state.files_dir(),
        ids,
    )
}

fn mark_item_opened_with_state(state: &DatabaseState, id: &str) -> Result<(), String> {
    let mut connection = state.require_connection()?;

    write_item_opened(connection.as_mut().expect("checked above"), id)
}

fn list_recent_items_with_state(state: &DatabaseState) -> Result<RecentItems, String> {
    let connection = state.require_connection()?;
    let connection = connection.as_ref().expect("checked above");
    let files_dir = state.files_dir();

    Ok(RecentItems {
        opened: read_recent_group(connection, files_dir, &["opened"])
            .map_err(|error| format!("Could not list the recent items: {error}"))?,
        modified: read_recent_group(connection, files_dir, &["updated"])
            .map_err(|error| format!("Could not list the recent items: {error}"))?,
        created: read_recent_group(connection, files_dir, &["created", "imported"])
            .map_err(|error| format!("Could not list the recent items: {error}"))?,
    })
}

fn load_vault_summary_with_state(state: &DatabaseState) -> Result<VaultSummary, String> {
    let connection = state.require_connection()?;
    let connection = connection.as_ref().expect("checked above");

    let (
        item_count,
        note_count,
        source_count,
        file_count,
        favorite_count,
        collection_count,
        tag_count,
        trash_count,
        file_bytes,
    ): (i64, i64, i64, i64, i64, i64, i64, i64, i64) = connection
        .query_row(
            "SELECT
               (SELECT COUNT(*) FROM items WHERE deleted_at IS NULL),
               (SELECT COUNT(*) FROM items WHERE kind = 'note' AND deleted_at IS NULL),
               (SELECT COUNT(*) FROM items WHERE kind = 'source' AND deleted_at IS NULL),
               (SELECT COUNT(*) FROM items WHERE kind = 'file' AND deleted_at IS NULL),
               (SELECT COUNT(*) FROM items WHERE is_favorite = 1 AND deleted_at IS NULL),
               (SELECT COUNT(*) FROM collections),
               (SELECT COUNT(*) FROM tags),
               (SELECT COUNT(*) FROM items WHERE deleted_at IS NOT NULL),
               (SELECT COALESCE(SUM(byte_size), 0) FROM files)",
            [],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                    row.get(7)?,
                    row.get(8)?,
                ))
            },
        )
        .map_err(|error| format!("Could not read the vault summary: {error}"))?;

    let page_count: i64 = connection
        .query_row("PRAGMA page_count", [], |row| row.get(0))
        .map_err(|error| format!("Could not read the vault summary: {error}"))?;
    let page_size: i64 = connection
        .query_row("PRAGMA page_size", [], |row| row.get(0))
        .map_err(|error| format!("Could not read the vault summary: {error}"))?;

    Ok(VaultSummary {
        item_count,
        note_count,
        source_count,
        file_count,
        favorite_count,
        collection_count,
        tag_count,
        trash_count,
        file_bytes,
        database_bytes: page_count * page_size,
    })
}

// Best effort: the open already succeeded, so a failed mark never fails the open.
fn record_item_opened(state: &DatabaseState, id: &str) {
    if let Ok(mut connection) = state.require_connection() {
        let _ = write_item_opened(connection.as_mut().expect("checked above"), id);
    }
}

fn save_collection_with_state(
    state: &DatabaseState,
    input: &CollectionInput,
) -> Result<Collection, String> {
    let id = {
        let mut connection = state.require_connection()?;
        write_collection(connection.as_mut().expect("checked above"), input)?
    };

    let connection = state.require_connection()?;
    let collection = read_collection(connection.as_ref().expect("checked above"), &id)
        .map_err(|error| format!("Could not read the collection: {error}"))?;

    collection.ok_or_else(|| "Collection was not found".to_string())
}

fn delete_collection_with_state(state: &DatabaseState, id: &str) -> Result<(), String> {
    let mut connection = state.require_connection()?;

    remove_collection(connection.as_mut().expect("checked above"), id)
}

fn verify_collection_secret_with_state(
    state: &DatabaseState,
    id: &str,
    secret: &str,
) -> Result<bool, String> {
    let connection = state.require_connection()?;

    // A missing collection and a collection without a hash both answer false, so
    // the caller cannot tell a locked collection from a deleted one.
    let stored: Option<Option<String>> = connection
        .as_ref()
        .expect("checked above")
        .query_row(
            "SELECT secret_hash FROM collections WHERE id = ?1",
            params![id],
            |row| row.get::<_, Option<String>>(0),
        )
        .optional()
        .map_err(|error| format!("Could not read the collection: {error}"))?;

    match stored {
        Some(Some(hash)) => Ok(secret_matches(secret.trim(), &hash)),
        _ => Ok(false),
    }
}

fn list_tags_with_state(state: &DatabaseState) -> Result<Vec<Tag>, String> {
    let connection = state.require_connection()?;

    read_tags(connection.as_ref().expect("checked above"))
        .map_err(|error| format!("Could not list the tags: {error}"))
}

fn save_tag_with_state(state: &DatabaseState, input: &TagInput) -> Result<Tag, String> {
    let id = {
        let mut connection = state.require_connection()?;
        write_tag(connection.as_mut().expect("checked above"), input)?
    };

    let connection = state.require_connection()?;
    let tag = read_tag(connection.as_ref().expect("checked above"), &id)
        .map_err(|error| format!("Could not read the tag: {error}"))?;

    tag.ok_or_else(|| "Tag was not found".to_string())
}

fn delete_tag_with_state(state: &DatabaseState, id: &str) -> Result<(), String> {
    let mut connection = state.require_connection()?;

    remove_tag(connection.as_mut().expect("checked above"), id)
}

// Resolves the managed file for a file item, rejecting a missing item, a
// non-file item, and a file that is no longer on disk.
fn managed_file_path_with_state(state: &DatabaseState, id: &str) -> Result<PathBuf, String> {
    let connection = state.require_connection()?;

    let row: Option<(String, Option<String>)> = connection
        .as_ref()
        .expect("checked above")
        .query_row(
            "SELECT i.kind, f.stored_name
             FROM items i
             LEFT JOIN files f ON f.item_id = i.id
             WHERE i.id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|error| format!("Could not read the item: {error}"))?;

    let (kind, stored_name) = row.ok_or_else(|| "Item was not found".to_string())?;

    if kind != "file" {
        return Err("This item is not a file".to_string());
    }

    let stored_name = stored_name.ok_or_else(|| "The file is missing".to_string())?;
    let path = state.files_dir().join(stored_name);

    if !path.is_file() {
        return Err("The file is missing".to_string());
    }

    Ok(path)
}

fn source_url_with_state(state: &DatabaseState, id: &str) -> Result<String, String> {
    let connection = state.require_connection()?;

    let row: Option<(String, Option<String>)> = connection
        .as_ref()
        .expect("checked above")
        .query_row(
            "SELECT kind, url FROM items WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|error| format!("Could not read the item: {error}"))?;

    let (kind, url) = row.ok_or_else(|| "Item was not found".to_string())?;

    if kind != "source" {
        return Err("This item is not a source".to_string());
    }

    let url = url.unwrap_or_default();
    let url = url.trim();

    if url.is_empty() {
        return Err("This source has no web address".to_string());
    }

    Ok(url.to_string())
}

fn import_file_with_state(state: &DatabaseState, source_path: &str) -> Result<Item, String> {
    let source_path = source_path.trim();

    if source_path.is_empty() {
        return Err("Source file is required".to_string());
    }

    let source = Path::new(source_path);

    if !source.exists() {
        return Err("Source file was not found".to_string());
    }

    if !source.is_file() {
        return Err("Source must be a file".to_string());
    }

    let original_name = source
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .ok_or_else(|| "Source file is required".to_string())?;

    let byte_size = fs::metadata(source)
        .map_err(|error| format!("Could not read the source file: {error}"))?
        .len();
    let byte_size = i64::try_from(byte_size).map_err(|_| "Source file is too large".to_string())?;

    fs::create_dir_all(state.files_dir())
        .map_err(|error| format!("Could not create the managed folder: {error}"))?;

    let id = {
        let mut connection = state.require_connection()?;

        write_import(
            connection.as_mut().expect("checked above"),
            state.files_dir(),
            source,
            &original_name,
            byte_size,
        )?
    };

    load_item_with_state(state, &id)
}

#[tauri::command]
pub fn import_file(source_path: String, state: State<'_, DatabaseState>) -> Result<Item, String> {
    import_file_with_state(state.inner(), &source_path)
}

#[tauri::command]
pub fn save_item(input: ItemInput, state: State<'_, DatabaseState>) -> Result<Item, String> {
    save_item_with_state(state.inner(), &input)
}

#[tauri::command]
pub fn load_item(id: String, state: State<'_, DatabaseState>) -> Result<Item, String> {
    load_item_with_state(state.inner(), &id)
}

#[tauri::command]
pub fn list_items(
    filter: Option<ItemFilter>,
    state: State<'_, DatabaseState>,
) -> Result<Vec<ItemSummary>, String> {
    list_items_with_state(state.inner(), filter.as_ref())
}

#[tauri::command]
pub fn set_item_tags(
    id: String,
    tags: Vec<String>,
    state: State<'_, DatabaseState>,
) -> Result<Vec<String>, String> {
    set_item_tags_with_state(state.inner(), &id, &tags)
}

#[tauri::command]
pub fn list_collections(state: State<'_, DatabaseState>) -> Result<Vec<Collection>, String> {
    list_collections_with_state(state.inner())
}

#[tauri::command]
pub fn list_activity(state: State<'_, DatabaseState>) -> Result<Vec<ActivityEntry>, String> {
    list_activity_with_state(state.inner())
}

#[tauri::command]
pub fn list_index_state(state: State<'_, DatabaseState>) -> Result<Vec<IndexState>, String> {
    list_index_state_with_state(state.inner())
}

#[tauri::command]
pub fn set_item_pinned(
    id: String,
    pinned: bool,
    state: State<'_, DatabaseState>,
) -> Result<Item, String> {
    set_item_pinned_with_state(state.inner(), &id, pinned)
}

#[tauri::command]
pub fn set_items_favorite(
    ids: Vec<String>,
    favorite: bool,
    state: State<'_, DatabaseState>,
) -> Result<(), String> {
    set_items_favorite_with_state(state.inner(), &ids, favorite)
}

#[tauri::command]
pub fn move_items_to_collection(
    ids: Vec<String>,
    collection_id: Option<String>,
    state: State<'_, DatabaseState>,
) -> Result<(), String> {
    move_items_to_collection_with_state(state.inner(), &ids, collection_id.as_deref())
}

#[tauri::command]
pub fn trash_items(ids: Vec<String>, state: State<'_, DatabaseState>) -> Result<(), String> {
    trash_items_with_state(state.inner(), &ids)
}

#[tauri::command]
pub fn restore_items(ids: Vec<String>, state: State<'_, DatabaseState>) -> Result<(), String> {
    restore_items_with_state(state.inner(), &ids)
}

#[tauri::command]
pub fn delete_items_permanently(
    ids: Vec<String>,
    state: State<'_, DatabaseState>,
) -> Result<(), String> {
    delete_items_permanently_with_state(state.inner(), &ids)
}

#[tauri::command]
pub fn mark_item_opened(id: String, state: State<'_, DatabaseState>) -> Result<(), String> {
    mark_item_opened_with_state(state.inner(), &id)
}

#[tauri::command]
pub fn list_recent_items(state: State<'_, DatabaseState>) -> Result<RecentItems, String> {
    list_recent_items_with_state(state.inner())
}

#[tauri::command]
pub fn load_vault_summary(state: State<'_, DatabaseState>) -> Result<VaultSummary, String> {
    load_vault_summary_with_state(state.inner())
}

#[tauri::command]
pub fn save_collection(
    input: CollectionInput,
    state: State<'_, DatabaseState>,
) -> Result<Collection, String> {
    save_collection_with_state(state.inner(), &input)
}

#[tauri::command]
pub fn delete_collection(id: String, state: State<'_, DatabaseState>) -> Result<(), String> {
    delete_collection_with_state(state.inner(), &id)
}

#[tauri::command]
pub fn verify_collection_secret(
    id: String,
    secret: String,
    state: State<'_, DatabaseState>,
) -> Result<bool, String> {
    verify_collection_secret_with_state(state.inner(), &id, &secret)
}

#[tauri::command]
pub fn list_tags(state: State<'_, DatabaseState>) -> Result<Vec<Tag>, String> {
    list_tags_with_state(state.inner())
}

#[tauri::command]
pub fn save_tag(input: TagInput, state: State<'_, DatabaseState>) -> Result<Tag, String> {
    save_tag_with_state(state.inner(), &input)
}

#[tauri::command]
pub fn delete_tag(id: String, state: State<'_, DatabaseState>) -> Result<(), String> {
    delete_tag_with_state(state.inner(), &id)
}

#[tauri::command]
pub fn pick_file(app: AppHandle) -> Result<Option<String>, String> {
    Ok(app
        .dialog()
        .file()
        .blocking_pick_file()
        .map(|path| path.to_string()))
}

#[tauri::command]
pub fn pick_files(app: AppHandle) -> Result<Option<Vec<String>>, String> {
    Ok(app
        .dialog()
        .file()
        .blocking_pick_files()
        .map(|paths| paths.into_iter().map(|path| path.to_string()).collect()))
}

#[tauri::command]
pub fn open_item_file(
    id: String,
    app: AppHandle,
    state: State<'_, DatabaseState>,
) -> Result<(), String> {
    let path = managed_file_path_with_state(state.inner(), &id)?;

    app.opener()
        .open_path(path.to_string_lossy().to_string(), None::<&str>)
        .map_err(|error| format!("Could not open the file: {error}"))?;

    record_item_opened(state.inner(), &id);

    Ok(())
}

#[tauri::command]
pub fn reveal_item_file(
    id: String,
    app: AppHandle,
    state: State<'_, DatabaseState>,
) -> Result<(), String> {
    let path = managed_file_path_with_state(state.inner(), &id)?;

    app.opener()
        .reveal_item_in_dir(&path)
        .map_err(|error| format!("Could not reveal the file: {error}"))
}

#[tauri::command]
pub fn open_source_url(
    id: String,
    app: AppHandle,
    state: State<'_, DatabaseState>,
) -> Result<(), String> {
    let url = source_url_with_state(state.inner(), &id)?;

    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|error| format!("Could not open the address: {error}"))?;

    record_item_opened(state.inner(), &id);

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    use rusqlite::params;

    use super::*;

    // One temp root holds the database file and the managed folder so Drop can remove both.
    struct TempVault {
        root: PathBuf,
        database_path: PathBuf,
        files_dir: PathBuf,
    }

    impl TempVault {
        fn new(label: &str) -> Self {
            let unique = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("system clock is after the Unix epoch")
                .as_nanos();
            let root = std::env::temp_dir().join(format!(
                "kivo-vault-{label}-{}-{unique}",
                std::process::id()
            ));

            Self {
                database_path: root.join("kivo.db"),
                files_dir: root.join("files"),
                root,
            }
        }

        fn state(&self) -> DatabaseState {
            let state = DatabaseState::new(self.database_path.clone(), self.files_dir.clone());
            state.initialize().expect("initialize database");
            state
        }
    }

    impl Drop for TempVault {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.root);
        }
    }

    fn note_input(title: &str, content: &str) -> ItemInput {
        ItemInput {
            id: None,
            kind: "note".to_string(),
            title: title.to_string(),
            description: String::new(),
            content: Some(content.to_string()),
            url: None,
            collection_id: None,
            is_favorite: None,
            is_pinned: None,
        }
    }

    fn source_input(title: &str, url: &str) -> ItemInput {
        ItemInput {
            id: None,
            kind: "source".to_string(),
            title: title.to_string(),
            description: String::new(),
            content: None,
            url: Some(url.to_string()),
            collection_id: None,
            is_favorite: None,
            is_pinned: None,
        }
    }

    fn seed_collection(state: &DatabaseState, id: &str, name: &str, sort_order: i64) {
        let connection = state.require_connection().expect("lock connection");
        connection
            .as_ref()
            .expect("connection is initialized")
            .execute(
                "INSERT INTO collections (id, name, sort_order, created_at)
                 VALUES (?1, ?2, ?3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
                params![id, name, sort_order],
            )
            .expect("seed collection");
    }

    fn titles(summaries: &[ItemSummary]) -> Vec<String> {
        summaries
            .iter()
            .map(|summary| summary.title.clone())
            .collect()
    }

    fn stored_name(state: &DatabaseState, item_id: &str) -> String {
        let connection = state.require_connection().expect("lock connection");
        connection
            .as_ref()
            .expect("connection is initialized")
            .query_row(
                "SELECT stored_name FROM files WHERE item_id = ?1",
                params![item_id],
                |row| row.get(0),
            )
            .expect("read stored name")
    }

    #[test]
    fn saved_note_reads_back_with_its_fields() {
        let vault = TempVault::new("note-round-trip");
        let state = vault.state();

        let saved = save_item_with_state(&state, &note_input("  Grocery list  ", "milk and eggs"))
            .expect("save note");

        assert_eq!(saved.kind, "note");
        assert_eq!(saved.title, "Grocery list");
        assert_eq!(saved.description, "");
        assert_eq!(saved.content.as_deref(), Some("milk and eggs"));
        assert_eq!(saved.url, None);
        assert_eq!(saved.collection_id, None);
        assert!(!saved.is_favorite);
        assert!(saved.tags.is_empty());
        assert!(saved.file.is_none());
        assert!(!saved.file_missing);
        assert!(!saved.created_at.is_empty());
        assert!(!saved.updated_at.is_empty());

        let loaded = load_item_with_state(&state, &saved.id).expect("load note");
        assert_eq!(loaded, saved);
    }

    #[test]
    fn note_content_survives_a_restart() {
        let vault = TempVault::new("note-restart");
        let id = {
            let state = vault.state();
            save_item_with_state(&state, &note_input("Ideas", "first thought"))
                .expect("save note")
                .id
        };

        let state = vault.state();
        let loaded = load_item_with_state(&state, &id).expect("load after restart");
        assert_eq!(loaded.title, "Ideas");
        assert_eq!(loaded.content.as_deref(), Some("first thought"));
    }

    #[test]
    fn favorite_state_survives_a_restart() {
        let vault = TempVault::new("favorite-restart");
        let id = {
            let state = vault.state();
            let mut input = note_input("Pinned", "keep me");
            input.is_favorite = Some(true);
            save_item_with_state(&state, &input)
                .expect("save favorite")
                .id
        };

        let state = vault.state();
        let loaded = load_item_with_state(&state, &id).expect("load after restart");
        assert!(loaded.is_favorite);

        let mut input = note_input("Pinned", "keep me");
        input.id = Some(loaded.id.clone());
        input.is_favorite = Some(false);
        let updated = save_item_with_state(&state, &input).expect("clear favorite");
        assert!(!updated.is_favorite);
    }

    #[test]
    fn item_validation_messages_are_stable() {
        let vault = TempVault::new("item-validation");
        let state = vault.state();

        let error = save_item_with_state(&state, &note_input("   ", "body"))
            .expect_err("blank title rejected");
        assert_eq!(error, "Item title is required");

        let mut file_create = note_input("File", "body");
        file_create.kind = "file".to_string();
        let error = save_item_with_state(&state, &file_create).expect_err("file create rejected");
        assert_eq!(error, "File items are created by import");

        let mut alien = note_input("Alien", "body");
        alien.kind = "other".to_string();
        let error = save_item_with_state(&state, &alien).expect_err("unknown kind rejected");
        assert_eq!(error, "Items must be notes, sources, or files");

        let error = save_item_with_state(&state, &source_input("Article", "   "))
            .expect_err("blank url rejected");
        assert_eq!(error, "Source items need a web address");

        let saved = save_item_with_state(&state, &note_input("Stable", "body")).expect("save note");
        let mut change = note_input("Stable", "body");
        change.id = Some(saved.id.clone());
        change.kind = "source".to_string();
        change.url = Some("https://example.com".to_string());
        let error = save_item_with_state(&state, &change).expect_err("kind change rejected");
        assert_eq!(error, "Item type cannot change");
    }

    #[test]
    fn items_keep_a_valid_collection_and_reject_unknown_ones() {
        let vault = TempVault::new("collections");
        let state = vault.state();
        seed_collection(&state, "col-1", "Projects", 0);

        let mut input = note_input("Plan", "steps");
        input.collection_id = Some("col-1".to_string());
        let saved = save_item_with_state(&state, &input).expect("save with collection");
        assert_eq!(saved.collection_id.as_deref(), Some("col-1"));

        let loaded = load_item_with_state(&state, &saved.id).expect("load with collection");
        assert_eq!(loaded.collection_id.as_deref(), Some("col-1"));

        let mut unknown = note_input("Orphan", "steps");
        unknown.collection_id = Some("missing".to_string());
        let error =
            save_item_with_state(&state, &unknown).expect_err("unknown collection rejected");
        assert_eq!(error, "Collection does not exist");
    }

    #[test]
    fn tags_are_replaced_and_deduplicated_case_insensitively() {
        let vault = TempVault::new("tags");
        let state = vault.state();
        let saved = save_item_with_state(&state, &note_input("Tagged", "body")).expect("save note");

        let first = set_item_tags_with_state(
            &state,
            &saved.id,
            &[
                "Work".to_string(),
                "personal".to_string(),
                "work".to_string(),
                "   ".to_string(),
            ],
        )
        .expect("set tags");
        assert_eq!(first, vec!["Work".to_string(), "personal".to_string()]);

        let loaded = load_item_with_state(&state, &saved.id).expect("load tags");
        assert_eq!(
            loaded.tags,
            vec!["personal".to_string(), "Work".to_string()]
        );

        let second =
            set_item_tags_with_state(&state, &saved.id, &["Home".to_string()]).expect("replace");
        assert_eq!(second, vec!["Home".to_string()]);

        let loaded = load_item_with_state(&state, &saved.id).expect("load replaced tags");
        assert_eq!(loaded.tags, vec!["Home".to_string()]);

        // A different case reuses the stored tag row instead of adding a duplicate.
        let third =
            set_item_tags_with_state(&state, &saved.id, &["home".to_string()]).expect("reuse");
        assert_eq!(third, vec!["home".to_string()]);

        let loaded = load_item_with_state(&state, &saved.id).expect("load reused tag");
        assert_eq!(loaded.tags, vec!["Home".to_string()]);

        let connection = state.require_connection().expect("lock connection");
        let connection = connection.as_ref().expect("connection is initialized");

        let tag_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM tags", [], |row| row.get(0))
            .expect("count tags");
        assert_eq!(tag_count, 3, "Work, personal, and Home only");

        let assignment_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM item_tags WHERE item_id = ?1",
                params![saved.id],
                |row| row.get(0),
            )
            .expect("count assignments");
        assert_eq!(assignment_count, 1);

        let activity_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM activity WHERE item_id = ?1 AND action = 'updated'",
                params![saved.id],
                |row| row.get(0),
            )
            .expect("count tag activity");
        assert_eq!(activity_count, 3);
    }

    #[test]
    fn import_file_copies_bytes_and_records_them() {
        let vault = TempVault::new("import");
        let state = vault.state();

        let source = vault.root.join("report.txt");
        fs::write(&source, b"hello world").expect("write source file");

        let item = import_file_with_state(&state, &source.to_string_lossy()).expect("import file");

        assert_eq!(item.kind, "file");
        assert_eq!(item.title, "report.txt");
        assert_eq!(item.description, "");
        assert_eq!(item.content, None);
        assert_eq!(item.url, None);
        assert!(!item.is_favorite);
        assert!(!item.file_missing);

        let file = item.file.as_ref().expect("file details");
        assert_eq!(file.original_name, "report.txt");
        assert_eq!(file.byte_size, 11);
        assert!(!file.imported_at.is_empty());

        let name = stored_name(&state, &item.id);
        assert!(!name.contains('/'), "path separator leaked: {name}");
        assert!(!name.contains('\\'), "path separator leaked: {name}");
        assert!(name.ends_with(".txt"));

        let copied = fs::read(state.files_dir().join(&name)).expect("read copied file");
        assert_eq!(copied, b"hello world".to_vec());

        let connection = state.require_connection().expect("lock connection");
        let action: String = connection
            .as_ref()
            .expect("connection is initialized")
            .query_row(
                "SELECT action FROM activity WHERE item_id = ?1",
                params![item.id],
                |row| row.get(0),
            )
            .expect("read activity");
        assert_eq!(action, "imported");
    }

    #[test]
    fn import_rejects_missing_paths_and_directories() {
        let vault = TempVault::new("import-rejects");
        let state = vault.state();

        let missing = vault.root.join("does-not-exist.txt");
        let error = import_file_with_state(&state, &missing.to_string_lossy())
            .expect_err("missing source rejected");
        assert_eq!(error, "Source file was not found");

        let error = import_file_with_state(&state, &vault.root.to_string_lossy())
            .expect_err("directory source rejected");
        assert_eq!(error, "Source must be a file");

        let error = import_file_with_state(&state, "   ").expect_err("blank source rejected");
        assert_eq!(error, "Source file is required");
    }

    #[test]
    fn hostile_source_names_still_produce_safe_stored_names() {
        let vault = TempVault::new("hostile-name");
        let state = vault.state();

        let nested = vault.root.join("nested").join("deeper");
        fs::create_dir_all(&nested).expect("create source folder");
        let source = nested.join("evil name.TXT");
        fs::write(&source, b"payload").expect("write source file");

        // A path that walks through a parent folder but still resolves to the file.
        let twisting = vault
            .root
            .join("nested")
            .join("deeper")
            .join("..")
            .join("deeper")
            .join("evil name.TXT");

        let item = import_file_with_state(&state, &twisting.to_string_lossy()).expect("import");
        assert_eq!(item.title, "evil name.TXT");

        let name = stored_name(&state, &item.id);
        assert!(name.ends_with(".txt"), "unexpected stored name: {name}");
        assert!(!name.contains('/'), "path separator leaked: {name}");
        assert!(!name.contains('\\'), "path separator leaked: {name}");

        assert_eq!(
            filtered_extension(Path::new("..\\..\\evil name.TXT")),
            "txt"
        );
    }

    #[test]
    fn a_deleted_managed_file_reports_missing() {
        let vault = TempVault::new("missing-file");
        let state = vault.state();

        let source = vault.root.join("photo.png");
        fs::write(&source, b"pixels").expect("write source file");
        let item = import_file_with_state(&state, &source.to_string_lossy()).expect("import");

        let name = stored_name(&state, &item.id);
        fs::remove_file(state.files_dir().join(&name)).expect("delete managed file");

        let loaded = load_item_with_state(&state, &item.id).expect("load after delete");
        assert!(loaded.file_missing);
        assert_eq!(loaded.title, "photo.png");
        assert!(loaded.file.is_some());

        let summaries = list_items_with_state(&state, None).expect("list after delete");
        let summary = summaries
            .iter()
            .find(|summary| summary.id == item.id)
            .expect("summary present");
        assert!(summary.file_missing);
    }

    #[test]
    fn rename_and_move_keep_the_stored_file_name() {
        let vault = TempVault::new("rename-move");
        let state = vault.state();
        seed_collection(&state, "col-move", "Archive", 1);

        let source = vault.root.join("notes.txt");
        fs::write(&source, b"draft").expect("write source file");
        let item = import_file_with_state(&state, &source.to_string_lossy()).expect("import");

        let before = stored_name(&state, &item.id);

        let renamed = save_item_with_state(
            &state,
            &ItemInput {
                id: Some(item.id.clone()),
                kind: "file".to_string(),
                title: "Renamed file".to_string(),
                description: "moved".to_string(),
                content: None,
                url: None,
                collection_id: Some("col-move".to_string()),
                is_favorite: Some(true),
                is_pinned: None,
            },
        )
        .expect("rename and move");

        assert_eq!(renamed.title, "Renamed file");
        assert_eq!(renamed.description, "moved");
        assert_eq!(renamed.collection_id.as_deref(), Some("col-move"));
        assert!(renamed.is_favorite);
        assert!(!renamed.file_missing);

        let after = stored_name(&state, &item.id);
        assert_eq!(before, after, "the stored file name never changes");
    }

    #[test]
    fn deleting_a_collection_clears_the_item_collection() {
        let vault = TempVault::new("collection-delete");
        let state = vault.state();
        seed_collection(&state, "col-del", "Temporary", 0);

        let mut input = note_input("Kept", "body");
        input.collection_id = Some("col-del".to_string());
        let saved = save_item_with_state(&state, &input).expect("save with collection");

        {
            let connection = state.require_connection().expect("lock connection");
            connection
                .as_ref()
                .expect("connection is initialized")
                .execute("DELETE FROM collections WHERE id = 'col-del'", [])
                .expect("delete collection");
        }

        let loaded = load_item_with_state(&state, &saved.id).expect("load after collection delete");
        assert_eq!(loaded.collection_id, None);
        assert_eq!(loaded.title, "Kept");
    }

    #[test]
    fn list_items_returns_newest_first_with_summary_fields() {
        let vault = TempVault::new("list-items");
        let state = vault.state();

        let older = save_item_with_state(&state, &note_input("Older", "body")).expect("save older");
        let newer = save_item_with_state(&state, &note_input("Newer", "body")).expect("save newer");

        {
            let connection = state.require_connection().expect("lock connection");
            let connection = connection.as_ref().expect("connection is initialized");

            connection
                .execute(
                    "UPDATE items SET updated_at = '2020-01-01T00:00:00.000Z' WHERE id = ?1",
                    params![older.id],
                )
                .expect("age older item");
            connection
                .execute(
                    "UPDATE items SET updated_at = '2021-01-01T00:00:00.000Z' WHERE id = ?1",
                    params![newer.id],
                )
                .expect("age newer item");
        }

        let summaries = list_items_with_state(&state, None).expect("list items");
        assert_eq!(summaries.len(), 2);
        assert_eq!(summaries[0].id, newer.id);
        assert_eq!(summaries[1].id, older.id);
        assert_eq!(summaries[0].kind, "note");
        assert_eq!(summaries[0].title, "Newer");
        assert!(!summaries[0].is_favorite);
        assert_eq!(summaries[0].collection_id, None);
        assert_eq!(summaries[0].updated_at, "2021-01-01T00:00:00.000Z");
        assert_eq!(summaries[0].file, None);
        assert!(!summaries[0].file_missing);
    }

    #[test]
    fn list_items_summaries_include_file_details() {
        let vault = TempVault::new("summary-file");
        let state = vault.state();

        let source = vault.root.join("report.txt");
        fs::write(&source, b"hello world").expect("write source file");

        let item = import_file_with_state(&state, &source.to_string_lossy()).expect("import file");
        let summaries = list_items_with_state(&state, None).expect("list items");

        assert_eq!(summaries.len(), 1);
        assert_eq!(summaries[0].id, item.id);
        let file = summaries[0].file.as_ref().expect("summary file details");
        assert_eq!(file.original_name, "report.txt");
        assert_eq!(file.byte_size, 11);
        assert!(!file.imported_at.is_empty());
        assert!(!summaries[0].file_missing);
    }

    #[test]
    fn source_items_store_and_reload_a_personal_note() {
        let vault = TempVault::new("source-note");
        let state = vault.state();

        let mut input = source_input("Rust", "https://www.rust-lang.org");
        input.content = Some("Read the book list".to_string());

        let saved = save_item_with_state(&state, &input).expect("save source");
        assert_eq!(saved.content.as_deref(), Some("Read the book list"));

        let loaded = load_item_with_state(&state, &saved.id).expect("load source");
        assert_eq!(loaded.content.as_deref(), Some("Read the book list"));
        assert_eq!(loaded.url.as_deref(), Some("https://www.rust-lang.org"));
    }

    #[test]
    fn list_collections_reads_onboarding_order() {
        let vault = TempVault::new("collection-order");
        let state = vault.state();

        seed_collection(&state, "c-2", "Zeta", 2);
        seed_collection(&state, "c-0", "Alpha", 0);
        seed_collection(&state, "c-1", "Beta", 1);

        let collections = list_collections_with_state(&state).expect("list collections");
        let names: Vec<&str> = collections
            .iter()
            .map(|collection| collection.name.as_str())
            .collect();

        assert_eq!(names, vec!["Alpha", "Beta", "Zeta"]);
        assert_eq!(collections[0].sort_order, 0);
        assert_eq!(collections[2].sort_order, 2);
        assert!(!collections[0].created_at.is_empty());
    }

    #[test]
    fn activity_and_index_state_are_recorded_in_order() {
        let vault = TempVault::new("activity-index");
        let state = vault.state();

        let saved =
            save_item_with_state(&state, &note_input("Indexed", "body")).expect("save note");

        let index_rows = list_index_state_with_state(&state).expect("list index state");
        assert_eq!(index_rows.len(), 1);
        assert_eq!(index_rows[0].item_id, saved.id);
        assert!(index_rows[0].needs_index);
        assert_eq!(index_rows[0].indexed_at, None);

        {
            let connection = state.require_connection().expect("lock connection");
            connection
                .as_ref()
                .expect("connection is initialized")
                .execute(
                    "UPDATE index_state
                     SET indexed_at = '2026-01-02T03:04:05.000Z', needs_index = 0
                     WHERE item_id = ?1",
                    params![saved.id],
                )
                .expect("mark indexed");
        }

        let index_rows = list_index_state_with_state(&state).expect("list index state again");
        assert!(!index_rows[0].needs_index);
        assert_eq!(
            index_rows[0].indexed_at.as_deref(),
            Some("2026-01-02T03:04:05.000Z")
        );

        let mut update = note_input("Indexed", "body changed");
        update.id = Some(saved.id.clone());
        save_item_with_state(&state, &update).expect("update note");

        let index_rows = list_index_state_with_state(&state).expect("list after update");
        assert!(index_rows[0].needs_index, "an update marks the item again");

        let activity = list_activity_with_state(&state).expect("list activity");
        assert_eq!(activity.len(), 2);
        assert_eq!(activity[0].action, "updated");
        assert_eq!(activity[1].action, "created");
        assert_eq!(activity[0].item_id.as_deref(), Some(saved.id.as_str()));
    }

    #[test]
    fn list_items_filters_by_kind_collection_and_favorite() {
        let vault = TempVault::new("list-filter");
        let state = vault.state();
        seed_collection(&state, "col-a", "Alpha", 0);
        seed_collection(&state, "col-b", "Beta", 1);

        let mut in_alpha = note_input("Alpha note", "body");
        in_alpha.collection_id = Some("col-a".to_string());
        let alpha = save_item_with_state(&state, &in_alpha).expect("save alpha note");

        let mut favorited = note_input("Favorite note", "body");
        favorited.collection_id = Some("col-b".to_string());
        favorited.is_favorite = Some(true);
        let favorited = save_item_with_state(&state, &favorited).expect("save favorite note");

        let source = save_item_with_state(&state, &source_input("Site", "https://example.com"))
            .expect("save source");

        let mut filter = ItemFilter {
            kind: Some("note".to_string()),
            ..ItemFilter::default()
        };
        let notes = list_items_with_state(&state, Some(&filter)).expect("list notes");
        assert_eq!(notes.len(), 2);
        assert!(notes.iter().all(|summary| summary.kind == "note"));
        assert!(!notes.iter().any(|summary| summary.id == source.id));

        filter = ItemFilter {
            collection_id: Some("col-a".to_string()),
            ..ItemFilter::default()
        };
        let in_collection =
            list_items_with_state(&state, Some(&filter)).expect("list collection items");
        assert_eq!(in_collection.len(), 1);
        assert_eq!(in_collection[0].id, alpha.id);

        filter = ItemFilter {
            favorite: Some(true),
            ..ItemFilter::default()
        };
        let favorites = list_items_with_state(&state, Some(&filter)).expect("list favorites");
        assert_eq!(favorites.len(), 1);
        assert_eq!(favorites[0].id, favorited.id);

        filter = ItemFilter {
            kind: Some("note".to_string()),
            favorite: Some(true),
            ..ItemFilter::default()
        };
        let combined = list_items_with_state(&state, Some(&filter)).expect("list combined");
        assert_eq!(combined.len(), 1);
        assert_eq!(combined[0].id, favorited.id);
    }

    #[test]
    fn list_items_filters_by_tag() {
        let vault = TempVault::new("list-tag-filter");
        let state = vault.state();

        let tagged =
            save_item_with_state(&state, &note_input("Tagged", "body")).expect("save tagged");
        let untagged =
            save_item_with_state(&state, &note_input("Untagged", "body")).expect("save untagged");

        set_item_tags_with_state(&state, &tagged.id, &["Work".to_string()]).expect("set tag");

        let tags = list_tags_with_state(&state).expect("list tags");
        let tag = tags
            .iter()
            .find(|tag| tag.name == "Work")
            .expect("work tag");

        let filter = ItemFilter {
            tag_id: Some(tag.id.clone()),
            ..ItemFilter::default()
        };
        let filtered = list_items_with_state(&state, Some(&filter)).expect("list by tag");
        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0].id, tagged.id);
        assert!(!filtered.iter().any(|summary| summary.id == untagged.id));
    }

    #[test]
    fn list_items_query_escapes_like_wildcards() {
        let vault = TempVault::new("list-query");
        let state = vault.state();

        let percent =
            save_item_with_state(&state, &note_input("100% done", "body")).expect("save percent");
        let underscore =
            save_item_with_state(&state, &note_input("a_b note", "body")).expect("save underscore");
        let _decoy =
            save_item_with_state(&state, &note_input("1005 done", "body")).expect("save decoy");
        let _other =
            save_item_with_state(&state, &note_input("axb note", "body")).expect("save other");

        let filter = ItemFilter {
            query: Some("100%".to_string()),
            ..ItemFilter::default()
        };
        let found = list_items_with_state(&state, Some(&filter)).expect("percent query");
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].id, percent.id);

        let filter = ItemFilter {
            query: Some("a_b".to_string()),
            ..ItemFilter::default()
        };
        let found = list_items_with_state(&state, Some(&filter)).expect("underscore query");
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].id, underscore.id);

        // Every note shares the content "body", so a content query reaches all four.
        let filter = ItemFilter {
            query: Some("body".to_string()),
            ..ItemFilter::default()
        };
        let found = list_items_with_state(&state, Some(&filter)).expect("content query");
        assert_eq!(found.len(), 4);

        // The original file name is part of the search.
        let source_path = vault.root.join("quarterly-report.txt");
        fs::write(&source_path, b"data").expect("write source file");
        let file_item =
            import_file_with_state(&state, &source_path.to_string_lossy()).expect("import file");

        let filter = ItemFilter {
            query: Some("quarterly".to_string()),
            ..ItemFilter::default()
        };
        let found = list_items_with_state(&state, Some(&filter)).expect("file name query");
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].id, file_item.id);
    }

    #[test]
    fn list_items_sorts_by_whitelisted_columns() {
        let vault = TempVault::new("list-sort");
        let state = vault.state();

        let beta = save_item_with_state(&state, &note_input("Beta", "b")).expect("save beta");
        let alpha = save_item_with_state(&state, &note_input("Alpha", "a")).expect("save alpha");
        let source = save_item_with_state(&state, &source_input("A source", "https://example.com"))
            .expect("save source");

        {
            let connection = state.require_connection().expect("lock connection");
            let connection = connection.as_ref().expect("connection is initialized");

            for (id, stamp) in [
                (&beta.id, "2020-01-01T00:00:00.000Z"),
                (&alpha.id, "2021-01-01T00:00:00.000Z"),
                (&source.id, "2022-01-01T00:00:00.000Z"),
            ] {
                connection
                    .execute(
                        "UPDATE items
                         SET created_at = ?2, updated_at = ?2
                         WHERE id = ?1",
                        params![id, stamp],
                    )
                    .expect("age item");
            }
        }

        let summaries = list_items_with_state(&state, None).expect("default sort");
        assert_eq!(titles(&summaries), vec!["A source", "Alpha", "Beta"]);

        for (sort, expected) in [
            ("title", vec!["A source", "Alpha", "Beta"]),
            ("created", vec!["A source", "Alpha", "Beta"]),
        ] {
            let filter = ItemFilter {
                sort: Some(sort.to_string()),
                ..ItemFilter::default()
            };
            let summaries = list_items_with_state(&state, Some(&filter)).expect("sorted summaries");
            assert_eq!(titles(&summaries), expected, "sort {sort}");
        }

        let filter = ItemFilter {
            sort: Some("kind".to_string()),
            ..ItemFilter::default()
        };
        let summaries = list_items_with_state(&state, Some(&filter)).expect("kind sort");
        assert_eq!(summaries[0].kind, "note");
        assert_eq!(summaries[1].kind, "note");
        assert_eq!(summaries[2].kind, "source");
    }

    #[test]
    fn trashed_items_leave_lists_and_counts() {
        let vault = TempVault::new("trash-excluded");
        let state = vault.state();
        seed_collection(&state, "col-live", "Live", 0);

        let mut kept_input = note_input("Kept", "body");
        kept_input.collection_id = Some("col-live".to_string());
        let kept = save_item_with_state(&state, &kept_input).expect("save kept");

        let mut trashed_input = note_input("Trashed", "body");
        trashed_input.collection_id = Some("col-live".to_string());
        let trashed = save_item_with_state(&state, &trashed_input).expect("save trashed");

        set_item_tags_with_state(&state, &trashed.id, &["Gone".to_string()]).expect("tag trashed");
        let tag_id = list_tags_with_state(&state).expect("list tags")[0]
            .id
            .clone();

        let collections = list_collections_with_state(&state).expect("counts before trash");
        let live = collections
            .iter()
            .find(|collection| collection.id == "col-live")
            .expect("live collection");
        assert_eq!(live.item_count, 2);

        trash_items_with_state(&state, std::slice::from_ref(&trashed.id)).expect("trash item");

        let summaries = list_items_with_state(&state, None).expect("list after trash");
        assert_eq!(summaries.len(), 1);
        assert_eq!(summaries[0].id, kept.id);

        let collections = list_collections_with_state(&state).expect("counts after trash");
        let live = collections
            .iter()
            .find(|collection| collection.id == "col-live")
            .expect("live collection");
        assert_eq!(live.item_count, 1);

        let tags = list_tags_with_state(&state).expect("tags after trash");
        let tag = tags.iter().find(|tag| tag.id == tag_id).expect("tag");
        assert_eq!(tag.count, 0);

        // The row survives with its deleted_at stamp for the Phase 4 restore.
        let loaded = load_item_with_state(&state, &trashed.id).expect("load trashed item");
        assert!(loaded.deleted_at.is_some());
        assert!(!loaded.is_pinned);
    }

    #[test]
    fn pin_round_trips_through_save_and_toggle() {
        let vault = TempVault::new("pin");
        let state = vault.state();

        let saved = save_item_with_state(&state, &note_input("Pin me", "body")).expect("save note");
        assert!(!saved.is_pinned);

        let pinned = set_item_pinned_with_state(&state, &saved.id, true).expect("pin item");
        assert!(pinned.is_pinned);

        let loaded = load_item_with_state(&state, &saved.id).expect("load pinned");
        assert!(loaded.is_pinned);

        let summaries = list_items_with_state(&state, None).expect("list pinned");
        assert!(summaries[0].is_pinned);

        let mut update = note_input("Pin me", "body");
        update.id = Some(saved.id.clone());
        update.is_pinned = Some(true);
        let updated = save_item_with_state(&state, &update).expect("save with pin");
        assert!(updated.is_pinned);

        let unpinned = set_item_pinned_with_state(&state, &saved.id, false).expect("unpin item");
        assert!(!unpinned.is_pinned);

        let error =
            set_item_pinned_with_state(&state, "missing", true).expect_err("missing item rejected");
        assert_eq!(error, "Item was not found");
    }

    #[test]
    fn batch_favorite_changes_only_listed_items() {
        let vault = TempVault::new("batch-favorite");
        let state = vault.state();

        let first = save_item_with_state(&state, &note_input("First", "body")).expect("save first");
        let second =
            save_item_with_state(&state, &note_input("Second", "body")).expect("save second");
        let third = save_item_with_state(&state, &note_input("Third", "body")).expect("save third");

        set_items_favorite_with_state(&state, &[first.id.clone(), second.id.clone()], true)
            .expect("favorite two");

        let summaries = list_items_with_state(&state, None).expect("list items");
        let favorite_ids: Vec<&str> = summaries
            .iter()
            .filter(|summary| summary.is_favorite)
            .map(|summary| summary.id.as_str())
            .collect();
        assert_eq!(favorite_ids.len(), 2);
        assert!(favorite_ids.contains(&first.id.as_str()));
        assert!(favorite_ids.contains(&second.id.as_str()));
        assert!(!favorite_ids.contains(&third.id.as_str()));

        set_items_favorite_with_state(&state, std::slice::from_ref(&second.id), false)
            .expect("unfavorite one");
        let loaded = load_item_with_state(&state, &second.id).expect("load second");
        assert!(!loaded.is_favorite);
    }

    #[test]
    fn batch_move_assigns_and_clears_collections() {
        let vault = TempVault::new("batch-move");
        let state = vault.state();
        seed_collection(&state, "col-move-a", "Alpha", 0);

        let first = save_item_with_state(&state, &note_input("First", "body")).expect("save first");
        let second =
            save_item_with_state(&state, &note_input("Second", "body")).expect("save second");

        move_items_to_collection_with_state(
            &state,
            &[first.id.clone(), second.id.clone()],
            Some("col-move-a"),
        )
        .expect("move both");

        let loaded = load_item_with_state(&state, &first.id).expect("load first");
        assert_eq!(loaded.collection_id.as_deref(), Some("col-move-a"));

        move_items_to_collection_with_state(&state, std::slice::from_ref(&first.id), None)
            .expect("clear one");
        let loaded = load_item_with_state(&state, &first.id).expect("load cleared");
        assert_eq!(loaded.collection_id, None);

        let still = load_item_with_state(&state, &second.id).expect("load second");
        assert_eq!(still.collection_id.as_deref(), Some("col-move-a"));

        let error = move_items_to_collection_with_state(
            &state,
            std::slice::from_ref(&first.id),
            Some("missing-collection"),
        )
        .expect_err("unknown collection rejected");
        assert_eq!(error, "Collection does not exist");
    }

    #[test]
    fn trash_writes_one_activity_row_per_item() {
        let vault = TempVault::new("trash-activity");
        let state = vault.state();

        let first = save_item_with_state(&state, &note_input("First", "body")).expect("save first");
        let second =
            save_item_with_state(&state, &note_input("Second", "body")).expect("save second");

        trash_items_with_state(&state, &[first.id.clone(), second.id.clone()]).expect("trash both");

        {
            let connection = state.require_connection().expect("lock connection");
            let connection = connection.as_ref().expect("connection is initialized");

            for id in [&first.id, &second.id] {
                let (deleted_at, trashed): (Option<String>, i64) = connection
                    .query_row(
                        "SELECT i.deleted_at,
                                (SELECT COUNT(*) FROM activity a
                                 WHERE a.item_id = i.id AND a.action = 'trashed')
                         FROM items i
                         WHERE i.id = ?1",
                        params![id],
                        |row| Ok((row.get(0)?, row.get(1)?)),
                    )
                    .expect("read trashed state");

                assert!(deleted_at.is_some());
                assert_eq!(trashed, 1);
            }
        }

        // Trashing an already-trashed item does not add a second activity row.
        trash_items_with_state(&state, std::slice::from_ref(&first.id)).expect("trash again");

        {
            let connection = state.require_connection().expect("lock connection");
            let trashed: i64 = connection
                .as_ref()
                .expect("connection is initialized")
                .query_row(
                    "SELECT COUNT(*) FROM activity
                     WHERE item_id = ?1 AND action = 'trashed'",
                    params![first.id],
                    |row| row.get(0),
                )
                .expect("count trash activity");
            assert_eq!(trashed, 1);
        }
    }

    #[test]
    fn collections_carry_icon_and_live_item_count() {
        let vault = TempVault::new("collection-icon");
        let state = vault.state();

        let created = save_collection_with_state(
            &state,
            &CollectionInput {
                id: None,
                name: "  Projects  ".to_string(),
                icon: Some("  folder  ".to_string()),
                protection: None,
                secret: None,
            },
        )
        .expect("create collection");

        assert_eq!(created.name, "Projects");
        assert_eq!(created.icon.as_deref(), Some("folder"));
        assert_eq!(created.item_count, 0);

        let mut input = note_input("In project", "body");
        input.collection_id = Some(created.id.clone());
        let item = save_item_with_state(&state, &input).expect("save item in collection");

        let collections = list_collections_with_state(&state).expect("list collections");
        let stored = collections
            .iter()
            .find(|collection| collection.id == created.id)
            .expect("stored collection");
        assert_eq!(stored.item_count, 1);
        assert_eq!(stored.icon.as_deref(), Some("folder"));

        trash_items_with_state(&state, std::slice::from_ref(&item.id)).expect("trash item");
        let collections = list_collections_with_state(&state).expect("list after trash");
        let stored = collections
            .iter()
            .find(|collection| collection.id == created.id)
            .expect("stored collection");
        assert_eq!(stored.item_count, 0);
    }

    #[test]
    fn save_collection_validates_and_renames() {
        let vault = TempVault::new("save-collection");
        let state = vault.state();

        let created = save_collection_with_state(
            &state,
            &CollectionInput {
                id: None,
                name: "Projects".to_string(),
                icon: None,
                protection: None,
                secret: None,
            },
        )
        .expect("create collection");
        assert_eq!(created.sort_order, 0);

        let second = save_collection_with_state(
            &state,
            &CollectionInput {
                id: None,
                name: "Archive".to_string(),
                icon: None,
                protection: None,
                secret: None,
            },
        )
        .expect("create second collection");
        assert_eq!(second.sort_order, 1);

        let error = save_collection_with_state(
            &state,
            &CollectionInput {
                id: None,
                name: "   ".to_string(),
                icon: None,
                protection: None,
                secret: None,
            },
        )
        .expect_err("blank name rejected");
        assert_eq!(error, "Collection name is required");

        let error = save_collection_with_state(
            &state,
            &CollectionInput {
                id: None,
                name: "  projects  ".to_string(),
                icon: None,
                protection: None,
                secret: None,
            },
        )
        .expect_err("duplicate name rejected");
        assert_eq!(error, "A collection with that name already exists");

        // Renaming a collection to its own name stays valid.
        let same = save_collection_with_state(
            &state,
            &CollectionInput {
                id: Some(created.id.clone()),
                name: "Projects".to_string(),
                icon: None,
                protection: None,
                secret: None,
            },
        )
        .expect("same name rename");
        assert_eq!(same.name, "Projects");

        let renamed = save_collection_with_state(
            &state,
            &CollectionInput {
                id: Some(created.id.clone()),
                name: "Projects renamed".to_string(),
                icon: Some("star".to_string()),
                protection: None,
                secret: None,
            },
        )
        .expect("rename collection");
        assert_eq!(renamed.name, "Projects renamed");
        assert_eq!(renamed.icon.as_deref(), Some("star"));

        let error = save_collection_with_state(
            &state,
            &CollectionInput {
                id: Some(created.id.clone()),
                name: "archive".to_string(),
                icon: None,
                protection: None,
                secret: None,
            },
        )
        .expect_err("duplicate rename rejected");
        assert_eq!(error, "A collection with that name already exists");

        let error = save_collection_with_state(
            &state,
            &CollectionInput {
                id: Some("missing".to_string()),
                name: "Ghost".to_string(),
                icon: None,
                protection: None,
                secret: None,
            },
        )
        .expect_err("missing collection rejected");
        assert_eq!(error, "Collection was not found");
    }

    #[test]
    fn delete_collection_keeps_its_items() {
        let vault = TempVault::new("delete-collection");
        let state = vault.state();

        let collection = save_collection_with_state(
            &state,
            &CollectionInput {
                id: None,
                name: "Temporary".to_string(),
                icon: None,
                protection: None,
                secret: None,
            },
        )
        .expect("create collection");

        let mut input = note_input("Kept", "body");
        input.collection_id = Some(collection.id.clone());
        let item = save_item_with_state(&state, &input).expect("save item");

        delete_collection_with_state(&state, &collection.id).expect("delete collection");

        let loaded = load_item_with_state(&state, &item.id).expect("load item after delete");
        assert_eq!(loaded.collection_id, None);
        assert_eq!(loaded.title, "Kept");

        let collections = list_collections_with_state(&state).expect("list collections");
        assert!(collections.is_empty());

        let error = delete_collection_with_state(&state, &collection.id)
            .expect_err("missing collection rejected");
        assert_eq!(error, "Collection was not found");
    }

    #[test]
    fn list_tags_counts_live_items() {
        let vault = TempVault::new("tag-counts");
        let state = vault.state();

        let first = save_item_with_state(&state, &note_input("First", "body")).expect("save first");
        let second =
            save_item_with_state(&state, &note_input("Second", "body")).expect("save second");

        set_item_tags_with_state(&state, &first.id, &["Work".to_string()]).expect("tag first");
        set_item_tags_with_state(&state, &second.id, &["Work".to_string()]).expect("tag second");

        let tags = list_tags_with_state(&state).expect("list tags");
        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].name, "Work");
        assert_eq!(tags[0].count, 2);

        trash_items_with_state(&state, std::slice::from_ref(&first.id)).expect("trash first");
        let tags = list_tags_with_state(&state).expect("list tags after trash");
        assert_eq!(tags[0].count, 1);
    }

    #[test]
    fn save_tag_validates_and_renames() {
        let vault = TempVault::new("save-tag");
        let state = vault.state();

        let created = save_tag_with_state(
            &state,
            &TagInput {
                id: None,
                name: "  Work  ".to_string(),
            },
        )
        .expect("create tag");
        assert_eq!(created.name, "Work");
        assert_eq!(created.count, 0);

        let error = save_tag_with_state(
            &state,
            &TagInput {
                id: None,
                name: "   ".to_string(),
            },
        )
        .expect_err("blank name rejected");
        assert_eq!(error, "Tag name is required");

        let error = save_tag_with_state(
            &state,
            &TagInput {
                id: None,
                name: "work".to_string(),
            },
        )
        .expect_err("duplicate name rejected");
        assert_eq!(error, "A tag with that name already exists");

        // Renaming a tag to its own spelling stays valid.
        let same = save_tag_with_state(
            &state,
            &TagInput {
                id: Some(created.id.clone()),
                name: "Work".to_string(),
            },
        )
        .expect("same name rename");
        assert_eq!(same.name, "Work");

        let renamed = save_tag_with_state(
            &state,
            &TagInput {
                id: Some(created.id.clone()),
                name: "Personal".to_string(),
            },
        )
        .expect("rename tag");
        assert_eq!(renamed.name, "Personal");

        let other = save_tag_with_state(
            &state,
            &TagInput {
                id: None,
                name: "Home".to_string(),
            },
        )
        .expect("create other tag");

        let error = save_tag_with_state(
            &state,
            &TagInput {
                id: Some(other.id.clone()),
                name: "personal".to_string(),
            },
        )
        .expect_err("duplicate rename rejected");
        assert_eq!(error, "A tag with that name already exists");

        let error = save_tag_with_state(
            &state,
            &TagInput {
                id: Some("missing".to_string()),
                name: "Ghost".to_string(),
            },
        )
        .expect_err("missing tag rejected");
        assert_eq!(error, "Tag was not found");
    }

    #[test]
    fn delete_tag_keeps_its_items() {
        let vault = TempVault::new("delete-tag");
        let state = vault.state();

        let item = save_item_with_state(&state, &note_input("Kept", "body")).expect("save item");
        set_item_tags_with_state(&state, &item.id, &["Work".to_string()]).expect("tag item");

        let tag = list_tags_with_state(&state).expect("list tags")[0].clone();

        delete_tag_with_state(&state, &tag.id).expect("delete tag");

        let loaded = load_item_with_state(&state, &item.id).expect("load item after delete");
        assert_eq!(loaded.title, "Kept");
        assert!(loaded.tags.is_empty());

        {
            let connection = state.require_connection().expect("lock connection");
            let links: i64 = connection
                .as_ref()
                .expect("connection is initialized")
                .query_row(
                    "SELECT COUNT(*) FROM item_tags WHERE tag_id = ?1",
                    params![tag.id],
                    |row| row.get(0),
                )
                .expect("count tag links");
            assert_eq!(links, 0);
        }

        let error = delete_tag_with_state(&state, &tag.id).expect_err("missing tag rejected");
        assert_eq!(error, "Tag was not found");
    }

    #[test]
    fn file_items_update_metadata_but_are_never_created_through_save() {
        let vault = TempVault::new("file-save");
        let state = vault.state();
        seed_collection(&state, "col-files", "Files", 0);

        let source = vault.root.join("report.txt");
        fs::write(&source, b"hello").expect("write source file");
        let item = import_file_with_state(&state, &source.to_string_lossy()).expect("import file");

        let updated = save_item_with_state(
            &state,
            &ItemInput {
                id: Some(item.id.clone()),
                kind: "file".to_string(),
                title: "Renamed report".to_string(),
                description: "updated metadata".to_string(),
                content: Some("must not be stored".to_string()),
                url: Some("https://example.com/must-not-be-stored".to_string()),
                collection_id: Some("col-files".to_string()),
                is_favorite: Some(true),
                is_pinned: Some(true),
            },
        )
        .expect("update file metadata");

        assert_eq!(updated.kind, "file");
        assert_eq!(updated.title, "Renamed report");
        assert_eq!(updated.description, "updated metadata");
        assert_eq!(updated.collection_id.as_deref(), Some("col-files"));
        assert!(updated.is_favorite);
        assert!(updated.is_pinned);
        assert_eq!(updated.content, None, "file content stays empty");
        assert_eq!(updated.url, None, "file url stays empty");
        assert_eq!(
            updated
                .file
                .as_ref()
                .map(|file| file.original_name.as_str()),
            Some("report.txt")
        );

        let error = save_item_with_state(
            &state,
            &ItemInput {
                id: None,
                kind: "file".to_string(),
                title: "New file".to_string(),
                description: String::new(),
                content: None,
                url: None,
                collection_id: None,
                is_favorite: None,
                is_pinned: None,
            },
        )
        .expect_err("file creation rejected");
        assert_eq!(error, "File items are created by import");
    }

    #[test]
    fn trashed_filter_returns_only_trashed_rows_newest_deleted_first() {
        let vault = TempVault::new("trashed-filter");
        let state = vault.state();

        let keep = save_item_with_state(&state, &note_input("Keep", "body")).expect("save keep");
        let old = save_item_with_state(&state, &note_input("Old", "body")).expect("save old");
        let new = save_item_with_state(&state, &note_input("New", "body")).expect("save new");

        trash_items_with_state(&state, &[old.id.clone(), new.id.clone()]).expect("trash two");

        {
            let connection = state.require_connection().expect("lock connection");
            let connection = connection.as_ref().expect("connection is initialized");

            for (id, stamp) in [
                (&old.id, "2020-01-01T00:00:00.000Z"),
                (&new.id, "2021-01-01T00:00:00.000Z"),
            ] {
                connection
                    .execute(
                        "UPDATE items SET deleted_at = ?2 WHERE id = ?1",
                        params![id, stamp],
                    )
                    .expect("stamp deleted_at");
            }
        }

        let filter = ItemFilter {
            trashed: Some(true),
            ..ItemFilter::default()
        };
        let trashed = list_items_with_state(&state, Some(&filter)).expect("list trashed");
        assert_eq!(titles(&trashed), vec!["New", "Old"]);
        assert!(trashed.iter().all(|summary| summary.deleted_at.is_some()));
        assert!(!trashed.iter().any(|summary| summary.id == keep.id));

        // A sort value never overrides the deletion order for a trashed listing.
        let filter = ItemFilter {
            trashed: Some(true),
            sort: Some("title".to_string()),
            ..ItemFilter::default()
        };
        let sorted = list_items_with_state(&state, Some(&filter)).expect("trashed with sort");
        assert_eq!(titles(&sorted), vec!["New", "Old"]);

        let live = list_items_with_state(&state, None).expect("list live");
        assert_eq!(titles(&live), vec!["Keep"]);
        assert!(live[0].deleted_at.is_none());
    }

    #[test]
    fn restore_clears_deleted_at_and_writes_one_activity_row() {
        let vault = TempVault::new("restore");
        let state = vault.state();

        let item = save_item_with_state(&state, &note_input("Restore me", "body")).expect("save");
        trash_items_with_state(&state, std::slice::from_ref(&item.id)).expect("trash");

        restore_items_with_state(&state, std::slice::from_ref(&item.id)).expect("restore");
        let loaded = load_item_with_state(&state, &item.id).expect("load restored");
        assert!(loaded.deleted_at.is_none());

        // A live item and an empty list never add another restored row.
        restore_items_with_state(&state, std::slice::from_ref(&item.id)).expect("restore again");
        restore_items_with_state(&state, &[]).expect("restore nothing");

        let connection = state.require_connection().expect("lock connection");
        let restored: i64 = connection
            .as_ref()
            .expect("connection is initialized")
            .query_row(
                "SELECT COUNT(*) FROM activity WHERE item_id = ?1 AND action = 'restored'",
                params![item.id],
                |row| row.get(0),
            )
            .expect("count restored activity");
        assert_eq!(restored, 1);
    }

    #[test]
    fn delete_items_permanently_removes_trashed_rows_and_bytes_only() {
        let vault = TempVault::new("permanent-delete");
        let state = vault.state();

        let doomed_source = vault.root.join("doomed.txt");
        fs::write(&doomed_source, b"doomed bytes").expect("write doomed source");
        let doomed = import_file_with_state(&state, &doomed_source.to_string_lossy())
            .expect("import doomed");
        let doomed_name = stored_name(&state, &doomed.id);

        let kept_source = vault.root.join("kept.txt");
        fs::write(&kept_source, b"kept bytes").expect("write kept source");
        let kept =
            import_file_with_state(&state, &kept_source.to_string_lossy()).expect("import kept");
        let kept_name = stored_name(&state, &kept.id);

        let note = save_item_with_state(&state, &note_input("Note", "body")).expect("save note");

        trash_items_with_state(&state, &[doomed.id.clone(), note.id.clone()]).expect("trash two");

        delete_items_permanently_with_state(
            &state,
            &[doomed.id.clone(), note.id.clone(), kept.id.clone()],
        )
        .expect("delete permanently");

        assert!(!state.files_dir().join(&doomed_name).exists());
        assert!(state.files_dir().join(&kept_name).is_file());

        {
            let connection = state.require_connection().expect("lock connection");
            let connection = connection.as_ref().expect("connection is initialized");

            let rows = |id: &str| -> i64 {
                connection
                    .query_row(
                        "SELECT COUNT(*) FROM items WHERE id = ?1",
                        params![id],
                        |row| row.get(0),
                    )
                    .expect("count items")
            };

            assert_eq!(rows(&doomed.id), 0);
            assert_eq!(rows(&note.id), 0);
            assert_eq!(rows(&kept.id), 1, "a live id is ignored");

            let file_rows: i64 = connection
                .query_row(
                    "SELECT COUNT(*) FROM files WHERE item_id = ?1",
                    params![doomed.id],
                    |row| row.get(0),
                )
                .expect("count file rows");
            assert_eq!(file_rows, 0, "the file row cascades with the item");
        }

        delete_items_permanently_with_state(&state, &[]).expect("delete nothing");
    }

    #[test]
    fn mark_item_opened_writes_for_live_items_only() {
        let vault = TempVault::new("mark-opened");
        let state = vault.state();

        let live = save_item_with_state(&state, &note_input("Live", "body")).expect("save live");
        let gone = save_item_with_state(&state, &note_input("Gone", "body")).expect("save gone");
        trash_items_with_state(&state, std::slice::from_ref(&gone.id)).expect("trash gone");

        mark_item_opened_with_state(&state, &live.id).expect("mark live");
        mark_item_opened_with_state(&state, &gone.id).expect("mark trashed");
        mark_item_opened_with_state(&state, "missing").expect("mark missing");

        let connection = state.require_connection().expect("lock connection");
        let connection = connection.as_ref().expect("connection is initialized");

        let opened = |id: &str| -> i64 {
            connection
                .query_row(
                    "SELECT COUNT(*) FROM activity WHERE item_id = ?1 AND action = 'opened'",
                    params![id],
                    |row| row.get(0),
                )
                .expect("count opened activity")
        };

        assert_eq!(opened(&live.id), 1);
        assert_eq!(opened(&gone.id), 0);
        assert_eq!(opened("missing"), 0);
    }

    #[test]
    fn list_recent_items_groups_live_items_only() {
        let vault = TempVault::new("recent-items");
        let state = vault.state();

        let opened =
            save_item_with_state(&state, &note_input("Opened", "body")).expect("save opened");
        let updated =
            save_item_with_state(&state, &note_input("Updated", "body")).expect("save updated");
        let created =
            save_item_with_state(&state, &note_input("Created", "body")).expect("save created");
        let trashed =
            save_item_with_state(&state, &note_input("Trashed", "body")).expect("save trashed");

        let mut change = note_input("Updated", "changed body");
        change.id = Some(updated.id.clone());
        save_item_with_state(&state, &change).expect("update item");
        mark_item_opened_with_state(&state, &opened.id).expect("mark opened");

        trash_items_with_state(&state, std::slice::from_ref(&trashed.id)).expect("trash item");

        let recent = list_recent_items_with_state(&state).expect("list recent");

        let ids = |group: &[ItemSummary]| -> Vec<String> {
            group.iter().map(|summary| summary.id.clone()).collect()
        };

        let opened_ids = ids(&recent.opened);
        assert!(opened_ids.contains(&opened.id));
        assert!(!opened_ids.contains(&updated.id));

        let modified_ids = ids(&recent.modified);
        assert!(modified_ids.contains(&updated.id));
        assert!(!modified_ids.contains(&opened.id));

        let created_ids = ids(&recent.created);
        assert!(created_ids.contains(&opened.id));
        assert!(created_ids.contains(&updated.id));
        assert!(created_ids.contains(&created.id));
        assert!(!created_ids.contains(&trashed.id));

        for group in [&recent.opened, &recent.modified, &recent.created] {
            assert!(group.iter().all(|summary| summary.id != trashed.id));
        }
    }

    #[test]
    fn search_matches_tag_names_and_collection_names() {
        let vault = TempVault::new("search-names");
        let state = vault.state();
        seed_collection(&state, "col-recipes", "Recipes", 0);

        let mut in_collection = note_input("Plain title", "body");
        in_collection.collection_id = Some("col-recipes".to_string());
        let collection_item =
            save_item_with_state(&state, &in_collection).expect("save collection item");

        let tagged = save_item_with_state(&state, &note_input("Another title", "body"))
            .expect("save tagged");
        set_item_tags_with_state(&state, &tagged.id, &["Gardening".to_string()]).expect("set tag");

        let filter = ItemFilter {
            query: Some("Recipes".to_string()),
            ..ItemFilter::default()
        };
        let by_collection = list_items_with_state(&state, Some(&filter)).expect("collection query");
        assert_eq!(by_collection.len(), 1);
        assert_eq!(by_collection[0].id, collection_item.id);

        let filter = ItemFilter {
            query: Some("Gardening".to_string()),
            ..ItemFilter::default()
        };
        let by_tag = list_items_with_state(&state, Some(&filter)).expect("tag query");
        assert_eq!(by_tag.len(), 1);
        assert_eq!(by_tag[0].id, tagged.id);
    }

    #[test]
    fn load_vault_summary_counts_and_sizes_known_rows() {
        let vault = TempVault::new("vault-summary");
        let state = vault.state();
        seed_collection(&state, "col-sum", "Summary", 0);

        let mut favorite = note_input("Favorite note", "body");
        favorite.is_favorite = Some(true);
        save_item_with_state(&state, &favorite).expect("save favorite note");

        let source = save_item_with_state(&state, &source_input("Site", "https://example.com"))
            .expect("save source");

        let first_source = vault.root.join("first.bin");
        fs::write(&first_source, b"12345").expect("write first file");
        let _first_file =
            import_file_with_state(&state, &first_source.to_string_lossy()).expect("import first");

        let second_source = vault.root.join("second.bin");
        fs::write(&second_source, b"1234567890").expect("write second file");
        let second_file = import_file_with_state(&state, &second_source.to_string_lossy())
            .expect("import second");

        set_item_tags_with_state(&state, &source.id, &["News".to_string()]).expect("tag source");

        // Trash one source and one file so live counts and disk bytes diverge.
        trash_items_with_state(&state, &[source.id.clone(), second_file.id.clone()])
            .expect("trash two");

        let summary = load_vault_summary_with_state(&state).expect("load summary");

        assert_eq!(summary.collection_count, 1);
        assert_eq!(summary.tag_count, 1);
        assert_eq!(summary.trash_count, 2);
        assert_eq!(
            summary.item_count, 2,
            "the favorite note and first file stay live"
        );
        assert_eq!(summary.note_count, 1);
        assert_eq!(summary.source_count, 0, "the only source is trashed");
        assert_eq!(summary.file_count, 1, "the only live file remains");
        assert_eq!(summary.favorite_count, 1);
        assert_eq!(
            summary.file_bytes, 15,
            "trashed file bytes still occupy disk"
        );
        assert!(summary.database_bytes > 0);
    }

    fn collection_input(name: &str) -> CollectionInput {
        CollectionInput {
            id: None,
            name: name.to_string(),
            icon: None,
            protection: None,
            secret: None,
        }
    }

    #[test]
    fn created_collection_with_a_password_stores_a_hash_and_never_returns_it() {
        let vault = TempVault::new("collection-password");
        let state = vault.state();

        let mut input = collection_input("Private");
        input.protection = Some("password".to_string());
        input.secret = Some("hunter2".to_string());
        let created = save_collection_with_state(&state, &input).expect("create protected");

        assert_eq!(created.protection, "password");

        let stored_hash: Option<String> = {
            let connection = state.require_connection().expect("lock connection");
            connection
                .as_ref()
                .expect("connection is initialized")
                .query_row(
                    "SELECT secret_hash FROM collections WHERE id = ?1",
                    params![created.id],
                    |row| row.get(0),
                )
                .expect("read hash")
        };
        let stored_hash = stored_hash.expect("hash stored");
        assert!(stored_hash.starts_with("$argon2id$"));
        assert_ne!(stored_hash, "hunter2");
        assert!(!stored_hash.contains("hunter2"));

        // The serialized collection carries the level only; the hash never leaves
        // the vault in a listing.
        let collections = list_collections_with_state(&state).expect("list collections");
        let json = serde_json::to_string(&collections).expect("serialize collections");
        assert!(!json.contains(&stored_hash));
        assert!(!json.contains("hunter2"));
        assert!(json.contains("password"));
    }

    #[test]
    fn verify_collection_secret_accepts_the_right_secret_only() {
        let vault = TempVault::new("collection-verify");
        let state = vault.state();

        let mut input = collection_input("Locked");
        input.protection = Some("pin".to_string());
        input.secret = Some("1234".to_string());
        let locked = save_collection_with_state(&state, &input).expect("create locked");

        assert!(verify_collection_secret_with_state(&state, &locked.id, "1234").expect("verify"));
        assert!(!verify_collection_secret_with_state(&state, &locked.id, "9999").expect("verify"));

        let open =
            save_collection_with_state(&state, &collection_input("Open")).expect("create open");
        assert!(!verify_collection_secret_with_state(&state, &open.id, "1234").expect("verify"));
        assert!(!verify_collection_secret_with_state(&state, "missing", "1234").expect("verify"));
    }

    #[test]
    fn rename_without_protection_keeps_the_stored_hash() {
        let vault = TempVault::new("collection-keep-hash");
        let state = vault.state();

        let mut input = collection_input("Kept");
        input.protection = Some("password".to_string());
        input.secret = Some("secret-pass".to_string());
        let created = save_collection_with_state(&state, &input).expect("create protected");

        let renamed = save_collection_with_state(
            &state,
            &CollectionInput {
                id: Some(created.id.clone()),
                name: "Kept renamed".to_string(),
                icon: None,
                protection: None,
                secret: None,
            },
        )
        .expect("rename");

        assert_eq!(renamed.name, "Kept renamed");
        assert_eq!(renamed.protection, "password");
        assert!(
            verify_collection_secret_with_state(&state, &created.id, "secret-pass").expect("verify")
        );
    }

    #[test]
    fn clearing_protection_removes_the_hash() {
        let vault = TempVault::new("collection-clear");
        let state = vault.state();

        let mut input = collection_input("Clear me");
        input.protection = Some("password".to_string());
        input.secret = Some("secret-pass".to_string());
        let created = save_collection_with_state(&state, &input).expect("create protected");

        let cleared = save_collection_with_state(
            &state,
            &CollectionInput {
                id: Some(created.id.clone()),
                name: "Clear me".to_string(),
                icon: None,
                protection: Some("none".to_string()),
                secret: None,
            },
        )
        .expect("clear protection");

        assert_eq!(cleared.protection, "none");

        {
            let connection = state.require_connection().expect("lock connection");
            let hash: Option<String> = connection
                .as_ref()
                .expect("connection is initialized")
                .query_row(
                    "SELECT secret_hash FROM collections WHERE id = ?1",
                    params![created.id],
                    |row| row.get(0),
                )
                .expect("read hash");
            assert_eq!(hash, None);
        }

        assert!(
            !verify_collection_secret_with_state(&state, &created.id, "secret-pass")
                .expect("verify")
        );
    }

    #[test]
    fn protection_validation_messages_are_stable() {
        let vault = TempVault::new("collection-protection-validation");
        let state = vault.state();

        let mut unknown = collection_input("Odd");
        unknown.protection = Some("biometric".to_string());
        let error = save_collection_with_state(&state, &unknown).expect_err("unknown rejected");
        assert_eq!(error, "Collection protection is not supported");

        let mut short = collection_input("Short");
        short.protection = Some("password".to_string());
        short.secret = Some("abc".to_string());
        let error = save_collection_with_state(&state, &short).expect_err("short password");
        assert_eq!(error, "Password must be at least 4 characters");

        for bad_pin in ["123", "12345", "12a4", ""] {
            let mut bad = collection_input("Bad pin");
            bad.name = format!("Bad pin {bad_pin}");
            bad.protection = Some("pin".to_string());
            bad.secret = Some(bad_pin.to_string());
            let error = save_collection_with_state(&state, &bad).expect_err("bad pin rejected");
            assert_eq!(error, "PIN must be 4 digits");
        }

        // Nothing is written when validation fails.
        let collections = list_collections_with_state(&state).expect("list collections");
        assert!(collections.is_empty());
    }
}
