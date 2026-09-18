use std::fs;
use std::path::{Path, PathBuf};

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

use crate::database::DatabaseState;

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
    pub file: Option<FileDetails>,
    pub file_missing: bool,
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
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionInput {
    pub id: Option<String>,
    pub name: String,
    pub icon: Option<String>,
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

fn read_item_summaries(
    connection: &Connection,
    files_dir: &Path,
    filter: Option<&ItemFilter>,
) -> rusqlite::Result<Vec<ItemSummary>> {
    let mut sql = String::from(
        "SELECT i.id, i.kind, i.title, i.is_favorite, i.is_pinned, i.collection_id,
                i.updated_at, f.stored_name, f.original_name, f.byte_size, f.imported_at
         FROM items i
         LEFT JOIN files f ON f.item_id = i.id
         WHERE i.deleted_at IS NULL",
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
                    OR f.original_name LIKE ? ESCAPE '\\')",
            );

            for _ in 0..5 {
                values.push(rusqlite::types::Value::Text(pattern.clone()));
            }
        }
    }

    let order = match filter.and_then(|filter| filter.sort.as_deref()) {
        Some("title") => "i.title COLLATE NOCASE ASC, i.updated_at DESC",
        Some("created") => "i.created_at DESC, i.updated_at DESC",
        Some("kind") => "i.kind ASC, i.updated_at DESC",
        _ => "i.updated_at DESC, i.title COLLATE NOCASE ASC",
    };

    sql.push_str(" ORDER BY ");
    sql.push_str(order);

    let mut statement = connection.prepare(&sql)?;

    let rows = statement.query_map(rusqlite::params_from_iter(values.iter()), |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, i64>(3)? != 0,
            row.get::<_, i64>(4)? != 0,
            row.get::<_, Option<String>>(5)?,
            row.get::<_, String>(6)?,
            row.get::<_, Option<String>>(7)?,
            row.get::<_, Option<String>>(8)?,
            row.get::<_, Option<i64>>(9)?,
            row.get::<_, Option<String>>(10)?,
        ))
    })?;

    let mut summaries = Vec::new();

    for row in rows {
        let (
            id,
            kind,
            title,
            is_favorite,
            is_pinned,
            collection_id,
            updated_at,
            stored_name,
            original_name,
            byte_size,
            imported_at,
        ) = row?;

        let file_missing = kind == "file"
            && stored_name
                .as_deref()
                .map(|name| !files_dir.join(name).is_file())
                .unwrap_or(false);

        let file = match (original_name, byte_size, imported_at) {
            (Some(original_name), Some(byte_size), Some(imported_at)) => Some(FileDetails {
                original_name,
                byte_size,
                imported_at,
            }),
            _ => None,
        };

        summaries.push(ItemSummary {
            id,
            kind,
            title,
            is_favorite,
            is_pinned,
            collection_id,
            updated_at,
            file,
            file_missing,
        });
    }

    Ok(summaries)
}

const COLLECTION_SELECT: &str = "SELECT c.id, c.name, c.sort_order, c.created_at, c.icon,
            (SELECT COUNT(*) FROM items i
             WHERE i.collection_id = c.id AND i.deleted_at IS NULL)
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

            transaction
                .execute(
                    "UPDATE collections SET name = ?1, icon = ?2 WHERE id = ?3",
                    params![name, icon, id],
                )
                .map_err(|error| format!("Could not save the collection: {error}"))?;

            id.clone()
        }
        None => {
            if duplicate.is_some() {
                return Err("A collection with that name already exists".to_string());
            }

            let id = new_id(&transaction)
                .map_err(|error| format!("Could not save the collection: {error}"))?;

            transaction
                .execute(
                    "INSERT INTO collections (id, name, sort_order, created_at, icon)
                     VALUES (?1, ?2,
                             (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM collections),
                             strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), ?3)",
                    params![id, name, icon],
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
pub fn open_item_file(
    id: String,
    app: AppHandle,
    state: State<'_, DatabaseState>,
) -> Result<(), String> {
    let path = managed_file_path_with_state(state.inner(), &id)?;

    app.opener()
        .open_path(path.to_string_lossy().to_string(), None::<&str>)
        .map_err(|error| format!("Could not open the file: {error}"))
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
        .map_err(|error| format!("Could not open the address: {error}"))
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
}
