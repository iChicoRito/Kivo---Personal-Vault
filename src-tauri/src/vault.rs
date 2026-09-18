use std::fs;
use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::State;

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
    pub collection_id: Option<String>,
    pub updated_at: String,
    pub file_missing: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub sort_order: i64,
    pub created_at: String,
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
                    i.collection_id, i.is_favorite, i.created_at, i.updated_at,
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
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                    original_name: row.get(10)?,
                    byte_size: row.get(11)?,
                    imported_at: row.get(12)?,
                    stored_name: row.get(13)?,
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
) -> rusqlite::Result<Vec<ItemSummary>> {
    let mut statement = connection.prepare(
        "SELECT i.id, i.kind, i.title, i.is_favorite, i.collection_id, i.updated_at,
                f.stored_name
         FROM items i
         LEFT JOIN files f ON f.item_id = i.id
         ORDER BY i.updated_at DESC, i.title COLLATE NOCASE ASC",
    )?;

    let rows = statement.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, i64>(3)? != 0,
            row.get::<_, Option<String>>(4)?,
            row.get::<_, String>(5)?,
            row.get::<_, Option<String>>(6)?,
        ))
    })?;

    let mut summaries = Vec::new();

    for row in rows {
        let (id, kind, title, is_favorite, collection_id, updated_at, stored_name) = row?;

        let file_missing = kind == "file"
            && stored_name
                .as_deref()
                .map(|name| !files_dir.join(name).is_file())
                .unwrap_or(false);

        summaries.push(ItemSummary {
            id,
            kind,
            title,
            is_favorite,
            collection_id,
            updated_at,
            file_missing,
        });
    }

    Ok(summaries)
}

fn read_collections(connection: &Connection) -> rusqlite::Result<Vec<Collection>> {
    let mut statement = connection.prepare(
        "SELECT id, name, sort_order, created_at
         FROM collections
         ORDER BY sort_order ASC, name COLLATE NOCASE ASC",
    )?;

    let collections = statement
        .query_map([], |row| {
            Ok(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                sort_order: row.get(2)?,
                created_at: row.get(3)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<Collection>>>()?;

    Ok(collections)
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

    let (id, kind) = match &input.id {
        Some(id) => {
            let stored_kind: Option<String> = connection
                .query_row("SELECT kind FROM items WHERE id = ?1", params![id], |row| {
                    row.get(0)
                })
                .optional()
                .map_err(|error| format!("Could not save the item: {error}"))?;

            let stored_kind = stored_kind.ok_or_else(|| "Item was not found".to_string())?;

            if input.kind != stored_kind {
                return Err("Item type cannot change".to_string());
            }

            (id.clone(), stored_kind)
        }
        None => {
            match input.kind.as_str() {
                "note" | "source" => {}
                "file" => return Err("File items are created by import".to_string()),
                _ => return Err("Items must be notes, sources, or files".to_string()),
            }

            let id =
                new_id(connection).map_err(|error| format!("Could not save the item: {error}"))?;

            (id, input.kind.clone())
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

            (None, Some(url.to_string()))
        }
        _ => (None, None),
    };

    let description = input.description.clone();
    let is_favorite = i64::from(input.is_favorite.unwrap_or(false));
    let action = if is_update { "updated" } else { "created" };

    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not save the item: {error}"))?;

    if is_update {
        transaction
            .execute(
                "UPDATE items
                 SET title = ?1, description = ?2, content = ?3, url = ?4,
                     collection_id = ?5, is_favorite = ?6,
                     updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                 WHERE id = ?7",
                params![
                    title,
                    description,
                    content,
                    url,
                    collection_id,
                    is_favorite,
                    id
                ],
            )
            .map_err(|error| format!("Could not save the item: {error}"))?;
    } else {
        transaction
            .execute(
                "INSERT INTO items
                   (id, kind, title, description, content, url, collection_id, is_favorite,
                    created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8,
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
                    is_favorite
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

fn list_items_with_state(state: &DatabaseState) -> Result<Vec<ItemSummary>, String> {
    let connection = state.require_connection()?;

    read_item_summaries(
        connection.as_ref().expect("checked above"),
        state.files_dir(),
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
pub fn list_items(state: State<'_, DatabaseState>) -> Result<Vec<ItemSummary>, String> {
    list_items_with_state(state.inner())
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

        let summaries = list_items_with_state(&state).expect("list after delete");
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

        let summaries = list_items_with_state(&state).expect("list items");
        assert_eq!(summaries.len(), 2);
        assert_eq!(summaries[0].id, newer.id);
        assert_eq!(summaries[1].id, older.id);
        assert_eq!(summaries[0].kind, "note");
        assert_eq!(summaries[0].title, "Newer");
        assert!(!summaries[0].is_favorite);
        assert_eq!(summaries[0].collection_id, None);
        assert_eq!(summaries[0].updated_at, "2021-01-01T00:00:00.000Z");
        assert!(!summaries[0].file_missing);
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
}
